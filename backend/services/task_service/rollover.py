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

    async def rollover_task(self, task_id: str, new_date: datetime) -> Optional[Task]:
        """Rollover an incomplete task to a new date.

        Args:
            task_id: Task's ObjectId as string
            new_date: New scheduled date

        Returns:
            Updated task or None if not found
        """
        task_id_obj = validate_object_id(task_id, "task_id", raise_http_exception=False)

        existing = await self.tasks_collection.find_one({"_id": task_id_obj})
        if not existing:
            return None

        # Set original_date if first rollover
        original_date = existing.get("original_date")
        if not original_date:
            original_date = existing.get("scheduled_date")

        rollover_count = existing.get("rollover_count", 0) + 1

        result = await self.tasks_collection.find_one_and_update(
            {"_id": task_id_obj},
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

    async def process_overdue_tasks(self, child_id: str, date: datetime) -> dict:
        """Process overdue tasks at end of day: skip should_do/optional, rollover must_do.

        Args:
            child_id: Child's ObjectId as string
            date: The date that just ended (tasks scheduled for this date)

        Returns:
            Dict with counts of skipped and rolled over tasks
        """
        # Get incomplete tasks for the specified date
        query = {
            "child_id": ObjectId(child_id),
            "status": {"$in": [TaskStatus.PENDING.value, TaskStatus.IN_PROGRESS.value, TaskStatus.PAUSED.value]},
            "is_virtual": {"$ne": True},  # Don't process virtual instances
        }
        query.update(date_range_query("scheduled_date", date.date(), date.date()))

        incomplete_tasks = await self.tasks_collection.find(query).to_list(None)

        skipped_count = 0
        rollover_count = 0

        for task_doc in incomplete_tasks:
            task = Task(**task_doc)

            # Skip must_do tasks - they will be rolled over to next day
            if task.obligation_level == ObligationLevel.MUST_DO:
                # Rollover to next day
                next_day = date + timedelta(days=1)
                await self.rollover_task(str(task.id), next_day)
                rollover_count += 1
            else:
                # Mark should_do and optional tasks as skipped
                await self.tasks_collection.update_one(
                    {"_id": task.id},
                    {
                        "$set": {
                            "status": TaskStatus.SKIPPED.value,
                            "updated_at": utcnow(),
                        }
                    }
                )
                skipped_count += 1

        return {
            "skipped": skipped_count,
            "rolled_over": rollover_count,
        }
