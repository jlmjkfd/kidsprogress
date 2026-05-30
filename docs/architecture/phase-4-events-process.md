# Phase 4: Domain Events (Observer Pattern) - Implementation Process

> **Status**: Not Started
> **Estimated Time**: 6-8 hours
> **Priority**: Medium (Improves maintainability)
> **Depends On**: Phase 3 (Strategy Pattern)

---

## Objectives

Implement an event-driven architecture to decouple task completion from side effects (session removal, notifications, analytics), making the system more maintainable and extensible.

**Success Criteria**:
- [ ] Event bus infrastructure implemented
- [ ] Event classes defined for all domain events
- [ ] Event handlers implemented for side effects
- [ ] Completion flow decoupled from side effects
- [ ] Handler failures isolated (one failure doesn't break others)
- [ ] All existing tests still passing

---

## Implementation Steps

### Step 1: Create Event Bus Infrastructure (1 hour)

**File**: `backend/services/event_bus/__init__.py`

**Requirements**:
- Async event publishing and subscription
- Support for multiple handlers per event
- Error handling and logging
- Type-safe event registration

**Code Template**:
```python
from typing import Dict, List, Callable, Awaitable, Type, Any
import logging
from dataclasses import dataclass

logger = logging.getLogger(__name__)

# Type aliases
EventHandler = Callable[[Any], Awaitable[None]]

class EventBus:
    """Simple async event bus for domain events."""

    def __init__(self):
        self._handlers: Dict[Type, List[EventHandler]] = {}

    def subscribe(self, event_type: Type, handler: EventHandler) -> None:
        """Subscribe a handler to an event type."""
        if event_type not in self._handlers:
            self._handlers[event_type] = []
        self._handlers[event_type].append(handler)
        logger.info(f"Subscribed {handler.__name__} to {event_type.__name__}")

    async def publish(self, event: Any) -> None:
        """Publish an event to all subscribed handlers."""
        event_type = type(event)
        handlers = self._handlers.get(event_type, [])

        if not handlers:
            logger.warning(f"No handlers for event {event_type.__name__}")
            return

        logger.info(f"Publishing {event_type.__name__} to {len(handlers)} handlers")

        # Execute all handlers, isolating failures
        for handler in handlers:
            try:
                await handler(event)
            except Exception as e:
                logger.error(f"Handler {handler.__name__} failed for {event_type.__name__}: {e}")
                # Don't re-raise - let other handlers execute

# Global event bus instance
_event_bus = EventBus()

def get_event_bus() -> EventBus:
    """Get the global event bus instance."""
    return _event_bus
```

**Tests** (`tests/backend/services/event_bus/test_event_bus.py`):
```python
import pytest
from backend.services.event_bus import EventBus, get_event_bus

@dataclass
class TestEvent:
    message: str

async def test_subscribe_and_publish():
    bus = EventBus()
    called = False

    async def handler(event: TestEvent):
        nonlocal called
        called = True
        assert event.message == "test"

    bus.subscribe(TestEvent, handler)
    await bus.publish(TestEvent(message="test"))
    assert called

async def test_multiple_handlers():
    bus = EventBus()
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

async def test_handler_failure_isolated():
    bus = EventBus()
    handler2_called = False

    async def failing_handler(event: TestEvent):
        raise ValueError("Handler failed")

    async def handler2(event: TestEvent):
        nonlocal handler2_called
        handler2_called = True

    bus.subscribe(TestEvent, failing_handler)
    bus.subscribe(TestEvent, handler2)
    await bus.publish(TestEvent(message="test"))

    # Handler 2 should still be called despite handler 1 failing
    assert handler2_called
```

**Checklist**:
- [ ] File created: `backend/services/event_bus/__init__.py`
- [ ] Tests created: `tests/backend/services/event_bus/test_event_bus.py`
- [ ] Tests passing: `pytest tests/backend/services/event_bus/ -v`
- [ ] Error handling verified

---

### Step 2: Define Domain Event Classes (1 hour)

**File**: `backend/services/event_bus/events.py`

**Requirements**:
- Dataclass-based events
- Immutable (frozen=True)
- Include all necessary context for handlers
- Type hints for all fields

**Code Template**:
```python
from dataclasses import dataclass
from datetime import datetime
from typing import Optional, Dict, Any
from backend.models.task import Task

@dataclass(frozen=True)
class TaskEvent:
    """Base class for task events."""
    task_id: str
    child_id: str
    timestamp: datetime

@dataclass(frozen=True)
class TaskStarted(TaskEvent):
    """Event published when a task is started."""
    task: Task
    previous_status: str

@dataclass(frozen=True)
class TaskCompleted(TaskEvent):
    """Event published when a task is completed."""
    task: Task
    completion_data: Optional[Dict[str, Any]]
    time_spent_minutes: Optional[int]

@dataclass(frozen=True)
class TaskPaused(TaskEvent):
    """Event published when a task is paused."""
    task: Task
    paused_by: str  # "PARENT" or "CHILD"
    reason: Optional[str]

@dataclass(frozen=True)
class TaskResumed(TaskEvent):
    """Event published when a task is resumed."""
    task: Task

@dataclass(frozen=True)
class TaskCancelled(TaskEvent):
    """Event published when a task is cancelled."""
    task: Task
    cancelled_by: str  # parent_id
    reason: Optional[str]

@dataclass(frozen=True)
class TaskSkipped(TaskEvent):
    """Event published when a task is skipped."""
    task: Task
    skipped_by: str  # parent_id

@dataclass(frozen=True)
class VirtualTaskMaterialized(TaskEvent):
    """Event published when a virtual task is materialized."""
    task: Task
    template_id: str
    occurrence_date: str
```

**Tests** (`tests/backend/services/event_bus/test_events.py`):
```python
from datetime import datetime
from backend.services.event_bus.events import TaskStarted, TaskCompleted
from backend.models.task import Task

def test_task_started_immutable():
    event = TaskStarted(
        task_id="123",
        child_id="456",
        timestamp=datetime.now(),
        task=sample_task,
        previous_status="SCHEDULED"
    )

    # Should not be able to modify
    with pytest.raises(Exception):
        event.task_id = "999"
```

**Checklist**:
- [ ] File created: `backend/services/event_bus/events.py`
- [ ] Tests created: `tests/backend/services/event_bus/test_events.py`
- [ ] All event types defined
- [ ] Immutability verified

---

### Step 3: Implement Event Handlers (2 hours)

**File**: `backend/services/event_bus/handlers.py`

**Requirements**:
- One handler per side effect
- Clear logging
- Error handling

**Code Template**:
```python
import logging
from backend.services.event_bus.events import TaskStarted, TaskCompleted, TaskPaused
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)

class SessionHandler:
    """Handles session-related side effects."""

    def __init__(self, db: AsyncIOMotorDatabase):
        self.sessions_collection = db.active_task_sessions

    async def on_task_started(self, event: TaskStarted) -> None:
        """Create active session when task starts."""
        try:
            await self.sessions_collection.insert_one({
                "task_id": event.task_id,
                "child_id": event.child_id,
                "started_at": event.timestamp,
            })
            logger.info(f"Created session for task {event.task_id}")
        except Exception as e:
            logger.error(f"Failed to create session: {e}")
            raise

    async def on_task_completed(self, event: TaskCompleted) -> None:
        """Remove active session when task completes."""
        try:
            result = await self.sessions_collection.delete_one({
                "task_id": event.task_id
            })
            logger.info(f"Removed session for task {event.task_id} (deleted: {result.deleted_count})")
        except Exception as e:
            logger.error(f"Failed to remove session: {e}")
            raise

    async def on_task_paused(self, event: TaskPaused) -> None:
        """Remove active session when task pauses."""
        try:
            result = await self.sessions_collection.delete_one({
                "task_id": event.task_id
            })
            logger.info(f"Removed session for task {event.task_id} (paused)")
        except Exception as e:
            logger.error(f"Failed to remove session: {e}")
            raise


class NotificationHandler:
    """Handles notification side effects (placeholder)."""

    async def on_task_completed(self, event: TaskCompleted) -> None:
        """Send notification when task completes."""
        # TODO: Implement notification logic
        logger.info(f"Would send notification for completed task {event.task_id}")


class AnalyticsHandler:
    """Handles analytics side effects (placeholder)."""

    async def on_task_completed(self, event: TaskCompleted) -> None:
        """Track completion metrics."""
        # TODO: Implement analytics logic
        logger.info(f"Would track analytics for completed task {event.task_id}")
```

**Tests** (`tests/backend/services/event_bus/test_handlers.py`):
```python
async def test_session_handler_on_task_started(db, sample_task):
    handler = SessionHandler(db)
    event = TaskStarted(
        task_id=str(sample_task.id),
        child_id="child123",
        timestamp=datetime.now(),
        task=sample_task,
        previous_status="SCHEDULED"
    )

    await handler.on_task_started(event)

    # Verify session created
    session = await db.active_task_sessions.find_one({"task_id": str(sample_task.id)})
    assert session is not None
    assert session["child_id"] == "child123"

async def test_session_handler_on_task_completed(db, sample_task):
    # Create session first
    await db.active_task_sessions.insert_one({
        "task_id": str(sample_task.id),
        "child_id": "child123",
        "started_at": datetime.now(),
    })

    handler = SessionHandler(db)
    event = TaskCompleted(
        task_id=str(sample_task.id),
        child_id="child123",
        timestamp=datetime.now(),
        task=sample_task,
        completion_data=None,
        time_spent_minutes=10
    )

    await handler.on_task_completed(event)

    # Verify session removed
    session = await db.active_task_sessions.find_one({"task_id": str(sample_task.id)})
    assert session is None
```

**Checklist**:
- [ ] File created: `backend/services/event_bus/handlers.py`
- [ ] Tests created: `tests/backend/services/event_bus/test_handlers.py`
- [ ] SessionHandler implemented
- [ ] Tests passing

---

### Step 4: Register Handlers at Startup (30 min)

**File**: `backend/main.py` (or app initialization)

**Requirements**:
- Register all handlers at application startup
- Initialize handlers with dependencies
- Clear registration

**Code Template**:
```python
from backend.services.event_bus import get_event_bus
from backend.services.event_bus.events import TaskStarted, TaskCompleted, TaskPaused
from backend.services.event_bus.handlers import SessionHandler, NotificationHandler, AnalyticsHandler

def register_event_handlers(db):
    """Register all event handlers at application startup."""
    bus = get_event_bus()

    # Initialize handlers
    session_handler = SessionHandler(db)
    notification_handler = NotificationHandler()
    analytics_handler = AnalyticsHandler()

    # Register handlers for TaskStarted
    bus.subscribe(TaskStarted, session_handler.on_task_started)

    # Register handlers for TaskCompleted
    bus.subscribe(TaskCompleted, session_handler.on_task_completed)
    bus.subscribe(TaskCompleted, notification_handler.on_task_completed)
    bus.subscribe(TaskCompleted, analytics_handler.on_task_completed)

    # Register handlers for TaskPaused
    bus.subscribe(TaskPaused, session_handler.on_task_paused)

    logger.info("Event handlers registered successfully")

# In startup event
@app.on_event("startup")
async def startup_event():
    db = await get_database()
    register_event_handlers(db)
```

**Checklist**:
- [ ] Handler registration function created
- [ ] Called at application startup
- [ ] Logging added
- [ ] Verify handlers registered: Check startup logs

---

### Step 5: Update TaskLifecycle to Publish Events (2 hours)

**File**: `backend/services/task_service/lifecycle.py`

**Current Code** (start_task):
```python
async def start_task(self, task_id: str, child_id: str) -> dict:
    # ... validation and update ...

    # Create active session
    await self.session.create_session(task_id, child_id)

    return {"task": updated_task, "warnings": warnings}
```

**New Code**:
```python
from backend.services.event_bus import get_event_bus
from backend.services.event_bus.events import TaskStarted

async def start_task(self, task_id: str, child_id: str) -> dict:
    # ... validation and update ...

    # Publish event (handlers will handle session creation)
    event = TaskStarted(
        task_id=task_id,
        child_id=child_id,
        timestamp=datetime.now(),
        task=updated_task,
        previous_status=current_status
    )
    await get_event_bus().publish(event)

    return {"task": updated_task, "warnings": warnings}
```

**Methods to Update**:
1. `start_task` → Publish TaskStarted
2. `complete_task` → Publish TaskCompleted
3. `pause_task` → Publish TaskPaused
4. `resume_task` → Publish TaskResumed
5. `cancel_task` → Publish TaskCancelled
6. `skip_task` → Publish TaskSkipped

**Checklist**:
- [ ] Import event bus and events
- [ ] Update start_task
- [ ] Update complete_task
- [ ] Update pause_task
- [ ] Update resume_task
- [ ] Update cancel_task
- [ ] Update skip_task
- [ ] Remove direct session.create_session() calls
- [ ] Remove direct session.remove_session() calls
- [ ] Run tests: `pytest tests/backend/services/task_service/test_lifecycle.py -v`

---

### Step 6: Remove Tight Coupling (1 hour)

**Search for Direct Side Effect Calls**:
```bash
# Find session operations
grep -rn "session.create_session" backend/services/task_service/
grep -rn "session.remove_session" backend/services/task_service/

# Find notification calls (if any)
grep -rn "send_notification" backend/services/task_service/
```

**Replace with Events**:
- All session management should happen via SessionHandler
- All notifications should happen via NotificationHandler
- Lifecycle methods should only publish events

**Checklist**:
- [ ] All direct session calls removed from lifecycle
- [ ] All direct notification calls removed
- [ ] Only event publishing in lifecycle methods
- [ ] Run full test suite: `pytest tests/backend/ -v`

---

### Step 7: Integration Testing (1 hour)

**Test Scenarios**:

1. **Task Start Flow**:
   - Start task → Verify TaskStarted published → Verify session created

2. **Task Complete Flow**:
   - Complete task → Verify TaskCompleted published → Verify session removed

3. **Task Pause Flow**:
   - Pause task → Verify TaskPaused published → Verify session removed

4. **Handler Failure Isolation**:
   - Mock handler to fail → Verify other handlers still execute

**Manual Tests**:
1. [ ] Child portal: Start task (check session created)
2. [ ] Child portal: Complete task (check session removed)
3. [ ] Child portal: Pause task (check session removed)
4. [ ] Logs show event publishing and handler execution

**Checklist**:
- [ ] All event flows tested
- [ ] Handler isolation verified
- [ ] Manual testing confirms behavior

---

### Step 8: Documentation and Review (30 min)

**Updates Needed**:
1. Update `docs/architecture/implementation-progress.md`
2. Create event flow diagram
3. Document how to add new handlers

**Checklist**:
- [ ] implementation-progress.md updated (Phase 4 complete)
- [ ] Event flow diagram created
- [ ] Handler documentation complete
- [ ] Code review against `.claude/skills/architecture-patterns.md`

---

## Testing Checklist

### Unit Tests
- [ ] `test_event_bus.py` - Event publishing and subscription
- [ ] `test_events.py` - Event immutability
- [ ] `test_handlers.py` - All handlers
- [ ] Handler failure isolation

### Integration Tests
- [ ] Start task → Session created
- [ ] Complete task → Session removed + notifications
- [ ] Pause task → Session removed
- [ ] Multiple handlers execute in order

### Manual Tests
1. [ ] Start task and verify session in database
2. [ ] Complete task and verify session removed
3. [ ] Check logs for event publishing
4. [ ] Verify notifications sent (when implemented)

---

## Rollback Plan

If issues arise:
1. Revert to Phase 3 completion commit
2. Keep event bus infrastructure but don't publish events
3. Restore direct session.create_session() calls temporarily
4. Address issues and retry

**Git Strategy**:
- Create branch: `refactor/phase-4-events`
- Commit after each handler implemented
- Merge to main only when all tests pass

---

## Success Metrics

**Before**:
- Side effects tightly coupled to lifecycle methods
- Hard to add new side effects
- One failure breaks entire operation

**After**:
- Side effects decoupled via events
- Easy to add new handlers (just subscribe)
- Handler failures isolated

**Measurements**:
```bash
# Count direct session calls (should be 0 after, except in SessionHandler)
grep -r "session.create_session" backend/ | grep -v handler | wc -l
grep -r "session.remove_session" backend/ | grep -v handler | wc -l

# Count event publications (should be ~7)
grep -r "get_event_bus().publish" backend/ | wc -l
```

---

## Notes and Issues

### Issues Encountered
- None yet

### Design Decisions
- Use global event bus singleton for simplicity
- Handler failures logged but don't re-raise (isolation)
- Events are immutable dataclasses

### Questions
- Should we support async vs sync handlers? (Decision: Async only for simplicity)

---

## References

- **Architecture Patterns**: [../../.claude/skills/architecture-patterns.md](../../.claude/skills/architecture-patterns.md)
- **Refactoring Plan**: [task-system-refactoring-plan.md](task-system-refactoring-plan.md)
- **Implementation Progress**: [implementation-progress.md](implementation-progress.md)
- **Phase 3**: [phase-3-strategy-process.md](phase-3-strategy-process.md)
