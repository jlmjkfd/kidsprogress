"""
Subtask Service

Manages subtasks with hierarchical support and dependency tracking.
Enables complex task breakdown and workflow management.
"""
from datetime import datetime
from typing import Optional, List
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from backend.models.subtask import Subtask
from backend.models.common import PyObjectId
from backend.utils.datetime_utils import utcnow


class SubtaskService:
    """Service for managing subtasks."""

    def __init__(self, database: AsyncIOMotorDatabase):
        self.db = database
        self.collection = database.subtasks

    async def create_subtask(
        self,
        task_id: PyObjectId,
        title: str,
        order: int,
        description: Optional[str] = None,
        parent_subtask_id: Optional[PyObjectId] = None,
        depends_on: Optional[List[PyObjectId]] = None,
    ) -> Subtask:
        """
        Create a new subtask.

        Args:
            task_id: The parent task ID
            title: Subtask title
            order: Display order
            description: Optional description
            parent_subtask_id: Optional parent subtask for nesting
            depends_on: Optional list of subtask IDs this depends on

        Returns:
            Created Subtask
        """
        subtask_data = {
            "_id": ObjectId(),
            "task_id": task_id,
            "parent_subtask_id": parent_subtask_id,
            "title": title,
            "description": description,
            "order": order,
            "status": "pending",
            "completed_at": None,
            "completed_by": "CHILD",
            "depends_on": depends_on or [],
        }

        await self.collection.insert_one(subtask_data)
        return Subtask(**subtask_data)

    async def get_subtask(self, subtask_id: PyObjectId) -> Optional[Subtask]:
        """
        Get a subtask by ID.

        Args:
            subtask_id: The subtask ID

        Returns:
            Subtask or None
        """
        subtask_doc = await self.collection.find_one({"_id": subtask_id})

        if not subtask_doc:
            return None

        return Subtask(**subtask_doc)

    async def get_task_subtasks(
        self,
        task_id: PyObjectId,
        parent_subtask_id: Optional[PyObjectId] = None,
    ) -> List[Subtask]:
        """
        Get subtasks for a task, optionally filtered by parent.

        Args:
            task_id: The task ID
            parent_subtask_id: Optional parent subtask ID (None = root level)

        Returns:
            List of Subtask objects ordered by order field
        """
        query = {"task_id": task_id}

        if parent_subtask_id is None:
            # Get root-level subtasks only
            query["parent_subtask_id"] = None
        else:
            # Get children of specific subtask
            query["parent_subtask_id"] = parent_subtask_id

        cursor = self.collection.find(query).sort("order", 1)

        subtasks = []
        async for subtask_doc in cursor:
            subtasks.append(Subtask(**subtask_doc))

        return subtasks

    async def get_all_task_subtasks(self, task_id: PyObjectId) -> List[Subtask]:
        """
        Get all subtasks for a task (including nested).

        Args:
            task_id: The task ID

        Returns:
            List of all Subtask objects ordered by order field
        """
        cursor = self.collection.find({"task_id": task_id}).sort("order", 1)

        subtasks = []
        async for subtask_doc in cursor:
            subtasks.append(Subtask(**subtask_doc))

        return subtasks

    async def update_subtask(
        self,
        subtask_id: PyObjectId,
        title: Optional[str] = None,
        description: Optional[str] = None,
        order: Optional[int] = None,
    ) -> None:
        """
        Update subtask fields.

        Args:
            subtask_id: The subtask ID
            title: Optional new title
            description: Optional new description
            order: Optional new order
        """
        update_data = {}
        if title is not None:
            update_data["title"] = title
        if description is not None:
            update_data["description"] = description
        if order is not None:
            update_data["order"] = order

        if update_data:
            await self.collection.update_one(
                {"_id": subtask_id},
                {"$set": update_data},
            )

    async def complete_subtask(
        self,
        subtask_id: PyObjectId,
        completed_by: str = "CHILD",
    ) -> None:
        """
        Mark a subtask as completed.

        Args:
            subtask_id: The subtask ID
            completed_by: Who completed it ("CHILD" or "PARENT")
        """
        await self.collection.update_one(
            {"_id": subtask_id},
            {
                "$set": {
                    "status": "completed",
                    "completed_at": utcnow(),
                    "completed_by": completed_by,
                }
            },
        )

    async def uncomplete_subtask(self, subtask_id: PyObjectId) -> None:
        """
        Mark a subtask as not completed (undo completion).

        Args:
            subtask_id: The subtask ID
        """
        await self.collection.update_one(
            {"_id": subtask_id},
            {
                "$set": {
                    "status": "pending",
                    "completed_at": None,
                }
            },
        )

    async def reorder_subtasks(
        self, subtask_orders: List[tuple[PyObjectId, int]]
    ) -> None:
        """
        Reorder multiple subtasks in bulk.

        Args:
            subtask_orders: List of (subtask_id, new_order) tuples
        """
        for subtask_id, new_order in subtask_orders:
            await self.collection.update_one(
                {"_id": subtask_id},
                {"$set": {"order": new_order}},
            )

    async def get_completion_progress(self, task_id: PyObjectId) -> dict:
        """
        Get completion statistics for a task's subtasks.

        Args:
            task_id: The task ID

        Returns:
            Dict with total and completed counts
        """
        pipeline = [
            {"$match": {"task_id": task_id}},
            {
                "$group": {
                    "_id": None,
                    "total": {"$sum": 1},
                    "completed": {
                        "$sum": {"$cond": [{"$eq": ["$status", "completed"]}, 1, 0]}
                    },
                }
            },
        ]

        result = await self.collection.aggregate(pipeline).to_list(1)

        if result:
            return {
                "total": result[0]["total"],
                "completed": result[0]["completed"],
            }
        return {"total": 0, "completed": 0}

    async def check_dependencies_met(self, subtask_id: PyObjectId) -> bool:
        """
        Check if all dependencies for a subtask are completed.

        Args:
            subtask_id: The subtask ID

        Returns:
            True if all dependencies are completed or no dependencies
        """
        subtask = await self.get_subtask(subtask_id)

        if not subtask or not subtask.depends_on:
            return True

        # Check if all dependency subtasks are completed
        for dep_id in subtask.depends_on:
            dep_subtask = await self.get_subtask(dep_id)
            if not dep_subtask or dep_subtask.status != "completed":
                return False

        return True

    async def delete_subtask(self, subtask_id: PyObjectId) -> bool:
        """
        Delete a subtask.

        Args:
            subtask_id: The subtask ID to delete

        Returns:
            True if deleted, False if not found
        """
        result = await self.collection.delete_one({"_id": subtask_id})
        return result.deleted_count > 0

    async def delete_task_subtasks(self, task_id: PyObjectId) -> int:
        """
        Delete all subtasks for a task.

        Args:
            task_id: The task ID

        Returns:
            Number of subtasks deleted
        """
        result = await self.collection.delete_many({"task_id": task_id})
        return result.deleted_count
