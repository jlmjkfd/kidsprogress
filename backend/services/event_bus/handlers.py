"""Event handlers for task lifecycle events.

Handlers perform side effects in response to domain events, keeping
the main business logic decoupled and testable.
"""

import logging
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from backend.services.event_bus.events import (
    TaskStarted, TaskCompleted, TaskPaused, TaskResumed, TaskSkipped
)

logger = logging.getLogger(__name__)


class SessionHandler:
    """Handles session-related side effects for task events."""

    def __init__(self, db: AsyncIOMotorDatabase):
        """Initialize handler with database access.

        Args:
            db: MongoDB database instance
        """
        self.sessions_collection = db.active_task_sessions

    async def on_task_started(self, event: TaskStarted) -> None:
        """Create active session when task starts.

        Args:
            event: TaskStarted event

        Raises:
            Exception: If session creation fails
        """
        try:
            await self.sessions_collection.insert_one({
                "task_id": ObjectId(event.task_id),
                "child_id": ObjectId(event.child_id),
                "started_at": event.timestamp,
            })
            logger.info(f"Created session for task {event.task_id}")
        except Exception as e:
            logger.error(f"Failed to create session for task {event.task_id}: {e}")
            raise

    async def on_task_completed(self, event: TaskCompleted) -> None:
        """Remove active session when task completes.

        Args:
            event: TaskCompleted event

        Raises:
            Exception: If session removal fails
        """
        try:
            result = await self.sessions_collection.delete_one({
                "task_id": ObjectId(event.task_id)
            })
            logger.info(
                f"Removed session for task {event.task_id} "
                f"(deleted: {result.deleted_count})"
            )
        except Exception as e:
            logger.error(f"Failed to remove session for task {event.task_id}: {e}")
            raise

    async def on_task_paused(self, event: TaskPaused) -> None:
        """Remove active session when task is paused.

        Args:
            event: TaskPaused event

        Raises:
            Exception: If session removal fails
        """
        try:
            result = await self.sessions_collection.delete_one({
                "task_id": ObjectId(event.task_id)
            })
            logger.info(
                f"Removed session for task {event.task_id} (paused) "
                f"(deleted: {result.deleted_count})"
            )
        except Exception as e:
            logger.error(f"Failed to remove session for task {event.task_id}: {e}")
            raise

    async def on_task_resumed(self, event: TaskResumed) -> None:
        """Create active session when task is resumed.

        Args:
            event: TaskResumed event

        Raises:
            Exception: If session creation fails
        """
        try:
            await self.sessions_collection.insert_one({
                "task_id": ObjectId(event.task_id),
                "child_id": ObjectId(event.child_id),
                "started_at": event.timestamp,
            })
            logger.info(f"Created session for resumed task {event.task_id}")
        except Exception as e:
            logger.error(f"Failed to create session for resumed task {event.task_id}: {e}")
            raise

    async def on_task_skipped(self, event: TaskSkipped) -> None:
        """Remove active session when task is skipped.

        Args:
            event: TaskSkipped event

        Raises:
            Exception: If session removal fails
        """
        try:
            result = await self.sessions_collection.delete_one({
                "task_id": ObjectId(event.task_id)
            })
            logger.info(
                f"Removed session for task {event.task_id} (skipped) "
                f"(deleted: {result.deleted_count})"
            )
        except Exception as e:
            logger.error(f"Failed to remove session for task {event.task_id}: {e}")
            raise


class NotificationHandler:
    """Handles notification side effects (placeholder for future implementation)."""

    async def on_task_completed(self, event: TaskCompleted) -> None:
        """Send notification when task completes.

        Args:
            event: TaskCompleted event

        Note:
            Placeholder for future notification implementation.
        """
        logger.info(f"Would send notification for completed task {event.task_id}")


class AnalyticsHandler:
    """Handles analytics side effects (placeholder for future implementation)."""

    async def on_task_completed(self, event: TaskCompleted) -> None:
        """Track completion metrics.

        Args:
            event: TaskCompleted event

        Note:
            Placeholder for future analytics implementation.
        """
        logger.info(f"Would track analytics for completed task {event.task_id}")
