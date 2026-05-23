"""Task repository for database operations."""
from typing import Optional, List, Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from datetime import date

from backend.repositories.base_repository import BaseRepository
from backend.utils.validators import validate_object_id
from backend.utils.query_builders import date_range_query


class TaskRepository(BaseRepository):
    """Repository for task-related database operations."""

    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "tasks")

    async def find_by_child(
        self,
        child_id: str,
        parent_id: str,
        status: Optional[str] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        is_recurring: Optional[bool] = None,
    ) -> List[Dict[str, Any]]:
        """
        Find tasks for a child.

        Args:
            child_id: Child ID
            parent_id: Parent ID (for authorization)
            status: Optional status filter
            start_date: Optional start date filter
            end_date: Optional end date filter
            is_recurring: Optional filter for recurring tasks

        Returns:
            List of task documents
        """
        child_id_obj = validate_object_id(child_id, "child_id", raise_http_exception=False)
        parent_id_obj = validate_object_id(parent_id, "parent_id", raise_http_exception=False)

        query: Dict[str, Any] = {
            "child_id": child_id_obj,
            "parent_id": parent_id_obj,
        }

        if status:
            query["status"] = status

        if is_recurring is not None:
            query["is_recurring"] = is_recurring

        if start_date or end_date:
            query.update(date_range_query("scheduled_date", start_date, end_date))

        return await self.find_many(query, sort=[("scheduled_date", 1)])

    async def find_by_collection(
        self,
        collection_id: str,
        parent_id: str,
        status: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Find tasks in a collection.

        Args:
            collection_id: Collection ID
            parent_id: Parent ID (for authorization)
            status: Optional status filter

        Returns:
            List of task documents
        """
        collection_id_obj = validate_object_id(collection_id, "collection_id", raise_http_exception=False)
        parent_id_obj = validate_object_id(parent_id, "parent_id", raise_http_exception=False)

        query: Dict[str, Any] = {
            "collection_id": collection_id_obj,
            "parent_id": parent_id_obj,
        }

        if status:
            query["status"] = status

        return await self.find_many(query, sort=[("created_at", -1)])

    async def find_recurring_templates(
        self,
        child_id: str,
        parent_id: str,
    ) -> List[Dict[str, Any]]:
        """
        Find all recurring task templates for a child.

        Args:
            child_id: Child ID
            parent_id: Parent ID

        Returns:
            List of recurring task template documents
        """
        child_id_obj = validate_object_id(child_id, "child_id", raise_http_exception=False)
        parent_id_obj = validate_object_id(parent_id, "parent_id", raise_http_exception=False)

        query = {
            "child_id": child_id_obj,
            "parent_id": parent_id_obj,
            "is_recurring": True,
        }

        return await self.find_many(query)

    async def find_incomplete_for_date(
        self,
        child_id: str,
        target_date: date,
        statuses: List[str],
    ) -> List[Dict[str, Any]]:
        """
        Find incomplete tasks for a specific date.

        Args:
            child_id: Child ID
            target_date: Date to check
            statuses: List of statuses to include

        Returns:
            List of incomplete task documents
        """
        child_id_obj = validate_object_id(child_id, "child_id", raise_http_exception=False)

        query = {
            "child_id": child_id_obj,
            "status": {"$in": statuses},
            "is_virtual": {"$ne": True},
        }
        query.update(date_range_query("scheduled_date", target_date, target_date))

        return await self.find_many(query)

    async def add_recurrence_exception(
        self,
        task_id: str,
        exception_date: str,
        exception_type: str,
        overrides: Optional[Dict[str, Any]] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Add an exception to a recurring task template.

        Args:
            task_id: Task template ID
            exception_date: Date of exception (YYYY-MM-DD)
            exception_type: "deleted" or "modified" or "materialized"
            overrides: Optional field overrides for "modified" type

        Returns:
            Updated task document or None
        """
        task_id_obj = validate_object_id(task_id, "task_id", raise_http_exception=False)

        # Build exception object
        exception = {
            "date": exception_date,
            "type": exception_type,
        }
        if overrides:
            exception["overrides"] = overrides

        # Get existing task to check exceptions
        task = await self.find_by_id(task_id)
        if not task or not task.get("is_recurring"):
            return None

        # Remove any existing exception for this date
        existing_exceptions = task.get("exceptions", [])
        filtered_exceptions = [e for e in existing_exceptions if e.get("date") != exception_date]
        filtered_exceptions.append(exception)

        # Update task
        update = {"$set": {"exceptions": filtered_exceptions}}
        return await self.update_by_id(task_id, update, return_document=True)

    async def remove_recurrence_exception(
        self,
        task_id: str,
        exception_date: str,
    ) -> Optional[Dict[str, Any]]:
        """
        Remove an exception from a recurring task template.

        Args:
            task_id: Task template ID
            exception_date: Date of exception to remove (YYYY-MM-DD)

        Returns:
            Updated task document or None
        """
        task_id_obj = validate_object_id(task_id, "task_id", raise_http_exception=False)

        # Get existing task
        task = await self.find_by_id(task_id)
        if not task or not task.get("is_recurring"):
            return None

        # Remove exception for this date
        existing_exceptions = task.get("exceptions", [])
        filtered_exceptions = [e for e in existing_exceptions if e.get("date") != exception_date]

        # Update task
        update = {"$set": {"exceptions": filtered_exceptions}}
        return await self.update_by_id(task_id, update, return_document=True)
