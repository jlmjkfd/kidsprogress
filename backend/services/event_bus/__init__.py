"""Event bus for domain events.

This module provides a simple async event bus for publishing and handling
domain events. Events decouple task lifecycle operations from side effects
like session management, notifications, and analytics.

Example:
    # Subscribe handler
    bus = get_event_bus()
    bus.subscribe(TaskStarted, session_handler.on_task_started)

    # Publish event
    event = TaskStarted(task_id="123", child_id="456", ...)
    await bus.publish(event)
"""

from typing import Dict, List, Callable, Awaitable, Type, Any
import logging

logger = logging.getLogger(__name__)

# Type alias for event handlers
EventHandler = Callable[[Any], Awaitable[None]]


class EventBus:
    """Simple async event bus for domain events.

    Provides pub/sub pattern for decoupling task operations from side effects.
    Handlers are executed in order and failures are isolated.
    """

    def __init__(self):
        """Initialize event bus with empty handler registry."""
        self._handlers: Dict[Type, List[EventHandler]] = {}

    def subscribe(self, event_type: Type, handler: EventHandler) -> None:
        """Subscribe a handler to an event type.

        Args:
            event_type: Event class to subscribe to
            handler: Async function that handles the event

        Example:
            bus.subscribe(TaskStarted, lambda event: handle_start(event))
        """
        if event_type not in self._handlers:
            self._handlers[event_type] = []

        self._handlers[event_type].append(handler)
        logger.info(f"Subscribed {handler.__name__} to {event_type.__name__}")

    async def publish(self, event: Any) -> None:
        """Publish an event to all subscribed handlers.

        Args:
            event: Event instance to publish

        Note:
            Handler failures are logged but don't affect other handlers.
            All handlers execute even if some fail.
        """
        event_type = type(event)
        handlers = self._handlers.get(event_type, [])

        if not handlers:
            logger.debug(f"No handlers for event {event_type.__name__}")
            return

        logger.debug(f"Publishing {event_type.__name__} to {len(handlers)} handlers")

        # Execute all handlers, isolating failures
        for handler in handlers:
            try:
                await handler(event)
            except Exception as e:
                logger.error(
                    f"Handler {handler.__name__} failed for {event_type.__name__}: {e}",
                    exc_info=True
                )
                # Don't re-raise - let other handlers execute

    def clear_handlers(self, event_type: Type = None) -> None:
        """Clear handlers for testing.

        Args:
            event_type: Specific event type to clear, or None for all
        """
        if event_type:
            self._handlers.pop(event_type, None)
        else:
            self._handlers.clear()


# Global event bus instance
_event_bus = EventBus()


def get_event_bus() -> EventBus:
    """Get the global event bus instance.

    Returns:
        Singleton EventBus instance
    """
    return _event_bus
