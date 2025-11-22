"""Service for managing active task sessions."""
from typing import List, Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from backend.utils.validators import validate_object_id
from backend.utils.datetime_utils import utcnow


class ActiveSessionService:
    """Service for tracking currently active (in-progress) task sessions."""

    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.sessions_collection = db.active_task_sessions
        self.tasks_collection = db.tasks

    async def create_session(self, task_id: str, child_id: str) -> None:
        """
        Create an active session for a task.

        Args:
            task_id: Task ID
            child_id: Child ID
        """
        task_id_obj = validate_object_id(task_id, "task_id", raise_http_exception=False)
        child_id_obj = validate_object_id(child_id, "child_id", raise_http_exception=False)

        await self.sessions_collection.insert_one({
            "task_id": task_id_obj,
            "child_id": child_id_obj,
            "created_at": utcnow(),
        })

    async def remove_session(self, task_id: str) -> None:
        """
        Remove an active session for a task.

        Args:
            task_id: Task ID
        """
        task_id_obj = validate_object_id(task_id, "task_id", raise_http_exception=False)
        await self.sessions_collection.delete_one({"task_id": task_id_obj})

    async def get_sessions(self, child_id: str) -> List[dict]:
        """
        Get all active sessions for a child.

        Args:
            child_id: Child ID

        Returns:
            List of active session documents
        """
        child_id_obj = validate_object_id(child_id, "child_id", raise_http_exception=False)
        cursor = self.sessions_collection.find({"child_id": child_id_obj})
        return await cursor.to_list(length=None)

    async def get_active_tasks(self, child_id: str) -> List[dict]:
        """
        Get all active tasks (with session info) for a child.

        Args:
            child_id: Child ID

        Returns:
            List of active task documents with session information
        """
        child_id_obj = validate_object_id(child_id, "child_id", raise_http_exception=False)

        sessions = await self.get_sessions(str(child_id_obj))
        if not sessions:
            return []

        task_ids = [s["task_id"] for s in sessions]
        cursor = self.tasks_collection.find({"_id": {"$in": task_ids}})
        tasks = await cursor.to_list(length=None)

        # Merge session info into tasks
        task_dict = {str(t["_id"]): t for t in tasks}
        result = []
        for session in sessions:
            task_id_str = str(session["task_id"])
            if task_id_str in task_dict:
                task = task_dict[task_id_str].copy()
                task["session_created_at"] = session.get("created_at")
                result.append(task)

        return result

    async def validate_concurrent_tasks(self, task_id: str, child_id: str) -> dict:
        """
        Validate if starting this task would create concurrent task conflicts.

        Args:
            task_id: Task ID being started
            child_id: Child ID

        Returns:
            Dict with:
                - can_start: bool (always True for now)
                - warning: optional warning message about concurrent tasks
        """
        task_id_obj = validate_object_id(task_id, "task_id", raise_http_exception=False)
        child_id_obj = validate_object_id(child_id, "child_id", raise_http_exception=False)

        # Get current task
        current_task = await self.tasks_collection.find_one({"_id": task_id_obj})
        if not current_task:
            return {"can_start": True}

        # Get active tasks
        active_tasks = await self.get_active_tasks(str(child_id_obj))

        # Check if there are any active tasks
        if not active_tasks:
            return {"can_start": True}

        # For now, just warn but allow concurrent tasks
        active_titles = [t.get("title", "Untitled") for t in active_tasks]
        warning = f"Note: Child has {len(active_tasks)} active task(s): {', '.join(active_titles)}"

        return {
            "can_start": True,
            "warning": warning,
        }
