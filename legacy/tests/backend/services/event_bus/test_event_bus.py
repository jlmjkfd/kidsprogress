"""Tests for EventBus."""

import pytest
from dataclasses import dataclass
from backend.services.event_bus import EventBus


@dataclass
class TestEvent:
    """Test event for testing."""
    message: str


@dataclass
class AnotherTestEvent:
    """Another test event."""
    value: int


class TestEventBus:
    """Test EventBus functionality."""

    @pytest.fixture
    def bus(self):
        """Create fresh event bus for each test."""
        bus = EventBus()
        yield bus
        bus.clear_handlers()

    @pytest.mark.asyncio
    async def test_subscribe_and_publish(self, bus):
        """Handler should be called when event is published."""
        called = False
        received_event = None

        async def handler(event: TestEvent):
            nonlocal called, received_event
            called = True
            received_event = event

        bus.subscribe(TestEvent, handler)
        await bus.publish(TestEvent(message="test"))

        assert called
        assert received_event.message == "test"

    @pytest.mark.asyncio
    async def test_multiple_handlers(self, bus):
        """Multiple handlers should all be called."""
        call_count = 0

        async def handler1(event: TestEvent):
            nonlocal call_count
            call_count += 1

        async def handler2(event: TestEvent):
            nonlocal call_count
            call_count += 1

        bus.subscribe(TestEvent, handler1)
        bus.subscribe(TestEvent, handler2)
        await bus.publish(TestEvent(message="test"))

        assert call_count == 2

    @pytest.mark.asyncio
    async def test_handler_execution_order(self, bus):
        """Handlers should execute in subscription order."""
        execution_order = []

        async def handler1(event: TestEvent):
            execution_order.append(1)

        async def handler2(event: TestEvent):
            execution_order.append(2)

        async def handler3(event: TestEvent):
            execution_order.append(3)

        bus.subscribe(TestEvent, handler1)
        bus.subscribe(TestEvent, handler2)
        bus.subscribe(TestEvent, handler3)
        await bus.publish(TestEvent(message="test"))

        assert execution_order == [1, 2, 3]

    @pytest.mark.asyncio
    async def test_handler_failure_isolated(self, bus):
        """Handler failure should not affect other handlers."""
        handler2_called = False

        async def failing_handler(event: TestEvent):
            raise ValueError("Handler failed")

        async def handler2(event: TestEvent):
            nonlocal handler2_called
            handler2_called = True

        bus.subscribe(TestEvent, failing_handler)
        bus.subscribe(TestEvent, handler2)

        # Should not raise exception
        await bus.publish(TestEvent(message="test"))

        # Handler 2 should still be called despite handler 1 failing
        assert handler2_called

    @pytest.mark.asyncio
    async def test_no_handlers_for_event(self, bus):
        """Publishing event with no handlers should not error."""
        # Should not raise exception
        await bus.publish(TestEvent(message="test"))

    @pytest.mark.asyncio
    async def test_different_event_types(self, bus):
        """Different event types should have separate handler lists."""
        test_event_called = False
        another_event_called = False

        async def test_handler(event: TestEvent):
            nonlocal test_event_called
            test_event_called = True

        async def another_handler(event: AnotherTestEvent):
            nonlocal another_event_called
            another_event_called = True

        bus.subscribe(TestEvent, test_handler)
        bus.subscribe(AnotherTestEvent, another_handler)

        await bus.publish(TestEvent(message="test"))
        assert test_event_called
        assert not another_event_called

        test_event_called = False
        await bus.publish(AnotherTestEvent(value=42))
        assert not test_event_called
        assert another_event_called

    @pytest.mark.asyncio
    async def test_clear_handlers(self, bus):
        """Clear handlers should remove all handlers."""
        called = False

        async def handler(event: TestEvent):
            nonlocal called
            called = True

        bus.subscribe(TestEvent, handler)
        bus.clear_handlers()
        await bus.publish(TestEvent(message="test"))

        assert not called

    @pytest.mark.asyncio
    async def test_clear_specific_event_type(self, bus):
        """Clear specific event type should only clear those handlers."""
        test_called = False
        another_called = False

        async def test_handler(event: TestEvent):
            nonlocal test_called
            test_called = True

        async def another_handler(event: AnotherTestEvent):
            nonlocal another_called
            another_called = True

        bus.subscribe(TestEvent, test_handler)
        bus.subscribe(AnotherTestEvent, another_handler)

        bus.clear_handlers(TestEvent)

        await bus.publish(TestEvent(message="test"))
        await bus.publish(AnotherTestEvent(value=42))

        assert not test_called
        assert another_called
