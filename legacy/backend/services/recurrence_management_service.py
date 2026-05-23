"""Service for managing recurring task patterns and exceptions."""
from typing import Optional, Dict, Any, List
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from datetime import datetime, date, timedelta

from backend.models.task import Task
from backend.utils.validators import validate_object_id
from backend.utils.datetime_utils import utcnow


class RecurrenceManagementService:
    """Service for managing recurring task patterns, exceptions, and RRULE expansion."""

    def __init__(self, db: AsyncIOMotorDatabase, school_calendar_service=None):
        self.db = db
        self.tasks_collection = db.tasks
        self.school_calendar_service = school_calendar_service

    async def expand_recurrence(
        self, child_id: str, rrule: str, start_date: datetime
    ) -> list[str]:
        """
        Expand an RRULE into a list of date strings.

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

        # For standard RRULEs, use basic expansion
        return await self._expand_standard_rrule(rrule, start_date_str)

    async def _expand_standard_rrule(self, rrule: str, start_date_str: str) -> list[str]:
        """
        Basic RRULE expansion for standard patterns.

        Args:
            rrule: RRULE string
            start_date_str: Start date in ISO format (YYYY-MM-DD)

        Returns:
            List of ISO date strings
        """
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

    async def add_exception(
        self,
        task_id: str,
        parent_id: str,
        exception_date: str,
        exception_type: str,
        overrides: Optional[Dict[str, Any]] = None,
    ) -> Optional[Task]:
        """
        Add an exception to a recurring task (for editing/deleting single occurrence).

        Args:
            task_id: Recurring task template's ObjectId as string
            parent_id: Parent's ObjectId as string (for authorization)
            exception_date: Date of the exception (YYYY-MM-DD)
            exception_type: "deleted", "modified", or "materialized"
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

    async def remove_exception(
        self,
        task_id: str,
        parent_id: str,
        exception_date: str,
    ) -> Optional[Task]:
        """
        Remove an exception from a recurring task (restore deleted/modified occurrence).

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
