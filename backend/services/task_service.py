"""Task service for managing tasks with full lifecycle support."""
from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from datetime import datetime

from backend.models.task import (
    Task,
    TaskCreate,
    TaskUpdate,
    TaskStatus,
    TaskPauseRecord,
    ActiveTaskSession,
    ActivationType,
)
from backend.utils.datetime_utils import utcnow


class TaskService:
    """Service for managing tasks with lifecycle support."""

    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.tasks_collection = db.tasks
        self.sessions_collection = db.active_task_sessions
        self.collections_collection = db.task_collections

    async def create_task(self, parent_id: str, task_data: TaskCreate) -> Task:
        """Create a new task (status: DRAFT).

        Args:
            parent_id: Parent's ObjectId as string (for authorization)
            task_data: Task creation data

        Returns:
            Created task

        Raises:
            ValueError: If IDs are invalid or collection doesn't belong to parent
        """
        if (
            not ObjectId.is_valid(parent_id)
            or not ObjectId.is_valid(task_data.collection_id)
            or not ObjectId.is_valid(task_data.child_id)
        ):
            raise ValueError("Invalid parent_id, collection_id, or child_id")

        # Verify collection belongs to parent
        collection = await self.collections_collection.find_one(
            {
                "_id": ObjectId(task_data.collection_id),
                "parent_id": ObjectId(parent_id),
                "child_id": ObjectId(task_data.child_id),
            }
        )
        if not collection:
            raise ValueError("Collection not found or doesn't belong to parent/child")

        task_doc = {
            "collection_id": ObjectId(task_data.collection_id),
            "child_id": ObjectId(task_data.child_id),
            "parent_id": ObjectId(parent_id),
            "title": task_data.title,
            "description": task_data.description,
            "task_type_code": task_data.task_type_code,
            "status": TaskStatus.DRAFT.value,
            "activation_rule": (
                task_data.activation_rule.model_dump() if task_data.activation_rule else None
            ),
            "constraints": task_data.constraints.model_dump() if task_data.constraints else None,
            "pause_history": [],
            "current_pause": None,
            "metrics": [m.model_dump() for m in task_data.metrics],
            "quality_aspects": [q.model_dump() for q in task_data.quality_aspects],
            "attachments": [],
            "tools": [t.model_dump() for t in task_data.tools],
            "ai_attributes": None,
            "subtasks": [s.model_dump() for s in task_data.subtasks],
            "created_at": utcnow(),
            "updated_at": utcnow(),
            "activated_at": None,
            "started_at": None,
            "completed_at": None,
            "points_earned": None,
        }

        result = await self.tasks_collection.insert_one(task_doc)
        task_doc["_id"] = result.inserted_id

        return Task(**task_doc)

    async def get_tasks_by_collection(
        self, collection_id: str, parent_id: str, status: Optional[TaskStatus] = None
    ) -> List[Task]:
        """Get tasks in a collection.

        Args:
            collection_id: Collection's ObjectId as string
            parent_id: Parent's ObjectId as string (for authorization)
            status: Optional status filter

        Returns:
            List of tasks
        """
        if not ObjectId.is_valid(collection_id) or not ObjectId.is_valid(parent_id):
            raise ValueError("Invalid collection_id or parent_id")

        query = {"collection_id": ObjectId(collection_id), "parent_id": ObjectId(parent_id)}
        if status:
            query["status"] = status.value

        cursor = self.tasks_collection.find(query).sort("created_at", -1)
        tasks = []

        async for doc in cursor:
            tasks.append(Task(**doc))

        return tasks

    async def get_tasks_by_child(
        self, child_id: str, parent_id: str, status: Optional[TaskStatus] = None
    ) -> List[Task]:
        """Get all tasks for a child.

        Args:
            child_id: Child's ObjectId as string
            parent_id: Parent's ObjectId as string (for authorization)
            status: Optional status filter

        Returns:
            List of tasks
        """
        if not ObjectId.is_valid(child_id) or not ObjectId.is_valid(parent_id):
            raise ValueError("Invalid child_id or parent_id")

        query = {"child_id": ObjectId(child_id), "parent_id": ObjectId(parent_id)}
        if status:
            query["status"] = status.value

        cursor = self.tasks_collection.find(query).sort("created_at", -1)
        tasks = []

        async for doc in cursor:
            tasks.append(Task(**doc))

        return tasks

    async def get_task_by_id(self, task_id: str, parent_id: str) -> Optional[Task]:
        """Get a task by ID.

        Args:
            task_id: Task's ObjectId as string
            parent_id: Parent's ObjectId as string (for authorization)

        Returns:
            Task or None if not found or unauthorized
        """
        if not ObjectId.is_valid(task_id) or not ObjectId.is_valid(parent_id):
            return None

        doc = await self.tasks_collection.find_one(
            {"_id": ObjectId(task_id), "parent_id": ObjectId(parent_id)}
        )
        if not doc:
            return None

        return Task(**doc)

    async def update_task(
        self, task_id: str, parent_id: str, task_data: TaskUpdate
    ) -> Optional[Task]:
        """Update a task.

        Args:
            task_id: Task's ObjectId as string
            parent_id: Parent's ObjectId as string (for authorization)
            task_data: Updated task data

        Returns:
            Updated task or None if not found or unauthorized
        """
        if not ObjectId.is_valid(task_id) or not ObjectId.is_valid(parent_id):
            return None

        existing = await self.tasks_collection.find_one(
            {"_id": ObjectId(task_id), "parent_id": ObjectId(parent_id)}
        )
        if not existing:
            return None

        update_doc = {"updated_at": utcnow()}
        if task_data.title is not None:
            update_doc["title"] = task_data.title
        if task_data.description is not None:
            update_doc["description"] = task_data.description
        if task_data.task_type_code is not None:
            update_doc["task_type_code"] = task_data.task_type_code
        if task_data.activation_rule is not None:
            update_doc["activation_rule"] = task_data.activation_rule.model_dump()
        if task_data.constraints is not None:
            update_doc["constraints"] = task_data.constraints.model_dump()
        if task_data.metrics is not None:
            update_doc["metrics"] = [m.model_dump() for m in task_data.metrics]
        if task_data.quality_aspects is not None:
            update_doc["quality_aspects"] = [q.model_dump() for q in task_data.quality_aspects]
        if task_data.tools is not None:
            update_doc["tools"] = [t.model_dump() for t in task_data.tools]
        if task_data.subtasks is not None:
            update_doc["subtasks"] = [s.model_dump() for s in task_data.subtasks]

        result = await self.tasks_collection.find_one_and_update(
            {"_id": ObjectId(task_id), "parent_id": ObjectId(parent_id)},
            {"$set": update_doc},
            return_document=True,
        )

        if not result:
            return None

        return Task(**result)

    async def delete_task(self, task_id: str, parent_id: str) -> bool:
        """Delete a task.

        Args:
            task_id: Task's ObjectId as string
            parent_id: Parent's ObjectId as string (for authorization)

        Returns:
            True if deleted, False if not found or unauthorized
        """
        if not ObjectId.is_valid(task_id) or not ObjectId.is_valid(parent_id):
            return False

        result = await self.tasks_collection.delete_one(
            {"_id": ObjectId(task_id), "parent_id": ObjectId(parent_id)}
        )
        return result.deleted_count > 0

    # ==================== Lifecycle Methods ====================

    async def activate_task(self, task_id: str, parent_id: str) -> Optional[Task]:
        """Activate a task (DRAFT -> SCHEDULED).

        Args:
            task_id: Task's ObjectId as string
            parent_id: Parent's ObjectId as string (for authorization)

        Returns:
            Updated task or None if not found or invalid state
        """
        if not ObjectId.is_valid(task_id) or not ObjectId.is_valid(parent_id):
            return None

        existing = await self.tasks_collection.find_one(
            {"_id": ObjectId(task_id), "parent_id": ObjectId(parent_id)}
        )
        if not existing:
            return None

        if existing.get("status") != TaskStatus.DRAFT.value:
            raise ValueError("Can only activate tasks in DRAFT status")

        result = await self.tasks_collection.find_one_and_update(
            {"_id": ObjectId(task_id), "parent_id": ObjectId(parent_id)},
            {
                "$set": {
                    "status": TaskStatus.SCHEDULED.value,
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

        Args:
            task_id: Task's ObjectId as string
            child_id: Child's ObjectId as string

        Returns:
            Dict with task and optional warnings about concurrent tasks

        Raises:
            ValueError: If task cannot be started
        """
        if not ObjectId.is_valid(task_id) or not ObjectId.is_valid(child_id):
            raise ValueError("Invalid task_id or child_id")

        existing = await self.tasks_collection.find_one(
            {"_id": ObjectId(task_id), "child_id": ObjectId(child_id)}
        )
        if not existing:
            raise ValueError("Task not found")

        if existing.get("status") != TaskStatus.SCHEDULED.value:
            raise ValueError("Can only start tasks in SCHEDULED status")

        # Check for concurrent tasks
        active_sessions = await self._get_active_sessions(child_id)
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
            {"_id": ObjectId(task_id), "child_id": ObjectId(child_id)},
            {
                "$set": {
                    "status": TaskStatus.IN_PROGRESS.value,
                    "started_at": utcnow(),
                    "updated_at": utcnow(),
                }
            },
            return_document=True,
        )

        # Create active session
        await self._create_active_session(task_id, child_id)

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
        if not ObjectId.is_valid(task_id):
            return None

        existing = await self.tasks_collection.find_one({"_id": ObjectId(task_id)})
        if not existing:
            return None

        if existing.get("status") != TaskStatus.IN_PROGRESS.value:
            raise ValueError("Can only pause tasks in IN_PROGRESS status")

        pause_record = TaskPauseRecord(
            paused_at=utcnow(), resumed_at=None, paused_by=paused_by, reason=reason
        )

        result = await self.tasks_collection.find_one_and_update(
            {"_id": ObjectId(task_id)},
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
        await self._remove_active_session(task_id)

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
        if not ObjectId.is_valid(task_id):
            return None

        existing = await self.tasks_collection.find_one({"_id": ObjectId(task_id)})
        if not existing:
            return None

        if existing.get("status") != TaskStatus.PAUSED.value:
            raise ValueError("Can only resume tasks in PAUSED status")

        # Update current pause record with resume time
        current_pause = existing.get("current_pause")
        if current_pause:
            current_pause["resumed_at"] = utcnow().isoformat()

            # Update last pause in history
            pause_history = existing.get("pause_history", [])
            if pause_history:
                pause_history[-1]["resumed_at"] = utcnow().isoformat()

        result = await self.tasks_collection.find_one_and_update(
            {"_id": ObjectId(task_id)},
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
        await self._create_active_session(task_id, child_id)

        if not result:
            return None

        return Task(**result)

    async def complete_task(self, task_id: str, child_id: str) -> Optional[Task]:
        """Complete a task (IN_PROGRESS -> COMPLETED).

        Args:
            task_id: Task's ObjectId as string
            child_id: Child's ObjectId as string

        Returns:
            Updated task or None if not found or invalid state
        """
        if not ObjectId.is_valid(task_id) or not ObjectId.is_valid(child_id):
            return None

        existing = await self.tasks_collection.find_one(
            {"_id": ObjectId(task_id), "child_id": ObjectId(child_id)}
        )
        if not existing:
            return None

        if existing.get("status") != TaskStatus.IN_PROGRESS.value:
            raise ValueError("Can only complete tasks in IN_PROGRESS status")

        result = await self.tasks_collection.find_one_and_update(
            {"_id": ObjectId(task_id), "child_id": ObjectId(child_id)},
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
        await self._remove_active_session(task_id)

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
        if not ObjectId.is_valid(task_id) or not ObjectId.is_valid(parent_id):
            return None

        result = await self.tasks_collection.find_one_and_update(
            {"_id": ObjectId(task_id), "parent_id": ObjectId(parent_id)},
            {
                "$set": {
                    "status": TaskStatus.CANCELLED.value,
                    "updated_at": utcnow(),
                }
            },
            return_document=True,
        )

        # Remove active session if exists
        await self._remove_active_session(task_id)

        if not result:
            return None

        return Task(**result)

    # ==================== Active Session Management ====================

    async def _create_active_session(self, task_id: str, child_id: str) -> None:
        """Create an active task session."""
        session_doc = {
            "child_id": ObjectId(child_id),
            "task_id": ObjectId(task_id),
            "started_at": utcnow(),
            "last_activity": utcnow(),
            "tools_in_use": [],
        }
        await self.sessions_collection.insert_one(session_doc)

    async def _remove_active_session(self, task_id: str) -> None:
        """Remove an active task session."""
        await self.sessions_collection.delete_one({"task_id": ObjectId(task_id)})

    async def _get_active_sessions(self, child_id: str) -> List[dict]:
        """Get all active sessions for a child."""
        cursor = self.sessions_collection.find({"child_id": ObjectId(child_id)})
        sessions = []
        async for doc in cursor:
            sessions.append(doc)
        return sessions

    async def get_active_tasks(self, child_id: str) -> List[dict]:
        """Get all active tasks for a child (for concurrent task warning).

        Args:
            child_id: Child's ObjectId as string

        Returns:
            List of dicts with task info and session info
        """
        if not ObjectId.is_valid(child_id):
            return []

        sessions = await self._get_active_sessions(child_id)
        active_tasks = []

        for session in sessions:
            task = await self.tasks_collection.find_one({"_id": session["task_id"]})
            if task:
                active_tasks.append(
                    {
                        "task_id": str(task["_id"]),
                        "title": task["title"],
                        "started_at": session["started_at"].isoformat(),
                        "last_activity": session["last_activity"].isoformat(),
                    }
                )

        return active_tasks
