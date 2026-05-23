"""Strategy for real database tasks."""

from typing import Optional
from bson import ObjectId
from backend.models.task import Task
from backend.models.task_identifier import TaskIdentifier
from backend.services.task_service.strategies import TaskStrategy
from backend.utils.validators import validate_object_id


class RealTaskStrategy(TaskStrategy):
    """Strategy for real database tasks (stored in MongoDB)."""

    async def get_task(
        self, identifier: TaskIdentifier, parent_id: str
    ) -> Optional[Task]:
        """Get real task from database by ObjectId.

        Args:
            identifier: TaskIdentifier (must be real, not virtual)
            parent_id: Parent's ObjectId as string

        Returns:
            Task from database or None if not found
        """
        if not identifier.is_real:
            return None

        task_id_obj = validate_object_id(identifier.raw_id, "task_id", raise_http_exception=False)
        parent_id_obj = validate_object_id(parent_id, "parent_id", raise_http_exception=False)

        doc = await self.tasks_collection.find_one({
            "_id": task_id_obj,
            "$or": [{"parent_id": parent_id_obj}, {"parent_id": parent_id}]
        })

        if not doc:
            return None

        return Task(**doc)

    async def delete_task(
        self, identifier: TaskIdentifier, parent_id: str, recurrence_service
    ) -> bool:
        """Delete real task from database.

        Args:
            identifier: TaskIdentifier (must be real, not virtual)
            parent_id: Parent's ObjectId as string
            recurrence_service: Not used for real tasks

        Returns:
            True if deleted, False if not found
        """
        if not identifier.is_real:
            return False

        task_id_obj = validate_object_id(identifier.raw_id, "task_id", raise_http_exception=False)
        parent_id_obj = validate_object_id(parent_id, "parent_id", raise_http_exception=False)

        result = await self.tasks_collection.delete_one({
            "_id": task_id_obj,
            "$or": [{"parent_id": parent_id_obj}, {"parent_id": parent_id}]
        })

        return result.deleted_count > 0
