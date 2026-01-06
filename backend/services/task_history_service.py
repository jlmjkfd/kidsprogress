"""
Task History Service

Manages audit trail for all task changes.
Supports accountability, undo capability, and analytics on modifications.
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from models.task_history import TaskHistory
from models.base import PyObjectId
from utils.time_helpers import utcnow


class TaskHistoryService:
    """Service for managing task change history."""

    def __init__(self, database: AsyncIOMotorDatabase):
        self.db = database
        self.collection = database.task_history

    async def record_change(
        self,
        task_id: PyObjectId,
        changed_by: PyObjectId,
        changed_by_type: str,
        change_type: str,
        changes: Dict[str, Any],
        reason: Optional[str] = None,
        client_info: Optional[Dict[str, str]] = None,
    ) -> TaskHistory:
        """
        Record a task change.

        Args:
            task_id: The task ID
            changed_by: User ID who made the change (parent_id or child_id)
            changed_by_type: "PARENT" or "CHILD"
            change_type: Type of change ("created", "edited", "status_changed", "deleted", "pattern_changed")
            changes: Dict of field changes (e.g., {"title": {"old": "A", "new": "B"}})
            reason: Optional reason for the change
            client_info: Optional client metadata (device, app version, etc.)

        Returns:
            Created TaskHistory record
        """
        history_data = {
            "_id": ObjectId(),
            "task_id": task_id,
            "changed_at": utcnow(),
            "changed_by": changed_by,
            "changed_by_type": changed_by_type,
            "change_type": change_type,
            "changes": changes,
            "reason": reason,
            "client_info": client_info,
        }

        await self.collection.insert_one(history_data)
        return TaskHistory(**history_data)

    async def get_task_history(
        self,
        task_id: PyObjectId,
        limit: int = 100,
    ) -> List[TaskHistory]:
        """
        Get change history for a task.

        Args:
            task_id: The task ID
            limit: Maximum number of records to return

        Returns:
            List of TaskHistory objects ordered by changed_at DESC
        """
        cursor = self.collection.find({"task_id": task_id}).sort("changed_at", -1).limit(limit)

        history = []
        async for history_doc in cursor:
            history.append(TaskHistory(**history_doc))

        return history

    async def get_user_activity(
        self,
        changed_by: PyObjectId,
        changed_by_type: Optional[str] = None,
        limit: int = 100,
    ) -> List[TaskHistory]:
        """
        Get all changes made by a specific user.

        Args:
            changed_by: User ID (parent_id or child_id)
            changed_by_type: Optional filter by "PARENT" or "CHILD"
            limit: Maximum number of records to return

        Returns:
            List of TaskHistory objects ordered by changed_at DESC
        """
        query = {"changed_by": changed_by}
        if changed_by_type:
            query["changed_by_type"] = changed_by_type

        cursor = self.collection.find(query).sort("changed_at", -1).limit(limit)

        history = []
        async for history_doc in cursor:
            history.append(TaskHistory(**history_doc))

        return history

    async def get_changes_by_type(
        self,
        task_id: Optional[PyObjectId] = None,
        change_type: Optional[str] = None,
        limit: int = 100,
    ) -> List[TaskHistory]:
        """
        Get changes filtered by type.

        Args:
            task_id: Optional task ID to filter by
            change_type: Optional change type to filter by
            limit: Maximum number of records to return

        Returns:
            List of TaskHistory objects ordered by changed_at DESC
        """
        query = {}
        if task_id:
            query["task_id"] = task_id
        if change_type:
            query["change_type"] = change_type

        cursor = self.collection.find(query).sort("changed_at", -1).limit(limit)

        history = []
        async for history_doc in cursor:
            history.append(TaskHistory(**history_doc))

        return history

    async def get_recent_changes(
        self,
        child_id: Optional[PyObjectId] = None,
        limit: int = 50,
    ) -> List[TaskHistory]:
        """
        Get recent changes across all tasks, optionally filtered by child.

        Args:
            child_id: Optional child ID to filter task changes
            limit: Maximum number of records to return

        Returns:
            List of TaskHistory objects ordered by changed_at DESC
        """
        if child_id:
            # Need to join with tasks to filter by child_id
            # For now, get all and filter in application layer
            # TODO: Optimize with aggregation pipeline
            cursor = self.collection.find({}).sort("changed_at", -1).limit(limit * 2)

            history = []
            async for history_doc in cursor:
                # Verify task belongs to child
                task = await self.db.tasks.find_one({"_id": history_doc["task_id"]})
                if task and task.get("child_id") == child_id:
                    history.append(TaskHistory(**history_doc))
                    if len(history) >= limit:
                        break
        else:
            cursor = self.collection.find({}).sort("changed_at", -1).limit(limit)
            history = []
            async for history_doc in cursor:
                history.append(TaskHistory(**history_doc))

        return history

    async def get_pattern_changes(
        self, task_id: PyObjectId
    ) -> List[TaskHistory]:
        """
        Get all pattern change history for a recurring task.

        Args:
            task_id: The task ID

        Returns:
            List of TaskHistory objects for pattern changes
        """
        cursor = self.collection.find({
            "task_id": task_id,
            "change_type": "pattern_changed",
        }).sort("changed_at", -1)

        history = []
        async for history_doc in cursor:
            history.append(TaskHistory(**history_doc))

        return history

    async def delete_history_entry(self, history_id: PyObjectId) -> bool:
        """
        Delete a specific history entry (admin only).

        Args:
            history_id: The history entry ID to delete

        Returns:
            True if deleted, False if not found
        """
        result = await self.collection.delete_one({"_id": history_id})
        return result.deleted_count > 0

    async def delete_task_history(self, task_id: PyObjectId) -> int:
        """
        Delete all history for a task (when task is permanently deleted).

        Args:
            task_id: The task ID

        Returns:
            Number of history entries deleted
        """
        result = await self.collection.delete_many({"task_id": task_id})
        return result.deleted_count

    async def get_statistics(
        self,
        task_id: Optional[PyObjectId] = None,
        changed_by: Optional[PyObjectId] = None,
    ) -> Dict[str, int]:
        """
        Get change statistics.

        Args:
            task_id: Optional task ID to filter by
            changed_by: Optional user ID to filter by

        Returns:
            Dict with counts by change_type
        """
        match_stage = {}
        if task_id:
            match_stage["task_id"] = task_id
        if changed_by:
            match_stage["changed_by"] = changed_by

        pipeline = [
            {"$match": match_stage} if match_stage else {"$match": {}},
            {
                "$group": {
                    "_id": "$change_type",
                    "count": {"$sum": 1},
                }
            },
        ]

        results = await self.collection.aggregate(pipeline).to_list(None)

        stats = {}
        for result in results:
            stats[result["_id"]] = result["count"]

        return stats
