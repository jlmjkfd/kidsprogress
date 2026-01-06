"""
Task Session Service

Manages work sessions for tasks with progress tracking and analytics.
Supports crash recovery, multi-device sync, and struggle detection.
"""
from datetime import datetime, date
from typing import Optional, List, Dict, Any
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from models.task_session import TaskSession
from models.base import PyObjectId
from utils.time_helpers import utcnow


class TaskSessionService:
    """Service for managing task work sessions."""

    def __init__(self, database: AsyncIOMotorDatabase):
        self.db = database
        self.collection = database.task_sessions

    async def start_session(
        self,
        task_id: PyObjectId,
        child_id: PyObjectId,
        scheduled_date: date,
        initial_progress: Optional[Dict[str, Any]] = None,
    ) -> TaskSession:
        """
        Start a new work session for a task.

        Args:
            task_id: The task ID (can be virtual or materialized)
            child_id: The child ID
            scheduled_date: The scheduled date for this occurrence
            initial_progress: Optional initial progress state

        Returns:
            Created TaskSession
        """
        session_data = {
            "_id": ObjectId(),
            "task_id": task_id,
            "completion_id": None,
            "child_id": child_id,
            "scheduled_date": scheduled_date,
            "started_at": utcnow(),
            "last_saved_at": utcnow(),
            "completed_at": None,
            "abandoned_at": None,
            "duration_minutes": None,
            "progress_state": initial_progress or {},
            "progress_snapshots": [],
            "pause_count": 0,
            "tool_switches": 0,
            "struggle_indicators": [],
        }

        await self.collection.insert_one(session_data)
        return TaskSession(**session_data)

    async def get_active_session(
        self, task_id: PyObjectId, scheduled_date: date
    ) -> Optional[TaskSession]:
        """
        Get the active (uncompleted/unabandoned) session for a task on a specific date.

        Args:
            task_id: The task ID
            scheduled_date: The scheduled date

        Returns:
            Active TaskSession or None
        """
        session_doc = await self.collection.find_one({
            "task_id": task_id,
            "scheduled_date": scheduled_date,
            "completed_at": None,
            "abandoned_at": None,
        })

        if not session_doc:
            return None

        return TaskSession(**session_doc)

    async def save_progress(
        self,
        session_id: PyObjectId,
        progress_state: Dict[str, Any],
        create_snapshot: bool = False,
    ) -> None:
        """
        Save progress for an active session.

        Args:
            session_id: The session ID
            progress_state: Updated progress state
            create_snapshot: Whether to create a snapshot of the progress
        """
        update_data = {
            "progress_state": progress_state,
            "last_saved_at": utcnow(),
        }

        if create_snapshot:
            snapshot = {
                "timestamp": utcnow(),
                "progress": progress_state,
            }
            await self.collection.update_one(
                {"_id": session_id},
                {
                    "$set": update_data,
                    "$push": {"progress_snapshots": snapshot},
                },
            )
        else:
            await self.collection.update_one(
                {"_id": session_id},
                {"$set": update_data},
            )

    async def complete_session(
        self,
        session_id: PyObjectId,
        completion_id: PyObjectId,
        final_progress: Optional[Dict[str, Any]] = None,
    ) -> None:
        """
        Mark a session as completed and link to completion record.

        Args:
            session_id: The session ID
            completion_id: The task completion ID
            final_progress: Optional final progress state
        """
        now = utcnow()
        session = await self.collection.find_one({"_id": session_id})

        if not session:
            return

        duration = int((now - session["started_at"]).total_seconds() / 60)

        update_data = {
            "completed_at": now,
            "completion_id": completion_id,
            "duration_minutes": duration,
        }

        if final_progress:
            update_data["progress_state"] = final_progress

        await self.collection.update_one(
            {"_id": session_id},
            {"$set": update_data},
        )

    async def abandon_session(
        self,
        session_id: PyObjectId,
        reason: Optional[str] = None,
    ) -> None:
        """
        Mark a session as abandoned (user stopped without completing).

        Args:
            session_id: The session ID
            reason: Optional reason for abandonment
        """
        now = utcnow()
        session = await self.collection.find_one({"_id": session_id})

        if not session:
            return

        duration = int((now - session["started_at"]).total_seconds() / 60)

        update_data = {
            "abandoned_at": now,
            "duration_minutes": duration,
        }

        # Store reason in struggle_indicators if provided
        if reason:
            await self.collection.update_one(
                {"_id": session_id},
                {
                    "$set": update_data,
                    "$push": {"struggle_indicators": f"abandoned: {reason}"},
                },
            )
        else:
            await self.collection.update_one(
                {"_id": session_id},
                {"$set": update_data},
            )

    async def record_pause(self, session_id: PyObjectId) -> None:
        """
        Increment pause counter for analytics.

        Args:
            session_id: The session ID
        """
        await self.collection.update_one(
            {"_id": session_id},
            {
                "$inc": {"pause_count": 1},
                "$set": {"last_saved_at": utcnow()},
            },
        )

    async def record_tool_switch(self, session_id: PyObjectId) -> None:
        """
        Increment tool switch counter for analytics.

        Args:
            session_id: The session ID
        """
        await self.collection.update_one(
            {"_id": session_id},
            {
                "$inc": {"tool_switches": 1},
                "$set": {"last_saved_at": utcnow()},
            },
        )

    async def add_struggle_indicator(
        self, session_id: PyObjectId, indicator: str
    ) -> None:
        """
        Add a struggle indicator for analytics.

        Args:
            session_id: The session ID
            indicator: Struggle indicator string (e.g., "undo_5_times", "help_requested")
        """
        await self.collection.update_one(
            {"_id": session_id},
            {
                "$push": {"struggle_indicators": indicator},
                "$set": {"last_saved_at": utcnow()},
            },
        )

    async def get_session_history(
        self,
        task_id: Optional[PyObjectId] = None,
        child_id: Optional[PyObjectId] = None,
        limit: int = 50,
    ) -> List[TaskSession]:
        """
        Get session history for a task or child.

        Args:
            task_id: Optional task ID to filter by
            child_id: Optional child ID to filter by
            limit: Maximum number of sessions to return

        Returns:
            List of TaskSession objects ordered by started_at DESC
        """
        query = {}
        if task_id:
            query["task_id"] = task_id
        if child_id:
            query["child_id"] = child_id

        cursor = self.collection.find(query).sort("started_at", -1).limit(limit)

        sessions = []
        async for session_doc in cursor:
            sessions.append(TaskSession(**session_doc))

        return sessions

    async def get_sessions_by_completion(
        self, completion_id: PyObjectId
    ) -> List[TaskSession]:
        """
        Get all sessions linked to a completion record.

        Args:
            completion_id: The completion ID

        Returns:
            List of TaskSession objects
        """
        cursor = self.collection.find({"completion_id": completion_id})

        sessions = []
        async for session_doc in cursor:
            sessions.append(TaskSession(**session_doc))

        return sessions

    async def delete_session(self, session_id: PyObjectId) -> bool:
        """
        Delete a session record.

        Args:
            session_id: The session ID to delete

        Returns:
            True if deleted, False if not found
        """
        result = await self.collection.delete_one({"_id": session_id})
        return result.deleted_count > 0
