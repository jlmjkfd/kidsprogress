"""Task service for managing tasks with full lifecycle support."""
from typing import List, Optional, Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from datetime import datetime, date, timedelta

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
from backend.services.virtual_instance_service import VirtualInstanceService


class TaskService:
    """Service for managing tasks with lifecycle support."""

    def __init__(self, db: AsyncIOMotorDatabase, school_calendar_service=None):
        self.db = db
        self.tasks_collection = db.tasks
        self.sessions_collection = db.active_task_sessions
        self.collections_collection = db.task_collections
        self.school_calendar_service = school_calendar_service

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
            "task_source": "one_time",  # Default for manually created tasks

            # Scheduling fields (Unified Model)
            "scheduling_type": task_data.scheduling_type.value if task_data.scheduling_type else "flexible",
            "scheduled_date": task_data.scheduled_date,
            "fixed_time_slot": task_data.fixed_time_slot.model_dump() if task_data.fixed_time_slot else None,
            "preferred_time_slot": task_data.preferred_time_slot.model_dump() if task_data.preferred_time_slot else None,
            "preferred_time_window": task_data.preferred_time_window.model_dump() if task_data.preferred_time_window else None,
            "deadline": task_data.deadline,
            "deadline_type": task_data.deadline_type.value if task_data.deadline_type else None,
            "estimated_duration_minutes": task_data.estimated_duration_minutes,

            # Recurrence (Unified Model - replaces Routine)
            "is_recurring": task_data.is_recurring,
            "recurrence_pattern": task_data.recurrence_pattern,
            "source_recurring_task_id": None,

            # Blocking & Interruption (Unified Model - replaces TimeBlock)
            "is_informational": task_data.is_informational if task_data.is_informational is not None else False,
            "blocks_other_tasks": task_data.blocks_other_tasks,
            "can_be_interrupted": task_data.can_be_interrupted,
            "can_be_split": task_data.can_be_split,
            "min_session_duration": task_data.min_session_duration,

            # Pool / Activity (Unified Model - replaces Activity)
            "is_in_pool": task_data.is_in_pool,
            "pool_usage_rules": task_data.pool_usage_rules.model_dump() if task_data.pool_usage_rules else None,

            # Priority & Obligation
            "obligation_level": task_data.obligation_level.value if task_data.obligation_level else "optional",
            "priority_boost": task_data.priority_boost if task_data.priority_boost is not None else 0,

            # Rollover tracking
            "original_date": None,
            "rollover_count": 0,
            "is_in_backlog": False,
            "is_delayed": False,

            # Concurrent task support
            "concurrent_allowed": False,
            "concurrent_compatible_with": [],

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

        # NOTE: Recurring tasks are now handled via virtual instance expansion
        # No need to pre-generate instances - they're created on-demand in get_tasks_by_child()
        # See: backend/services/virtual_instance_service.py

        return Task(**task_doc)

    # DEPRECATED: Old pre-generation method - kept for reference
    # Use VirtualInstanceService.expand_recurring_task() instead
    async def _generate_recurring_instances_DEPRECATED(
        self, source_task_id: str, task_data: TaskCreate, parent_id: str
    ):
        """DEPRECATED: Generate task instances for a recurring task.

        OLD IMPLEMENTATION: This creates all instances upfront, which has limitations:
        - Database bloat for long-running recurrences
        - No dynamic updates when school calendar changes
        - Storage waste for far-future tasks
        - Editing challenges (can't update all instances)

        TODO: Replace with dynamic virtual instance expansion (see recurring-tasks-improvement-plan.md)

        Args:
            source_task_id: ID of the source recurring task
            task_data: Original task creation data
            parent_id: Parent ID
        """
        if not task_data.scheduled_date or not task_data.recurrence_pattern:
            return

        # Parse RRULE to get dates
        dates = await self._expand_recurrence(
            task_data.child_id,
            task_data.recurrence_pattern,
            task_data.scheduled_date
        )

        # Create an instance for each date (skip the first one which is the source)
        for recurrence_date in dates[1:]:
            instance_doc = {
                "collection_id": ObjectId(task_data.collection_id),
                "child_id": ObjectId(task_data.child_id),
                "parent_id": ObjectId(parent_id),
                "title": task_data.title,
                "description": task_data.description,
                "task_type_code": task_data.task_type_code,
                "task_source": "recurring",

                # Scheduling fields - use the recurrence date
                "scheduling_type": task_data.scheduling_type.value if task_data.scheduling_type else "flexible",
                "scheduled_date": datetime.fromisoformat(recurrence_date),
                "fixed_time_slot": task_data.fixed_time_slot.model_dump() if task_data.fixed_time_slot else None,
                "preferred_time_slot": task_data.preferred_time_slot.model_dump() if task_data.preferred_time_slot else None,
                "preferred_time_window": task_data.preferred_time_window.model_dump() if task_data.preferred_time_window else None,
                "deadline": task_data.deadline,
                "deadline_type": task_data.deadline_type.value if task_data.deadline_type else None,
                "estimated_duration_minutes": task_data.estimated_duration_minutes,

                # Mark as recurring instance
                "is_recurring": False,  # Instances are not recurring themselves
                "recurrence_pattern": None,
                "source_recurring_task_id": ObjectId(source_task_id),

                # Copy other properties
                "is_informational": task_data.is_informational if task_data.is_informational is not None else False,
                "blocks_other_tasks": task_data.blocks_other_tasks,
                "can_be_interrupted": task_data.can_be_interrupted,
                "can_be_split": task_data.can_be_split,
                "min_session_duration": task_data.min_session_duration,
                "is_in_pool": task_data.is_in_pool,
                "pool_usage_rules": task_data.pool_usage_rules.model_dump() if task_data.pool_usage_rules else None,
                "obligation_level": task_data.obligation_level.value if task_data.obligation_level else "optional",
                "priority_boost": task_data.priority_boost if task_data.priority_boost is not None else 0,
                "original_date": None,
                "rollover_count": 0,
                "is_in_backlog": False,
                "is_delayed": False,
                "concurrent_allowed": False,
                "concurrent_compatible_with": [],
                "status": TaskStatus.DRAFT.value,
                "activation_rule": task_data.activation_rule.model_dump() if task_data.activation_rule else None,
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

            await self.tasks_collection.insert_one(instance_doc)

    async def _expand_recurrence(
        self, child_id: str, rrule: str, start_date: datetime
    ) -> list[str]:
        """Expand an RRULE into a list of date strings.

        Args:
            child_id: Child ID
            rrule: RRULE string
            start_date: Start date

        Returns:
            List of ISO date strings (YYYY-MM-DD)
        """
        start_date_str = start_date.date().isoformat() if isinstance(start_date, datetime) else start_date

        # Check if this is a school day pattern
        if rrule.startswith("FREQ=SCHOOL_DAYS") or rrule.startswith("FREQ=HOLIDAYS"):
            if self.school_calendar_service:
                return await self.school_calendar_service.expand_school_day_rrule(
                    child_id, rrule, start_date_str
                )
            else:
                # Fallback: just return the start date if no calendar service
                return [start_date_str]

        # For standard RRULEs, use a simple expansion (basic implementation)
        # In production, you'd use a library like python-dateutil's rrule
        return await self._expand_standard_rrule(rrule, start_date_str)

    async def _expand_standard_rrule(self, rrule: str, start_date_str: str) -> list[str]:
        """Basic RRULE expansion for standard patterns."""
        parts = {}
        for part in rrule.split(";"):
            if "=" not in part:
                continue
            key, val = part.split("=", 1)
            parts[key] = val

        freq = parts.get("FREQ", "DAILY")
        count = int(parts.get("COUNT", 10))  # Default 10 occurrences
        interval = int(parts.get("INTERVAL", 1))

        dates = []
        current = date.fromisoformat(start_date_str)

        for i in range(count):
            dates.append(current.isoformat())

            if freq == "DAILY":
                current += timedelta(days=interval)
            elif freq == "WEEKLY":
                current += timedelta(weeks=interval)
            elif freq == "MONTHLY":
                # Simple month addition (doesn't handle edge cases perfectly)
                month = current.month + interval
                year = current.year
                while month > 12:
                    month -= 12
                    year += 1
                try:
                    current = current.replace(year=year, month=month)
                except ValueError:
                    # Handle invalid dates (e.g., Feb 31 -> Feb 28/29)
                    current = current.replace(year=year, month=month, day=28)

        return dates

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

        query: Dict[str, Any] = {"collection_id": ObjectId(collection_id), "parent_id": ObjectId(parent_id)}
        if status:
            query["status"] = status.value

        cursor = self.tasks_collection.find(query).sort("created_at", -1)
        tasks = []

        async for doc in cursor:
            tasks.append(Task(**doc))

        return tasks

    async def get_tasks_by_child(
        self, child_id: str, parent_id: str, status: Optional[TaskStatus] = None,
        start_date: Optional[date] = None, end_date: Optional[date] = None
    ) -> List[Task]:
        """Get all tasks for a child, including virtual instances from recurring tasks.

        Args:
            child_id: Child's ObjectId as string
            parent_id: Parent's ObjectId as string (for authorization)
            status: Optional status filter
            start_date: Optional start date for virtual instance expansion (defaults to 30 days ago)
            end_date: Optional end date for virtual instance expansion (defaults to 60 days ahead)

        Returns:
            List of tasks (includes both one-time tasks and virtual instances)
        """
        if not ObjectId.is_valid(child_id) or not ObjectId.is_valid(parent_id):
            raise ValueError("Invalid child_id or parent_id")

        # Default date range for virtual expansion
        if not start_date:
            start_date = date.today() - timedelta(days=30)
        if not end_date:
            end_date = date.today() + timedelta(days=60)

        # Query for non-recurring tasks within date range
        query: Dict[str, Any] = {
            "child_id": ObjectId(child_id),
            "parent_id": ObjectId(parent_id),
            "is_recurring": False  # Get one-time tasks only
        }
        if status:
            query["status"] = status.value

        # Add date filter for one-time tasks
        query["scheduled_date"] = {
            "$gte": datetime.combine(start_date, datetime.min.time()),
            "$lte": datetime.combine(end_date, datetime.max.time())
        }

        cursor = self.tasks_collection.find(query).sort("scheduled_date", 1)
        tasks = []

        async for doc in cursor:
            tasks.append(Task(**doc))

        # Get recurring task templates (no date filter, no status filter)
        recurring_query: Dict[str, Any] = {
            "child_id": ObjectId(child_id),
            "parent_id": ObjectId(parent_id),
            "is_recurring": True
        }

        recurring_cursor = self.tasks_collection.find(recurring_query)
        recurring_templates = []

        async for doc in recurring_cursor:
            template = Task(**doc)
            recurring_templates.append(template)

        # Expand recurring templates into virtual instances
        for template in recurring_templates:
            virtual_instances = await VirtualInstanceService.expand_recurring_task(
                template,
                start_date,
                end_date,
                self.school_calendar_service
            )

            # Add virtual instances directly as dicts (don't convert to Task objects)
            # They have string IDs which don't validate as ObjectId
            for instance_data in virtual_instances:
                # Apply status filter if specified
                if status and instance_data.get("status") != status.value:
                    continue

                tasks.append(instance_data)

        # Add recurring templates to the list so they can be edited
        # Convert templates to dicts and mark with is_virtual=False
        for template in recurring_templates:
            template_data = template.model_dump(mode='json')
            template_data["is_virtual"] = False
            tasks.append(template_data)

        # Sort by scheduled_date
        # All items are now dicts (both templates and virtual instances)
        def get_scheduled_date(t):
            date_val = t.get("scheduled_date")
            if not date_val:
                return datetime.max
            # Handle both datetime objects and ISO strings
            if isinstance(date_val, str):
                try:
                    return datetime.fromisoformat(date_val.replace('Z', '+00:00'))
                except (ValueError, AttributeError):
                    return datetime.max
            return date_val

        tasks.sort(key=get_scheduled_date)

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

        update_doc: Dict[str, Any] = {"updated_at": utcnow()}
        if task_data.title is not None:
            update_doc["title"] = task_data.title
        if task_data.description is not None:
            update_doc["description"] = task_data.description
        if task_data.task_type_code is not None:
            update_doc["task_type_code"] = task_data.task_type_code

        # Scheduling fields (Unified Model)
        if task_data.scheduling_type is not None:
            update_doc["scheduling_type"] = task_data.scheduling_type.value
        if task_data.scheduled_date is not None:
            update_doc["scheduled_date"] = task_data.scheduled_date
        if task_data.fixed_time_slot is not None:
            update_doc["fixed_time_slot"] = task_data.fixed_time_slot.model_dump()
        if task_data.preferred_time_slot is not None:
            update_doc["preferred_time_slot"] = task_data.preferred_time_slot.model_dump()
        if task_data.preferred_time_window is not None:
            update_doc["preferred_time_window"] = task_data.preferred_time_window.model_dump()
        if task_data.deadline is not None:
            update_doc["deadline"] = task_data.deadline
        if task_data.deadline_type is not None:
            update_doc["deadline_type"] = task_data.deadline_type.value
        if task_data.estimated_duration_minutes is not None:
            update_doc["estimated_duration_minutes"] = task_data.estimated_duration_minutes

        # Recurrence (Unified Model)
        if task_data.is_recurring is not None:
            update_doc["is_recurring"] = task_data.is_recurring
        if task_data.recurrence_pattern is not None:
            update_doc["recurrence_pattern"] = task_data.recurrence_pattern

        # Blocking & Interruption (Unified Model)
        if task_data.is_informational is not None:
            update_doc["is_informational"] = task_data.is_informational
        if task_data.blocks_other_tasks is not None:
            update_doc["blocks_other_tasks"] = task_data.blocks_other_tasks
        if task_data.can_be_interrupted is not None:
            update_doc["can_be_interrupted"] = task_data.can_be_interrupted
        if task_data.can_be_split is not None:
            update_doc["can_be_split"] = task_data.can_be_split
        if task_data.min_session_duration is not None:
            update_doc["min_session_duration"] = task_data.min_session_duration

        # Pool / Activity (Unified Model)
        if task_data.is_in_pool is not None:
            update_doc["is_in_pool"] = task_data.is_in_pool
        if task_data.pool_usage_rules is not None:
            update_doc["pool_usage_rules"] = task_data.pool_usage_rules.model_dump()

        # Priority & Obligation
        if task_data.obligation_level is not None:
            update_doc["obligation_level"] = task_data.obligation_level.value
        if task_data.priority_boost is not None:
            update_doc["priority_boost"] = task_data.priority_boost

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

    async def add_recurrence_exception(
        self,
        task_id: str,
        parent_id: str,
        exception_date: str,
        exception_type: str,
        overrides: Optional[Dict[str, Any]] = None,
    ) -> Optional[Task]:
        """Add an exception to a recurring task (for editing/deleting single occurrence).

        Args:
            task_id: Recurring task template's ObjectId as string
            parent_id: Parent's ObjectId as string (for authorization)
            exception_date: Date of the exception (YYYY-MM-DD)
            exception_type: "deleted" or "modified"
            overrides: Optional dict of field overrides for "modified" type

        Returns:
            Updated task template or None if not found/unauthorized
        """
        if not ObjectId.is_valid(task_id) or not ObjectId.is_valid(parent_id):
            return None

        # Get the task
        task = await self.tasks_collection.find_one(
            {"_id": ObjectId(task_id), "parent_id": ObjectId(parent_id), "is_recurring": True}
        )
        if not task:
            return None

        # Get existing exceptions
        exceptions = task.get("exceptions", [])

        # Remove existing exception for this date if any
        exceptions = [e for e in exceptions if e.get("date") != exception_date]

        # Add new exception
        new_exception = {
            "date": exception_date,
            "type": exception_type,
        }
        if overrides:
            new_exception["overrides"] = overrides

        exceptions.append(new_exception)

        # Update task
        result = await self.tasks_collection.update_one(
            {"_id": ObjectId(task_id)},
            {"$set": {"exceptions": exceptions, "updated_at": utcnow()}},
        )

        if result.modified_count == 0:
            return None

        # Fetch and return updated task
        updated_doc = await self.tasks_collection.find_one({"_id": ObjectId(task_id)})
        return Task(**updated_doc) if updated_doc else None

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

        if not result:
            raise ValueError("Task not found or could not be started")

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
        pause_history = existing.get("pause_history", [])
        current_pause = existing.get("current_pause")
        if current_pause:
            current_pause["resumed_at"] = utcnow().isoformat()

            # Update last pause in history
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

    # ==================== Enhanced Task Management ====================

    async def rollover_task(self, task_id: str, new_date: datetime) -> Optional[Task]:
        """Rollover an incomplete task to a new date.

        Args:
            task_id: Task's ObjectId as string
            new_date: New scheduled date

        Returns:
            Updated task or None if not found
        """
        if not ObjectId.is_valid(task_id):
            return None

        existing = await self.tasks_collection.find_one({"_id": ObjectId(task_id)})
        if not existing:
            return None

        # Set original_date if first rollover
        original_date = existing.get("original_date")
        if not original_date:
            original_date = existing.get("scheduled_date")

        rollover_count = existing.get("rollover_count", 0) + 1

        result = await self.tasks_collection.find_one_and_update(
            {"_id": ObjectId(task_id)},
            {
                "$set": {
                    "scheduled_date": new_date,
                    "original_date": original_date,
                    "rollover_count": rollover_count,
                    "is_delayed": True,
                    "updated_at": utcnow(),
                }
            },
            return_document=True,
        )

        return Task(**result) if result else None

    async def move_to_backlog(self, task_id: str) -> Optional[Task]:
        """Move a task to backlog after too many rollovers.

        Args:
            task_id: Task's ObjectId as string

        Returns:
            Updated task or None if not found
        """
        if not ObjectId.is_valid(task_id):
            return None

        result = await self.tasks_collection.find_one_and_update(
            {"_id": ObjectId(task_id)},
            {
                "$set": {
                    "is_in_backlog": True,
                    "status": TaskStatus.SCHEDULED.value,  # Keep scheduled for later activation
                    "updated_at": utcnow(),
                }
            },
            return_document=True,
        )

        return Task(**result) if result else None

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
        sessions = await self._get_active_sessions(str(child_id))
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
