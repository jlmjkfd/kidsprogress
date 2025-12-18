"""Recurrence pattern management and expansion."""
from typing import Optional, Dict, Any, List
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from datetime import datetime, date, timedelta

from backend.models.task import Task
from backend.utils.datetime_utils import utcnow
from backend.utils.validators import validate_object_id


class TaskRecurrence:
    """Manages task recurrence patterns and exceptions."""

    def __init__(self, db: AsyncIOMotorDatabase, school_calendar_service=None):
        """Initialize recurrence component.

        Args:
            db: MongoDB database instance
            school_calendar_service: Optional school calendar service for school day patterns
        """
        self.db = db
        self.tasks_collection = db.tasks
        self.school_calendar_service = school_calendar_service

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
        task_id_obj = validate_object_id(task_id, "task_id", raise_http_exception=False)
        parent_id_obj = validate_object_id(parent_id, "parent_id", raise_http_exception=False)

        # Get the task
        task = await self.tasks_collection.find_one(
            {"_id": task_id_obj, "parent_id": parent_id_obj, "is_recurring": True}
        )
        if not task:
            return None

        # Get existing exceptions
        exceptions = task.get("exceptions", [])

        # Remove existing exception for this date if any
        exceptions = [e for e in exceptions if e.get("date") != exception_date]

        # Add new exception
        new_exception: Dict[str, Any] = {
            "date": exception_date,
            "type": exception_type,
        }
        if overrides:
            new_exception["overrides"] = overrides

        exceptions.append(new_exception)

        # Update task
        result = await self.tasks_collection.update_one(
            {"_id": task_id_obj},
            {"$set": {"exceptions": exceptions, "updated_at": utcnow()}},
        )

        if result.modified_count == 0:
            return None

        # Fetch and return updated task
        updated_doc = await self.tasks_collection.find_one({"_id": task_id_obj})
        return Task(**updated_doc) if updated_doc else None

    async def remove_recurrence_exception(
        self,
        task_id: str,
        parent_id: str,
        exception_date: str,
    ) -> Optional[Task]:
        """Remove an exception from a recurring task (restore deleted/modified occurrence).

        Args:
            task_id: Recurring task template's ObjectId as string
            parent_id: Parent's ObjectId as string (for authorization)
            exception_date: Date of the exception to remove (YYYY-MM-DD)

        Returns:
            Updated task template or None if not found/unauthorized
        """
        task_id_obj = validate_object_id(task_id, "task_id", raise_http_exception=False)
        parent_id_obj = validate_object_id(parent_id, "parent_id", raise_http_exception=False)

        # Get the task
        task = await self.tasks_collection.find_one(
            {"_id": task_id_obj, "parent_id": parent_id_obj, "is_recurring": True}
        )
        if not task:
            return None

        # Get existing exceptions and remove the one for this date
        exceptions = task.get("exceptions", [])
        exceptions = [e for e in exceptions if e.get("date") != exception_date]

        # Update task
        result = await self.tasks_collection.update_one(
            {"_id": task_id_obj},
            {"$set": {"exceptions": exceptions, "updated_at": utcnow()}},
        )

        if result.modified_count == 0:
            return None

        # Fetch and return updated task
        updated_doc = await self.tasks_collection.find_one({"_id": task_id_obj})
        return Task(**updated_doc) if updated_doc else None

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

    # DEPRECATED: Old pre-generation method - kept for reference
    # Use VirtualInstanceService.expand_recurring_task() instead
    async def _generate_recurring_instances_DEPRECATED(
        self, source_task_id: str, task_data, parent_id: str
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
                "is_in_pool": task_data.is_in_pool,
                "pool_usage_rules": task_data.pool_usage_rules.model_dump() if task_data.pool_usage_rules else None,
                "obligation_level": task_data.obligation_level.value if task_data.obligation_level else "optional",
                "priority_boost": task_data.priority_boost if task_data.priority_boost is not None else 0,
                "is_in_backlog": False,
                "concurrent_allowed": False,
                "status": "PENDING",
                "constraints": task_data.constraints.model_dump() if task_data.constraints else None,
                "pause_history": [],
                "current_pause": None,
                "attachments": [],
                "tools": [t.model_dump() for t in task_data.tools],
                "ai_attributes": None,
                "subtasks": [s.model_dump() for s in task_data.subtasks],
                "created_at": utcnow(),
                "updated_at": utcnow(),
                "started_at": None,
                "completed_at": None,
                "points_earned": None,
            }

            await self.tasks_collection.insert_one(instance_doc)
