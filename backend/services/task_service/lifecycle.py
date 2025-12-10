"""Task lifecycle management (state transitions)."""
from typing import Optional, Dict, Any, List, TYPE_CHECKING
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from datetime import datetime, timedelta, timezone

from backend.models.task import Task, TaskStatus, TaskPauseRecord
from backend.utils.datetime_utils import utcnow
from backend.utils.validators import validate_object_id

if TYPE_CHECKING:
    from .virtual_materialization import VirtualTaskMaterializer
    from .session import TaskSession
    from .crud import TaskCRUD


class TaskLifecycle:
    """Manages task lifecycle state transitions."""

    def __init__(self, db: AsyncIOMotorDatabase):
        """Initialize lifecycle component.

        Args:
            db: MongoDB database instance
        """
        self.db = db
        self.tasks_collection = db.tasks
        # Dependencies injected later
        self.virtualizer: Optional['VirtualTaskMaterializer'] = None
        self.session: Optional['TaskSession'] = None
        self.crud: Optional['TaskCRUD'] = None

    def set_dependencies(self, virtualizer: 'VirtualTaskMaterializer', session: 'TaskSession', crud: 'TaskCRUD') -> None:
        """Inject dependencies after initialization.

        Args:
            virtualizer: VirtualTaskMaterializer instance
            session: TaskSession instance
            crud: TaskCRUD instance
        """
        self.virtualizer = virtualizer
        self.session = session
        self.crud = crud

    def _ensure_dependencies(self) -> None:
        """Ensure dependencies are set.

        Raises:
            RuntimeError: If dependencies not set
        """
        if self.virtualizer is None or self.session is None:
            raise RuntimeError("Dependencies not set. Call set_dependencies() first.")

    async def activate_task(self, task_id: str, parent_id: str) -> Optional[Task]:
        """Activate a task (DRAFT -> SCHEDULED).

        Args:
            task_id: Task's ObjectId as string
            parent_id: Parent's ObjectId as string (for authorization)

        Returns:
            Updated task or None if not found or invalid state
        """
        task_id_obj = validate_object_id(task_id, "task_id", raise_http_exception=False)
        parent_id_obj = validate_object_id(parent_id, "parent_id", raise_http_exception=False)

        existing = await self.tasks_collection.find_one(
            {"_id": task_id_obj, "parent_id": parent_id_obj}
        )
        if not existing:
            return None

        if existing.get("status") != TaskStatus.PENDING.value:
            raise ValueError("Can only activate tasks in DRAFT status")

        result = await self.tasks_collection.find_one_and_update(
            {"_id": task_id_obj, "parent_id": parent_id_obj},
            {
                "$set": {
                    "status": TaskStatus.PENDING.value,
                    "activated_at": utcnow(),
                    "updated_at": utcnow(),
                }
            },
            return_document=True,
        )

        if not result:
            return None

        return Task(**result)

    async def start_task(self, task_id: str, child_id: str) -> dict:
        """Start a task (SCHEDULED -> IN_PROGRESS).

        Handles both real tasks and virtual tasks (which are materialized first).

        Args:
            task_id: Task's ObjectId as string (or virtual task ID: template_id_date)
            child_id: Child's ObjectId as string

        Returns:
            Dict with task and optional warnings about concurrent tasks

        Raises:
            ValueError: If task cannot be started
        """
        # Use TaskIdentifier to check if this is a virtual task
        from backend.models.task_identifier import TaskIdentifier
        identifier = TaskIdentifier(raw_id=task_id)
        print(f"DEBUG start_task: task_id={task_id}, is_virtual={identifier.is_virtual}")

        if identifier.is_virtual:
            # First check if this virtual task was already materialized
            template_id = identifier.template_id
            occurrence_date = identifier.occurrence_date.isoformat()

            # Look for already materialized task
            # Note: child_id may be stored as string or ObjectId
            existing_materialized = await self.tasks_collection.find_one({
                "source_recurring_task_id": template_id,
                "$or": [{"child_id": ObjectId(child_id)}, {"child_id": child_id}],
                "is_virtual": False,
                "scheduled_date": {
                    "$gte": datetime.fromisoformat(occurrence_date),
                    "$lt": datetime.fromisoformat(occurrence_date) + timedelta(days=1)
                }
            })

            if existing_materialized:
                # Use the already materialized task
                task_id = str(existing_materialized["_id"])
            else:
                # Get virtual task data from the frontend or regenerate it
                # For now, we need to get all tasks and find the virtual one
                parent_id = child_id  # Will be replaced with actual parent_id lookup

                # Get child to find parent
                child = await self.db.children.find_one({"_id": ObjectId(child_id)})
                if not child:
                    raise ValueError("Child not found")
                parent_id = str(child.get("parent_id"))

                # Get all tasks including virtual instances
                assert self.crud is not None, "CRUD component not set"
                all_tasks = await self.crud.get_tasks_by_child(child_id, parent_id)

                # Find the virtual task
                virtual_task = None
                for task in all_tasks:
                    task_id_in_list = task.get("_id")
                    # Handle both string IDs and dict representations
                    if isinstance(task_id_in_list, dict):
                        task_id_in_list = task_id_in_list.get("$oid", str(task_id_in_list))
                    if str(task_id_in_list) == task_id and task.get("is_virtual"):
                        virtual_task = task
                        break

                if not virtual_task:
                    raise ValueError("Task not found")

                # Materialize the virtual task
                assert self.virtualizer is not None, "Virtualizer not set"
                materialized = await self.virtualizer.materialize_virtual_task(task_id, virtual_task)
                task_id = str(materialized.id)  # Use new ObjectId for subsequent operations

        # Now proceed with normal start_task logic
        task_id_obj = validate_object_id(task_id, "task_id", raise_http_exception=False)
        child_id_obj = validate_object_id(child_id, "child_id", raise_http_exception=False)

        existing = await self.tasks_collection.find_one({
            "_id": task_id_obj,
            "$or": [{"child_id": child_id_obj}, {"child_id": child_id}]
        })
        if not existing:
            raise ValueError("Task not found")

        # If already in progress, just return the task (idempotent)
        if existing.get("status") == TaskStatus.IN_PROGRESS.value:
            return {"task": Task(**existing), "concurrent_tasks": []}

        if existing.get("status") != TaskStatus.PENDING.value:
            raise ValueError(f"Can only start tasks in PENDING status, current: {existing.get('status')}")

        # Check for concurrent tasks
        assert self.session is not None, "Session not set"
        active_sessions = await self.session.get_sessions(child_id)
        concurrent_warnings = []

        if active_sessions:
            for session in active_sessions:
                task = await self.tasks_collection.find_one({"_id": session["task_id"]})
                if task:
                    concurrent_warnings.append(
                        {
                            "task_id": str(task["_id"]),
                            "title": task["title"],
                            "started_at": session["started_at"].isoformat(),
                        }
                    )

        # Update task status
        result = await self.tasks_collection.find_one_and_update(
            {
                "_id": task_id_obj,
                "$or": [{"child_id": child_id_obj}, {"child_id": child_id}]
            },
            {
                "$set": {
                    "status": TaskStatus.IN_PROGRESS.value,
                    "started_at": utcnow(),
                    "updated_at": utcnow(),
                }
            },
            return_document=True,
        )

        if not result:
            raise ValueError("Task not found or could not be started")

        # Create active session
        assert self.session is not None, "Session not set"
        await self.session.create_session(task_id, child_id)

        return {"task": Task(**result), "concurrent_tasks": concurrent_warnings}

    async def pause_task(
        self, task_id: str, paused_by: str, reason: Optional[str] = None
    ) -> Optional[Task]:
        """Pause a task (IN_PROGRESS -> PAUSED).

        Args:
            task_id: Task's ObjectId as string
            paused_by: "PARENT" or "CHILD"
            reason: Optional pause reason

        Returns:
            Updated task or None if not found or invalid state
        """
        task_id_obj = validate_object_id(task_id, "task_id", raise_http_exception=False)

        existing = await self.tasks_collection.find_one({"_id": task_id_obj})
        if not existing:
            return None

        if existing.get("status") != TaskStatus.IN_PROGRESS.value:
            raise ValueError("Can only pause tasks in IN_PROGRESS status")

        pause_record = TaskPauseRecord(
            paused_at=utcnow(), resumed_at=None, paused_by=paused_by, reason=reason
        )

        result = await self.tasks_collection.find_one_and_update(
            {"_id": task_id_obj},
            {
                "$set": {
                    "status": TaskStatus.PAUSED.value,
                    "current_pause": pause_record.model_dump(),
                    "updated_at": utcnow(),
                },
                "$push": {"pause_history": pause_record.model_dump()},
            },
            return_document=True,
        )

        # Remove active session
        assert self.session is not None, "Session not set"
        await self.session.remove_session(task_id)

        if not result:
            return None

        return Task(**result)

    async def resume_task(self, task_id: str) -> Optional[Task]:
        """Resume a paused task (PAUSED -> IN_PROGRESS).

        Args:
            task_id: Task's ObjectId as string

        Returns:
            Updated task or None if not found or invalid state
        """
        task_id_obj = validate_object_id(task_id, "task_id", raise_http_exception=False)

        existing = await self.tasks_collection.find_one({"_id": task_id_obj})
        if not existing:
            return None

        if existing.get("status") != TaskStatus.PAUSED.value:
            raise ValueError("Can only resume tasks in PAUSED status")

        # Update current pause record with resume time
        pause_history = existing.get("pause_history", [])
        current_pause = existing.get("current_pause")
        if current_pause:
            current_pause["resumed_at"] = utcnow().isoformat()

            # Update last pause in history
            if pause_history:
                pause_history[-1]["resumed_at"] = utcnow().isoformat()

        result = await self.tasks_collection.find_one_and_update(
            {"_id": task_id_obj},
            {
                "$set": {
                    "status": TaskStatus.IN_PROGRESS.value,
                    "current_pause": None,
                    "pause_history": pause_history,
                    "updated_at": utcnow(),
                }
            },
            return_document=True,
        )

        # Recreate active session
        child_id = str(existing["child_id"])
        assert self.session is not None, "Session not set"
        await self.session.create_session(task_id, child_id)

        if not result:
            return None

        return Task(**result)

    async def complete_task(self, task_id: str, child_id: str) -> Optional[Task]:
        """Complete a task (IN_PROGRESS -> COMPLETED).

        Handles both real tasks and virtual tasks (which are materialized first).

        Args:
            task_id: Task's ObjectId as string (or virtual task ID: template_id_date)
            child_id: Child's ObjectId as string

        Returns:
            Updated task or None if not found or invalid state
        """
        # Use TaskIdentifier to check if this is a virtual task
        from backend.models.task_identifier import TaskIdentifier
        identifier = TaskIdentifier(raw_id=task_id)

        if identifier.is_virtual:
            # Get child to find parent
            child = await self.db.children.find_one({"_id": ObjectId(child_id)})
            if not child:
                raise ValueError("Child not found")
            parent_id = str(child.get("parent_id"))

            # Get all tasks including virtual instances
            assert self.crud is not None, "CRUD component not set"
            all_tasks = await self.crud.get_tasks_by_child(child_id, parent_id)

            # Find the virtual task
            virtual_task = None
            for task in all_tasks:
                if task.get("_id") == task_id and task.get("is_virtual"):
                    virtual_task = task
                    break

            if not virtual_task:
                raise ValueError(f"Virtual task not found: {task_id}")

            # Materialize the virtual task
            assert self.virtualizer is not None, "Virtualizer not set"
            materialized = await self.virtualizer.materialize_virtual_task(task_id, virtual_task)
            task_id = str(materialized.id)  # Use new ObjectId for subsequent operations

        task_id_obj = validate_object_id(task_id, "task_id", raise_http_exception=False)
        child_id_obj = validate_object_id(child_id, "child_id", raise_http_exception=False)

        existing = await self.tasks_collection.find_one(
            {"_id": task_id_obj, "child_id": child_id_obj}
        )
        if not existing:
            return None

        current_status = existing.get("status")
        # Allow completing from PENDING (simple tasks), IN_PROGRESS (active tasks), or PAUSED (resumed tasks)
        if current_status not in [TaskStatus.PENDING.value, TaskStatus.IN_PROGRESS.value, TaskStatus.PAUSED.value]:
            raise ValueError(f"Can only complete tasks in PENDING, IN_PROGRESS, or PAUSED status, current status: {current_status}")

        result = await self.tasks_collection.find_one_and_update(
            {"_id": task_id_obj, "child_id": child_id_obj},
            {
                "$set": {
                    "status": TaskStatus.COMPLETED.value,
                    "completed_at": utcnow(),
                    "updated_at": utcnow(),
                }
            },
            return_document=True,
        )

        # Remove active session
        assert self.session is not None, "Session not set"
        await self.session.remove_session(task_id)

        if not result:
            return None

        return Task(**result)

    async def cancel_task(self, task_id: str, parent_id: str) -> Optional[Task]:
        """Cancel a task (any status -> CANCELLED).

        Args:
            task_id: Task's ObjectId as string
            parent_id: Parent's ObjectId as string (for authorization)

        Returns:
            Updated task or None if not found
        """
        task_id_obj = validate_object_id(task_id, "task_id", raise_http_exception=False)
        parent_id_obj = validate_object_id(parent_id, "parent_id", raise_http_exception=False)

        result = await self.tasks_collection.find_one_and_update(
            {"_id": task_id_obj, "parent_id": parent_id_obj},
            {
                "$set": {
                    "status": TaskStatus.SKIPPED.value,
                    "updated_at": utcnow(),
                }
            },
            return_document=True,
        )

        # Remove active session if exists
        assert self.session is not None, "Session not set"
        await self.session.remove_session(task_id)

        if not result:
            return None

        return Task(**result)

    async def complete_task_with_times(
        self, task_id: str, child_id: str, start_time: str, end_time: str
    ) -> Optional[Task]:
        """Complete a task with custom start and end times (parent action).

        Args:
            task_id: Task's ObjectId as string (or virtual task ID)
            child_id: Child's ObjectId as string
            start_time: Start time in HH:MM format
            end_time: End time in HH:MM format

        Returns:
            Updated task or None if not found
        """
        # Use TaskIdentifier to check if this is a virtual task
        from backend.models.task_identifier import TaskIdentifier
        identifier = TaskIdentifier(raw_id=task_id)

        if identifier.is_virtual:
            # Materialize virtual task first
            child = await self.db.children.find_one({"_id": ObjectId(child_id)})
            if not child:
                raise ValueError("Child not found")
            parent_id = str(child.get("parent_id"))

            assert self.crud is not None, "CRUD component not set"
            all_tasks = await self.crud.get_tasks_by_child(child_id, parent_id)
            virtual_task = None
            for task in all_tasks:
                if task.get("_id") == task_id and task.get("is_virtual"):
                    virtual_task = task
                    break

            if not virtual_task:
                raise ValueError(f"Virtual task not found: {task_id}")

            assert self.virtualizer is not None, "Virtualizer not set"
            materialized = await self.virtualizer.materialize_virtual_task(task_id, virtual_task)
            task_id = str(materialized.id)

        task_id_obj = validate_object_id(task_id, "task_id", raise_http_exception=False)
        child_id_obj = validate_object_id(child_id, "child_id", raise_http_exception=False)

        # Get task's scheduled date to construct full datetime
        existing = await self.tasks_collection.find_one(
            {"_id": task_id_obj, "child_id": child_id_obj}
        )
        if not existing:
            return None

        # Parse scheduled date
        scheduled_date_str = existing.get("scheduled_date")
        if scheduled_date_str:
            if isinstance(scheduled_date_str, datetime):
                scheduled_date = scheduled_date_str.date()
            else:
                scheduled_date = datetime.fromisoformat(scheduled_date_str.replace("Z", "+00:00")).date()
        else:
            # Fallback to today
            scheduled_date = datetime.now(timezone.utc).date()

        # Parse start and end times
        start_h, start_m = map(int, start_time.split(":"))
        end_h, end_m = map(int, end_time.split(":"))

        # Construct full datetime objects
        started_at = datetime(
            scheduled_date.year, scheduled_date.month, scheduled_date.day,
            start_h, start_m, 0, tzinfo=timezone.utc
        )
        completed_at = datetime(
            scheduled_date.year, scheduled_date.month, scheduled_date.day,
            end_h, end_m, 0, tzinfo=timezone.utc
        )

        result = await self.tasks_collection.find_one_and_update(
            {"_id": task_id_obj, "child_id": child_id_obj},
            {
                "$set": {
                    "status": TaskStatus.COMPLETED.value,
                    "started_at": started_at,
                    "completed_at": completed_at,
                    "updated_at": utcnow(),
                }
            },
            return_document=True,
        )

        # Remove active session if exists
        assert self.session is not None, "Session not set"
        await self.session.remove_session(task_id)

        if not result:
            return None

        return Task(**result)

    async def uncomplete_task(self, task_id: str, parent_id: str) -> Optional[Task]:
        """Mark a completed task as pending again (parent action).

        Args:
            task_id: Task's ObjectId as string
            parent_id: Parent's ObjectId as string (for authorization)

        Returns:
            Updated task or None if not found
        """
        task_id_obj = validate_object_id(task_id, "task_id", raise_http_exception=False)
        parent_id_obj = validate_object_id(parent_id, "parent_id", raise_http_exception=False)

        result = await self.tasks_collection.find_one_and_update(
            {"_id": task_id_obj, "parent_id": parent_id_obj},
            {
                "$set": {
                    "status": TaskStatus.PENDING.value,
                    "updated_at": utcnow(),
                },
                "$unset": {
                    "started_at": "",
                    "completed_at": "",
                },
            },
            return_document=True,
        )

        if not result:
            return None

        return Task(**result)

    async def skip_task(self, task_id: str, parent_id: str) -> Optional[Task]:
        """Mark a task as skipped (parent action for must_do/should_do tasks).

        Args:
            task_id: Task's ObjectId as string
            parent_id: Parent's ObjectId as string (for authorization)

        Returns:
            Updated task or None if not found
        """
        task_id_obj = validate_object_id(task_id, "task_id", raise_http_exception=False)
        parent_id_obj = validate_object_id(parent_id, "parent_id", raise_http_exception=False)

        result = await self.tasks_collection.find_one_and_update(
            {"_id": task_id_obj, "parent_id": parent_id_obj},
            {
                "$set": {
                    "status": TaskStatus.SKIPPED.value,
                    "updated_at": utcnow(),
                }
            },
            return_document=True,
        )

        # Remove active session if exists
        assert self.session is not None, "Session not set"
        await self.session.remove_session(task_id)

        if not result:
            return None

        return Task(**result)

    async def restore_skipped_task(self, task_id: str, parent_id: str) -> Optional[Task]:
        """Restore a skipped task to pending (parent action).

        Args:
            task_id: Task's ObjectId as string
            parent_id: Parent's ObjectId as string (for authorization)

        Returns:
            Updated task or None if not found
        """
        task_id_obj = validate_object_id(task_id, "task_id", raise_http_exception=False)
        parent_id_obj = validate_object_id(parent_id, "parent_id", raise_http_exception=False)

        result = await self.tasks_collection.find_one_and_update(
            {"_id": task_id_obj, "parent_id": parent_id_obj},
            {
                "$set": {
                    "status": TaskStatus.PENDING.value,
                    "updated_at": utcnow(),
                }
            },
            return_document=True,
        )

        if not result:
            return None

        return Task(**result)

    async def validate_concurrent_tasks(self, task: Task, child_id: ObjectId) -> dict:
        """Validate if task can run concurrently with active tasks.

        Args:
            task: Task to validate
            child_id: Child's ObjectId

        Returns:
            Dict with is_valid flag and warnings
        """
        if task.concurrent_allowed:
            return {"is_valid": True, "warnings": []}

        # Get active sessions
        assert self.session is not None, "Session not set"
        sessions = await self.session.get_sessions(str(child_id))
        if not sessions:
            return {"is_valid": True, "warnings": []}

        warnings = []
        for session in sessions:
            active_task_doc = await self.tasks_collection.find_one({"_id": session["task_id"]})
            if active_task_doc:
                active_task = Task(**active_task_doc)

                # Check if compatible
                if task.task_type_code in active_task.concurrent_compatible_with:
                    continue

                warnings.append({
                    "task_id": str(active_task.id),
                    "title": active_task.title,
                    "message": f"Task '{active_task.title}' is currently in progress"
                })

        return {
            "is_valid": len(warnings) == 0,
            "warnings": warnings
        }

    async def complete_recurring_tasks_bulk(
        self, source_id: str, child_id: str, date_list: List[str]
    ) -> Dict[str, Any]:
        """Complete multiple instances of a recurring task in bulk.

        Args:
            source_id: The source template ID (routine_id or activity_id)
            child_id: Child's ObjectId as string
            date_list: List of dates in YYYY-MM-DD format to complete

        Returns:
            Dict with completed_count, failed_count, and errors list
        """
        from datetime import datetime

        child_id_obj = validate_object_id(child_id, "child_id", raise_http_exception=False)
        source_id_obj = validate_object_id(source_id, "source_id", raise_http_exception=False)

        # Get child to find parent
        child = await self.db.children.find_one({"_id": child_id_obj})
        if not child:
            raise ValueError("Child not found")
        parent_id = str(child.get("parent_id"))

        # Get all tasks including virtual instances
        assert self.crud is not None, "CRUD component not set"
        all_tasks = await self.crud.get_tasks_by_child(child_id, parent_id)

        completed_count = 0
        failed_count = 0
        errors = []

        for date_str in date_list:
            try:
                # Find virtual task for this date
                task_id = f"{source_id}_{date_str}"
                virtual_task = None
                for task in all_tasks:
                    if task.get("_id") == task_id and task.get("is_virtual"):
                        virtual_task = task
                        break

                if not virtual_task:
                    # Skip if virtual task not found (might already be completed/skipped)
                    continue

                # Complete the task (will materialize if virtual)
                result = await self.complete_task(task_id, child_id)
                if result:
                    completed_count += 1
                else:
                    failed_count += 1
                    errors.append(f"Failed to complete task for {date_str}")

            except Exception as e:
                failed_count += 1
                errors.append(f"Error completing {date_str}: {str(e)}")

        return {
            "completed_count": completed_count,
            "failed_count": failed_count,
            "errors": errors
        }
