"""Task rollover and backlog management."""
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from datetime import datetime, timedelta

from backend.models.task import Task, TaskStatus, ObligationLevel
from backend.utils.datetime_utils import utcnow
from backend.utils.validators import validate_object_id
from backend.utils.query_builders import date_range_query


class TaskRollover:
    """Manages task rollover and backlog operations."""

    def __init__(self, db: AsyncIOMotorDatabase):
        """Initialize rollover component.

        Args:
            db: MongoDB database instance
        """
        self.db = db
        self.tasks_collection = db.tasks


    async def move_to_backlog(self, task_id: str) -> Optional[Task]:
        """Move a task to backlog after too many rollovers.

        Args:
            task_id: Task's ObjectId as string

        Returns:
            Updated task or None if not found
        """
        task_id_obj = validate_object_id(task_id, "task_id", raise_http_exception=False)

        result = await self.tasks_collection.find_one_and_update(
            {"_id": task_id_obj},
            {
                "$set": {
                    "is_in_backlog": True,
                    "status": TaskStatus.PENDING.value,  # Keep scheduled for later activation
                    "updated_at": utcnow(),
                }
            },
            return_document=True,
        )

        return Task(**result) if result else None

