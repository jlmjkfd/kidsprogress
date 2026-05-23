"""Event handlers for task lifecycle events.

Handlers perform side effects in response to domain events, keeping
the main business logic decoupled and testable.
"""

import logging
from backend.services.event_bus.events import TaskCompleted

logger = logging.getLogger(__name__)


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
