"""Active task session management."""
from typing import List
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from backend.utils.datetime_utils import utcnow


class TaskSession:
    """Manages active task sessions."""

    def __init__(self, db: AsyncIOMotorDatabase):
        """Initialize session component.

        Args:
            db: MongoDB database instance
        """
        self.db = db
        self.sessions_collection = db.active_task_sessions
        self.tasks_collection = db.tasks

    async def create_session(self, task_id: str, child_id: str) -> None:
        """Create an active task session.

        Args:
            task_id: Task's ObjectId as string
            child_id: Child's ObjectId as string
        """
        session_doc = {
            "child_id": ObjectId(child_id),
            "task_id": ObjectId(task_id),
            "started_at": utcnow(),
            "last_activity": utcnow(),
            "tools_in_use": [],
        }
        await self.sessions_collection.insert_one(session_doc)

    async def remove_session(self, task_id: str) -> None:
        """Remove an active task session.

        Args:
            task_id: Task's ObjectId as string
        """
        await self.sessions_collection.delete_one({"task_id": ObjectId(task_id)})

    async def get_sessions(self, child_id: str) -> List[dict]:
        """Get all active sessions for a child.

        Args:
            child_id: Child's ObjectId as string

        Returns:
            List of session documents
        """
        cursor = self.sessions_collection.find({"child_id": ObjectId(child_id)})
        sessions = []
        async for doc in cursor:
            sessions.append(doc)
        return sessions

    async def get_active_tasks(self, child_id: str) -> List[dict]:
        """Get all active tasks for a child (for concurrent task warning).

        Args:
            child_id: Child's ObjectId as string

        Returns:
            List of dicts with task info and session info
        """
        from backend.utils.validators import validate_object_id

        child_id_obj = validate_object_id(child_id, "child_id", raise_http_exception=False)

        sessions = await self.get_sessions(child_id)
        active_tasks = []

        for session in sessions:
            task = await self.tasks_collection.find_one({"_id": session["task_id"]})
            if task:
                active_tasks.append(
                    {
                        "task_id": str(task["_id"]),
                        "title": task["title"],
                        "started_at": session["started_at"].isoformat(),
                        "last_activity": session["last_activity"].isoformat(),
                    }
                )

        return active_tasks
