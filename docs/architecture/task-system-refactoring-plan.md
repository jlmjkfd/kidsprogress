# Task System Architecture Refactoring Plan

> **Document Purpose**: Comprehensive plan for refactoring the KidsProgress task system to reduce complexity and improve maintainability.
>
> **Status**: 📋 Planning Phase
>
> **Last Updated**: 2025-12-11

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Problem Statement](#problem-statement)
3. [Current Architecture](#current-architecture)
4. [Refactoring Phases](#refactoring-phases)
5. [Implementation Priority](#implementation-priority)
6. [Success Metrics](#success-metrics)
7. [Risks and Mitigation](#risks-and-mitigation)

---

## Implementation Status

### ✅ Phase 1: TaskIdentifier Value Object - COMPLETE
- **Commit**: `5fa2edd` - "refactor(phase-1): Implement TaskIdentifier value object pattern"
- **Files Created**: `backend/models/task_identity.py`
- **Tests**: 25 passing tests
- **Impact**: Eliminated 50+ lines of duplicated `if "_" in task_id` checks

### ✅ Phase 2: State Machine - COMPLETE
- **Commit**: `b59b0a8` - "refactor(phase-2): Implement TaskStateMachine for lifecycle validation"
- **Files Created**: `backend/models/task_state_machine.py`
- **Tests**: 44 passing tests
- **Impact**: Centralized state transition validation, single source of truth

### ✅ Phase 3: Strategy Pattern - COMPLETE
- **Commit**: `2244b6f` - "refactor(phase-3): Implement Strategy Pattern for task operations"
- **Files Created**:
  - `backend/services/task_service/strategies/base.py`
  - `backend/services/task_service/strategies/real_task.py`
  - `backend/services/task_service/strategies/virtual_task.py`
  - `backend/services/task_service/strategies/factory.py`
- **Tests**: 4 factory tests passing
- **Impact**: New task types can be added without modifying existing code

### ✅ Phase 4: Domain Events - COMPLETE
- **Commit**: `31f4dac` - "refactor: Implement Phase 4 - Domain Events (Observer Pattern)"
- **Files Created**:
  - `backend/services/event_bus/__init__.py`
  - `backend/services/event_bus/events.py`
  - `backend/services/event_bus/handlers.py`
- **Tests**: 8 event bus tests passing
- **Impact**: Decoupled task operations from side effects

### ✅ Phase 5: Query Builders - COMPLETE
- **Commit**: (current) - "refactor(phase-5): Implement Specification Pattern for composable queries"
- **Files Created**:
  - `backend/services/task_service/queries/base.py`
  - `backend/services/task_service/queries/specifications.py`
  - `backend/services/task_service/queries/__init__.py`
- **Tests**: 28 specification tests passing
- **Impact**: Composable, reusable query components for complex MongoDB queries

### Total Test Coverage
- **109 tests passing** across all phases
- **Zero regressions** in existing functionality
- **100% backward compatible** with existing code

---

## Executive Summary

### The Challenge

The task system has grown organically with many features:
- Recurring tasks with virtual instances
- Multiple task sources (one_time, routine, activity)
- Template-based task execution
- Complex lifecycle states
- Overdue tracking and grouping

**Current Pain Point**: Changes require touching 10+ files and checking multiple conditions (`if "_" in task_id`, `if task_source == "routine"`, etc.).

### The Solution

Five-phase incremental refactoring using established design patterns:

| Phase | Pattern | Impact | Effort |
|-------|---------|--------|--------|
| 1 | TaskIdentifier (Value Object) | 🔥 HIGH | ⚡ LOW |
| 2 | State Machine | 🔥 HIGH | ⚡ LOW |
| 3 | Strategy Pattern | 🔥 MEDIUM | ⚡ MEDIUM |
| 4 | Domain Events | 🔥 LOW | ⚡ MEDIUM |
| 5 | Query Builders | 🔥 MEDIUM | ⚡ LOW |

### Expected Benefits

- **50% reduction** in task ID handling code
- **Single source of truth** for state transitions
- **Easy extensibility** for new task types
- **Better testability** with isolated components
- **Clear separation of concerns**

---

## Problem Statement

### Current Issues

#### 1. Task ID Complexity Leakage

**Problem**: Virtual task ID format (`template_id_date`) spreads throughout codebase.

**Evidence**:
```python
# Found in 15+ files:
if "_" in task_id:
    template_id_str = task_id.rsplit("_", 1)[0]
    try:
        template_id_obj = ObjectId(template_id_str)
        # ... 10 more lines
```

**Impact**:
- Code duplication
- Error-prone (easy to forget edge cases)
- Hard to change format
- Frontend and backend both handle parsing

#### 2. Conditional Branching

**Problem**: Many `if` statements based on task properties.

**Evidence**:
```python
if task_source == "routine":
    # routine logic
elif task_source == "activity":
    # activity logic
else:
    # one_time logic
```

**Impact**:
- Hard to add new task types
- Easy to miss branches
- Complex unit tests

#### 3. State Transition Confusion

**Problem**: Task status validation scattered across methods.

**Evidence**:
```python
# In lifecycle.py line 378
if current_status not in [PENDING, IN_PROGRESS, PAUSED]:
    raise ValueError(...)
```

**Impact**:
- Easy to miss edge cases (like PAUSED we just added)
- No single source of truth
- Hard to visualize valid transitions

#### 4. Completion Logic Spread

**Problem**: Task completion touches 4+ services.

**Impact**:
- Hard to track side effects
- Difficult to add new completion actions
- Tight coupling between components

---

## Current Architecture

### Component Overview

```
TaskService (Facade)
├── TaskCRUD (database operations)
│   ├── create_task()
│   ├── get_task_by_id()      ← Virtual task logic here
│   ├── get_overdue_tasks()   ← Complex grouping logic
│   └── get_tasks_by_child()
├── TaskLifecycle (state transitions)
│   ├── start_task()
│   ├── pause_task()
│   ├── complete_task()       ← Status validation here
│   └── cancel_task()
├── VirtualInstanceService (recurring task expansion)
│   └── _create_virtual_instance()
├── TaskRecurrence (recurrence patterns)
├── TaskRollover (backlog management)
└── TaskSession (active session tracking)
```

### Data Flow: Completing a Virtual Task

```
1. Child clicks "Mark Done" on overdue virtual task
   ↓
2. Frontend: OverdueTaskCard
   - Constructs virtual_id: `${template_id}_${date}`
   - Calls: POST /api/tasks/{virtual_id}/complete
   ↓
3. Backend: completion_routes.py
   - Parses virtual task ID (if "_" in task_id)
   - Gets template task
   - Saves completion to database
   - Emits side effects:
     * Update task status (skip for virtual)
     * Remove active session
     * Update completion count
   ↓
4. Result: Completion saved, template unchanged
```

### Current Strengths ✅

- Good separation of concerns (CRUD, Lifecycle, etc.)
- Modular components
- Type safety with Pydantic
- Comprehensive test coverage

### Current Weaknesses 🔴

- Virtual task ID handling duplicated everywhere
- State transitions not formalized
- Task type logic scattered (routine vs activity vs one_time)
- Completion side effects tightly coupled

---

## Refactoring Phases

## Phase 1: TaskIdentifier Value Object

**Goal**: Eliminate scattered `if "_" in task_id` checks

### 1.1 Create TaskIdentifier Class

**File**: `backend/models/task_identity.py` (NEW)

```python
"""Task identity handling for real and virtual tasks."""
from typing import Optional
from datetime import date
from bson import ObjectId
from pydantic import BaseModel


class TaskIdentifier(BaseModel):
    """Encapsulates task identity logic for real and virtual tasks.

    Virtual tasks have format: {template_id}_{date}
    Real tasks are standard ObjectId strings.

    Example:
        # Virtual task
        id = TaskIdentifier(raw_id="507f1f77bcf86cd799439011_2025-12-10")
        assert id.is_virtual == True
        assert id.template_id == "507f1f77bcf86cd799439011"
        assert id.occurrence_date == date(2025, 12, 10)

        # Real task
        id = TaskIdentifier(raw_id="507f1f77bcf86cd799439011")
        assert id.is_real == True
        assert id.template_id is None
    """
    raw_id: str

    @property
    def is_virtual(self) -> bool:
        """Check if this is a virtual task ID."""
        return "_" in self.raw_id and not ObjectId.is_valid(self.raw_id)

    @property
    def is_real(self) -> bool:
        """Check if this is a real task ID."""
        return not self.is_virtual

    @property
    def template_id(self) -> Optional[str]:
        """Extract template ID from virtual task ID."""
        if not self.is_virtual:
            return None
        return self.raw_id.rsplit("_", 1)[0]

    @property
    def template_id_obj(self) -> Optional[ObjectId]:
        """Get template ID as ObjectId."""
        if not self.template_id:
            return None
        try:
            return ObjectId(self.template_id)
        except:
            return None

    @property
    def occurrence_date(self) -> Optional[date]:
        """Extract occurrence date from virtual task ID."""
        if not self.is_virtual:
            return None
        try:
            from datetime import datetime
            date_str = self.raw_id.rsplit("_", 1)[1]
            return datetime.fromisoformat(date_str).date()
        except:
            return None

    @property
    def db_id(self) -> ObjectId:
        """Get the database ID (template ID for virtual, task ID for real)."""
        if self.is_virtual:
            return self.template_id_obj
        return ObjectId(self.raw_id)

    def to_db_query(self) -> dict:
        """Generate MongoDB query filter for this task."""
        if self.is_virtual:
            return {"_id": self.template_id_obj}
        return {"_id": ObjectId(self.raw_id)}

    def __str__(self) -> str:
        return self.raw_id

    def __repr__(self) -> str:
        if self.is_virtual:
            return f"TaskIdentifier(virtual, template={self.template_id}, date={self.occurrence_date})"
        return f"TaskIdentifier(real, id={self.raw_id})"
```

### 1.2 Refactor get_task_by_id

**File**: `backend/services/task_service/crud.py`

**BEFORE** (50+ lines of conditional logic):
```python
async def get_task_by_id(self, task_id: str, parent_id: str) -> Optional[Task]:
    # Check if this is a virtual task ID (format: template_id_date)
    if "_" in task_id and not task_id.count("_") > 2:
        parts = task_id.rsplit("_", 1)
        if len(parts) == 2:
            template_id_str, date_str = parts
            try:
                template_id_obj = validate_object_id(...)
                occurrence_date = datetime.fromisoformat(date_str).date()
                # ... 40 more lines
```

**AFTER** (15 lines):
```python
async def get_task_by_id(self, task_id: str, parent_id: str) -> Optional[Task]:
    """Get task by ID, handling both real and virtual tasks."""
    identifier = TaskIdentifier(raw_id=task_id)

    if identifier.is_virtual:
        return await self._get_virtual_task(identifier, parent_id)
    return await self._get_real_task(identifier, parent_id)

async def _get_virtual_task(self, identifier: TaskIdentifier, parent_id: str) -> Optional[Task]:
    """Get virtual task instance from recurring template."""
    parent_id_obj = validate_object_id(parent_id, "parent_id", raise_http_exception=False)

    template_doc = await self.tasks_collection.find_one({
        "_id": identifier.template_id_obj,
        "$or": [{"parent_id": parent_id_obj}, {"parent_id": parent_id}]
    })

    if template_doc and template_doc.get("is_recurring"):
        template = Task(**template_doc)
        virtual_instance = VirtualInstanceService._create_virtual_instance(
            template, identifier.occurrence_date
        )
        return Task.model_construct(**virtual_instance)
    return None

async def _get_real_task(self, identifier: TaskIdentifier, parent_id: str) -> Optional[Task]:
    """Get real task from database."""
    parent_id_obj = validate_object_id(parent_id, "parent_id", raise_http_exception=False)

    doc = await self.tasks_collection.find_one({
        "_id": identifier.db_id,
        "$or": [{"parent_id": parent_id_obj}, {"parent_id": parent_id}]
    })
    return Task(**doc) if doc else None
```

### 1.3 Update Completion Routes

**File**: `backend/routes/completion_routes.py`

**BEFORE**:
```python
# Check if this is a virtual task and extract template ID
is_virtual_task = "_" in task_id
if is_virtual_task:
    template_id_str = task_id.rsplit("_", 1)[0]
else:
    template_id_str = None

# ... later ...
if "_" in task_id:
    template_id_str = task_id.rsplit("_", 1)[0]
    try:
        template_id_obj = ObjectId(template_id_str)
```

**AFTER**:
```python
from backend.models.task_identity import TaskIdentifier

identifier = TaskIdentifier(raw_id=task_id)

# Use properties
if identifier.is_virtual:
    template_id_str = identifier.template_id
    template_id_obj = identifier.template_id_obj
```

### Phase 1 Impact

- ✅ Eliminates 50+ lines of duplicated code
- ✅ Centralizes virtual task ID parsing
- ✅ Makes task ID format changes easy (change one place)
- ✅ Self-documenting (clear what each property means)
- ✅ Easy to test in isolation

**Files to Update**:
- `backend/routes/completion_routes.py` (3 locations)
- `backend/routes/tasks.py` (1 location)
- `backend/services/task_service/crud.py` (2 locations)
- `backend/services/task_service/lifecycle.py` (1 location)

**Estimated Time**: 2 hours

---

## Phase 2: State Machine for Task Lifecycle

**Goal**: Centralize and formalize task state transitions

### 2.1 Create State Machine Definition

**File**: `backend/models/task_state_machine.py` (NEW)

```python
"""Task lifecycle state machine."""
from enum import Enum
from typing import Set, Dict
from backend.models.task import TaskStatus


class TaskStateMachine:
    """Manages valid task state transitions.

    Usage:
        # Validate a transition
        TaskStateMachine.validate_transition(
            TaskStatus.PENDING,
            TaskStatus.COMPLETED
        )  # Raises ValueError if invalid

        # Check if transition is valid
        if TaskStateMachine.can_transition(current, target):
            # perform transition

        # Get allowed next states
        allowed = TaskStateMachine.get_allowed_transitions(TaskStatus.PENDING)
        # Returns: {IN_PROGRESS, COMPLETED, CANCELLED, SKIPPED}
    """

    # Define all valid transitions
    TRANSITIONS: Dict[TaskStatus, Set[TaskStatus]] = {
        TaskStatus.PENDING: {
            TaskStatus.IN_PROGRESS,  # Child starts task
            TaskStatus.COMPLETED,     # Simple tasks marked done
            TaskStatus.CANCELLED,     # Parent cancels
            TaskStatus.SKIPPED,       # Task becomes overdue
        },
        TaskStatus.IN_PROGRESS: {
            TaskStatus.PAUSED,        # Child pauses
            TaskStatus.COMPLETED,     # Child completes
            TaskStatus.CANCELLED,     # Parent cancels
        },
        TaskStatus.PAUSED: {
            TaskStatus.IN_PROGRESS,   # Child resumes
            TaskStatus.COMPLETED,     # Can complete from paused
            TaskStatus.CANCELLED,     # Parent cancels
        },
        TaskStatus.COMPLETED: {
            TaskStatus.ARCHIVED,      # Auto-archive after time
        },
        TaskStatus.CANCELLED: set(),  # Terminal state
        TaskStatus.SKIPPED: set(),    # Terminal state
        TaskStatus.ARCHIVED: set(),   # Terminal state
    }

    @classmethod
    def can_transition(cls, from_state: TaskStatus, to_state: TaskStatus) -> bool:
        """Check if transition is valid."""
        return to_state in cls.TRANSITIONS.get(from_state, set())

    @classmethod
    def validate_transition(cls, from_state: TaskStatus, to_state: TaskStatus) -> None:
        """Validate transition or raise ValueError."""
        if not cls.can_transition(from_state, to_state):
            allowed = ", ".join(s.value for s in cls.TRANSITIONS.get(from_state, set()))
            raise ValueError(
                f"Invalid transition from {from_state.value} to {to_state.value}. "
                f"Allowed transitions: {allowed or 'none (terminal state)'}"
            )

    @classmethod
    def get_allowed_transitions(cls, current_state: TaskStatus) -> Set[TaskStatus]:
        """Get all valid next states."""
        return cls.TRANSITIONS.get(current_state, set())

    @classmethod
    def visualize(cls) -> str:
        """Generate ASCII diagram of state machine."""
        lines = ["Task State Machine:", ""]
        for from_state, to_states in cls.TRANSITIONS.items():
            if to_states:
                for to_state in sorted(to_states, key=lambda s: s.value):
                    lines.append(f"  {from_state.value:15} → {to_state.value}")
            else:
                lines.append(f"  {from_state.value:15} → (terminal)")
        return "\n".join(lines)
```

### 2.2 Refactor TaskLifecycle

**File**: `backend/services/task_service/lifecycle.py`

**BEFORE**:
```python
async def complete_task(self, task_id: str, child_id: str) -> Optional[Task]:
    # ... fetch task ...
    current_status = existing.get("status")
    # Allow completing from PENDING (simple tasks), IN_PROGRESS (active), or PAUSED
    if current_status not in [TaskStatus.PENDING.value, TaskStatus.IN_PROGRESS.value, TaskStatus.PAUSED.value]:
        raise ValueError(f"Can only complete from PENDING/IN_PROGRESS/PAUSED, current: {current_status}")
```

**AFTER**:
```python
from backend.models.task_state_machine import TaskStateMachine

async def complete_task(self, task_id: str, child_id: str) -> Optional[Task]:
    # ... fetch task ...
    current_status = TaskStatus(existing.get("status"))

    # Validate transition using state machine
    TaskStateMachine.validate_transition(current_status, TaskStatus.COMPLETED)

    # Proceed with completion...
```

### 2.3 Add API Endpoint for Frontend

**File**: `backend/routes/tasks.py` (NEW endpoint)

```python
@router.get("/{task_id}/allowed-actions")
async def get_allowed_actions(
    task_id: str,
    current_user: User = Depends(get_current_user),
    service: TaskService = Depends(get_task_service),
):
    """Get allowed actions for a task based on current state."""
    task = await service.get_task_by_id(task_id, str(current_user.id))
    if not task:
        raise not_found("Task")

    current_status = TaskStatus(task.status)
    allowed_transitions = TaskStateMachine.get_allowed_transitions(current_status)

    return {
        "current_status": current_status.value,
        "allowed_transitions": [s.value for s in allowed_transitions],
        "can_start": TaskStatus.IN_PROGRESS in allowed_transitions,
        "can_pause": TaskStatus.PAUSED in allowed_transitions,
        "can_complete": TaskStatus.COMPLETED in allowed_transitions,
        "can_cancel": TaskStatus.CANCELLED in allowed_transitions,
    }
```

### Phase 2 Benefits

- ✅ Single source of truth for state transitions
- ✅ Easy to add new states (e.g., `UNDER_REVIEW`)
- ✅ Generates documentation automatically (`visualize()`)
- ✅ Frontend can query allowed actions
- ✅ Clear error messages when invalid transition attempted

### Phase 2 Visualization

Running `TaskStateMachine.visualize()` outputs:

```
Task State Machine:

  pending         → cancelled
  pending         → completed
  pending         → in_progress
  pending         → skipped
  in_progress     → cancelled
  in_progress     → completed
  in_progress     → paused
  paused          → cancelled
  paused          → completed
  paused          → in_progress
  completed       → archived
  cancelled       → (terminal)
  skipped         → (terminal)
  archived        → (terminal)
```

**Estimated Time**: 3 hours

---

## Phase 3: Strategy Pattern for Task Types

**Goal**: Eliminate `if task_source == "routine"` conditionals

### 3.1 Define Task Strategy Interface

**File**: `backend/services/task_service/strategies/base.py` (NEW)

```python
"""Base strategy for task operations."""
from abc import ABC, abstractmethod
from typing import Optional, List
from backend.models.task import Task
from backend.models.task_identity import TaskIdentifier


class TaskStrategy(ABC):
    """Abstract base for task-specific operations.

    Different task types (real, virtual, routine, activity) can have
    different behaviors for the same operation.
    """

    def __init__(self, db, collections):
        self.db = db
        self.tasks_collection = collections['tasks']
        self.completions_collection = collections['completions']

    @abstractmethod
    async def get_task(self, identifier: TaskIdentifier, parent_id: str) -> Optional[Task]:
        """Retrieve task (handles DB vs virtual generation)."""
        pass

    @abstractmethod
    async def complete_task(self, identifier: TaskIdentifier, child_id: str) -> Optional[Task]:
        """Complete task (handles state update logic)."""
        pass

    @abstractmethod
    async def get_completion_history(self, identifier: TaskIdentifier) -> List[dict]:
        """Get completion history (handles query differences)."""
        pass

    @abstractmethod
    def should_update_template_status(self) -> bool:
        """Whether completing this task updates template status."""
        pass

    @abstractmethod
    def supports_multiple_completions(self) -> bool:
        """Whether this task type supports multiple completions per period."""
        pass
```

### 3.2 Implement Concrete Strategies

**File**: `backend/services/task_service/strategies/real_task.py` (NEW)

```python
"""Strategy for real (non-virtual) tasks."""
from typing import Optional, List
from bson import ObjectId
from .base import TaskStrategy
from backend.models.task import Task, TaskStatus
from backend.models.task_identity import TaskIdentifier
from backend.utils.validators import validate_object_id
from backend.utils.datetime_utils import utcnow


class RealTaskStrategy(TaskStrategy):
    """Handles operations for real (database-stored) tasks."""

    async def get_task(self, identifier: TaskIdentifier, parent_id: str) -> Optional[Task]:
        """Get real task from database."""
        parent_id_obj = validate_object_id(parent_id, "parent_id", raise_http_exception=False)

        doc = await self.tasks_collection.find_one({
            "_id": identifier.db_id,
            "$or": [{"parent_id": parent_id_obj}, {"parent_id": parent_id}]
        })
        return Task(**doc) if doc else None

    async def complete_task(self, identifier: TaskIdentifier, child_id: str) -> Optional[Task]:
        """Complete real task by updating database."""
        child_id_obj = validate_object_id(child_id, "child_id", raise_http_exception=False)

        result = await self.tasks_collection.find_one_and_update(
            {"_id": identifier.db_id, "child_id": child_id_obj},
            {
                "$set": {
                    "status": TaskStatus.COMPLETED.value,
                    "completed_at": utcnow(),
                    "updated_at": utcnow(),
                }
            },
            return_document=True,
        )
        return Task(**result) if result else None

    async def get_completion_history(self, identifier: TaskIdentifier) -> List[dict]:
        """Get completions for this real task."""
        cursor = self.completions_collection.find({
            "task_id": identifier.db_id
        }).sort("completed_at", -1)
        return await cursor.to_list(length=100)

    def should_update_template_status(self) -> bool:
        """Real tasks update their own status."""
        return True

    def supports_multiple_completions(self) -> bool:
        """Depends on task configuration."""
        return False  # Default, can be overridden
```

**File**: `backend/services/task_service/strategies/virtual_task.py` (NEW)

```python
"""Strategy for virtual (recurring) tasks."""
from typing import Optional, List
from .base import TaskStrategy
from backend.models.task import Task
from backend.models.task_identity import TaskIdentifier
from backend.services.virtual_instance_service import VirtualInstanceService
from backend.utils.validators import validate_object_id


class VirtualTaskStrategy(TaskStrategy):
    """Handles operations for virtual (template-generated) tasks."""

    async def get_task(self, identifier: TaskIdentifier, parent_id: str) -> Optional[Task]:
        """Generate virtual task instance from template."""
        parent_id_obj = validate_object_id(parent_id, "parent_id", raise_http_exception=False)

        template_doc = await self.tasks_collection.find_one({
            "_id": identifier.template_id_obj,
            "$or": [{"parent_id": parent_id_obj}, {"parent_id": parent_id}]
        })

        if template_doc and template_doc.get("is_recurring"):
            template = Task(**template_doc)
            virtual_instance = VirtualInstanceService._create_virtual_instance(
                template, identifier.occurrence_date
            )
            return Task.model_construct(**virtual_instance)
        return None

    async def complete_task(self, identifier: TaskIdentifier, child_id: str) -> Optional[Task]:
        """For virtual tasks, completion is saved separately - template stays as-is."""
        # Virtual tasks don't update database status
        # Completion is saved in completions collection
        # Just return the virtual instance to confirm it exists
        return await self.get_task(identifier, parent_id=child_id)

    async def get_completion_history(self, identifier: TaskIdentifier) -> List[dict]:
        """Get completions for this specific virtual task occurrence."""
        cursor = self.completions_collection.find({
            "task_id": identifier.template_id_obj,
            "scheduled_date": str(identifier.occurrence_date)
        }).sort("completed_at", -1)
        return await cursor.to_list(length=100)

    def should_update_template_status(self) -> bool:
        """Virtual tasks don't update template status."""
        return False

    def supports_multiple_completions(self) -> bool:
        """Virtual tasks support multiple completions per occurrence."""
        return True
```

### 3.3 Create Strategy Factory

**File**: `backend/services/task_service/strategies/factory.py` (NEW)

```python
"""Factory for creating task strategies."""
from .base import TaskStrategy
from .real_task import RealTaskStrategy
from .virtual_task import VirtualTaskStrategy
from backend.models.task_identity import TaskIdentifier


class TaskStrategyFactory:
    """Creates appropriate strategy based on task identifier.

    Usage:
        factory = TaskStrategyFactory(db)
        identifier = TaskIdentifier(raw_id=task_id)
        strategy = factory.create(identifier)
        task = await strategy.get_task(identifier, parent_id)
    """

    def __init__(self, db):
        self.db = db
        self.collections = {
            'tasks': db.tasks,
            'completions': db.task_completions,
        }

    def create(self, identifier: TaskIdentifier) -> TaskStrategy:
        """Create strategy for given task identifier."""
        if identifier.is_virtual:
            return VirtualTaskStrategy(self.db, self.collections)
        return RealTaskStrategy(self.db, self.collections)
```

### 3.4 Refactor CRUD to Use Strategies

**File**: `backend/services/task_service/crud.py`

**Add in __init__**:
```python
from .strategies.factory import TaskStrategyFactory

def __init__(self, db: AsyncIOMotorDatabase, school_calendar_service=None):
    # ... existing init code ...
    self.strategy_factory = TaskStrategyFactory(db)
```

**Update get_task_by_id**:
```python
async def get_task_by_id(self, task_id: str, parent_id: str) -> Optional[Task]:
    """Get task by ID, using appropriate strategy."""
    identifier = TaskIdentifier(raw_id=task_id)
    strategy = self.strategy_factory.create(identifier)
    return await strategy.get_task(identifier, parent_id)
```

### Phase 3 Benefits

- ✅ Adding new task types doesn't modify existing code
- ✅ Each strategy can have its own optimization (caching, etc.)
- ✅ Strategies can be tested in isolation
- ✅ Clear separation: "what to do" vs "when to do it"
- ✅ Easy to understand: one strategy = one task type behavior

### Phase 3 Future Extensibility

Adding a new task type (e.g., `TemplateTaskStrategy`) is simple:

```python
# 1. Create new strategy file
class TemplateTaskStrategy(TaskStrategy):
    # Implement abstract methods
    pass

# 2. Update factory
def create(self, identifier: TaskIdentifier) -> TaskStrategy:
    if identifier.is_template:
        return TemplateTaskStrategy(self.db, self.collections)
    elif identifier.is_virtual:
        return VirtualTaskStrategy(self.db, self.collections)
    return RealTaskStrategy(self.db, self.collections)
```

**That's it!** No need to modify existing strategies or add `if` statements throughout the codebase.

**Estimated Time**: 4 hours

---

## Phase 4: Domain Events for Completion Flow

**Goal**: Decouple completion side effects

### 4.1 Define Domain Events

**File**: `backend/events/task_events.py` (NEW)

```python
"""Domain events for task lifecycle."""
from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from backend.models.task import Task, TaskStatus


@dataclass
class TaskEvent:
    """Base class for task events."""
    task_id: str
    child_id: str
    timestamp: datetime
    metadata: dict


@dataclass
class TaskCompleted(TaskEvent):
    """Fired when a task is completed."""
    completion_id: str
    session_number: int
    metrics: dict
    is_virtual: bool


@dataclass
class TaskStarted(TaskEvent):
    """Fired when a task is started."""
    pass


@dataclass
class TaskPaused(TaskEvent):
    """Fired when a task is paused."""
    pause_reason: Optional[str] = None
```

### 4.2 Create Event Bus

**File**: `backend/events/event_bus.py` (NEW)

```python
"""Simple in-memory event bus."""
from typing import Callable, Dict, List, Type
import asyncio


class EventBus:
    """Manages event subscribers and publishing."""

    def __init__(self):
        self._subscribers: Dict[Type, List[Callable]] = {}

    def subscribe(self, event_type: Type, handler: Callable):
        """Register an event handler."""
        if event_type not in self._subscribers:
            self._subscribers[event_type] = []
        self._subscribers[event_type].append(handler)

    async def publish(self, event):
        """Publish event to all subscribers."""
        event_type = type(event)
        handlers = self._subscribers.get(event_type, [])

        # Run all handlers concurrently
        results = await asyncio.gather(
            *[handler(event) for handler in handlers],
            return_exceptions=True
        )

        # Log any handler errors but don't fail
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                print(f"Event handler {i} failed: {result}")


# Global event bus instance
event_bus = EventBus()
```

### 4.3 Define Event Handlers

**File**: `backend/events/handlers/task_completion_handlers.py` (NEW)

```python
"""Handlers for task completion events."""
from backend.events.event_bus import event_bus
from backend.events.task_events import TaskCompleted
from backend.db.connection import db


async def update_task_status(event: TaskCompleted):
    """Update task status in database."""
    if not event.is_virtual:  # Only update real tasks
        await db.get_database().tasks.update_one(
            {"_id": event.task_id},
            {"$set": {"status": "completed", "completed_at": event.timestamp}}
        )


async def remove_active_session(event: TaskCompleted):
    """Remove active task session."""
    await db.get_database().active_task_sessions.delete_one(
        {"task_id": event.task_id}
    )


async def update_completion_count(event: TaskCompleted):
    """Increment task completion count."""
    # Only for multi-completion tasks
    pass


async def send_completion_notification(event: TaskCompleted):
    """Send notification to parent (future feature)."""
    # TODO: Implement when notifications are added
    pass


async def update_analytics(event: TaskCompleted):
    """Update analytics/metrics (future feature)."""
    # TODO: Implement when analytics are added
    pass


# Register handlers
event_bus.subscribe(TaskCompleted, update_task_status)
event_bus.subscribe(TaskCompleted, remove_active_session)
event_bus.subscribe(TaskCompleted, update_completion_count)
event_bus.subscribe(TaskCompleted, send_completion_notification)
event_bus.subscribe(TaskCompleted, update_analytics)
```

### 4.4 Refactor Completion to Use Events

**File**: `backend/routes/completion_routes.py`

**BEFORE**:
```python
# Save completion
await completions_collection.insert_one(completion_dict)

# Update task status
if not is_virtual_task and actual_task_id:
    await tasks_collection.update_one(
        {"_id": actual_task_id},
        {"$set": {"status": "completed", "completed_at": utcnow()}}
    )

# Remove session
await session_service.remove_session(task_id)

# Update completion count
if is_multi_completion:
    await tasks_collection.update_one(
        {"_id": actual_task_id},
        {"$inc": {"completion_count": 1}}
    )
```

**AFTER**:
```python
from backend.events.event_bus import event_bus
from backend.events.task_events import TaskCompleted

# Save completion
await completions_collection.insert_one(completion_dict)

# Publish event - handlers take care of the rest
await event_bus.publish(TaskCompleted(
    task_id=task_id,
    child_id=child_id,
    timestamp=utcnow(),
    completion_id=completion.completion_id,
    session_number=session_number,
    metrics=metrics,
    is_virtual=is_virtual_task,
    metadata={}
))
```

### Phase 4 Benefits

- ✅ Adding new actions doesn't modify completion route
- ✅ Handlers can be tested independently
- ✅ Easy to enable/disable features (comment out handler registration)
- ✅ Clear separation of concerns
- ✅ Handlers run concurrently for performance
- ✅ One handler failure doesn't break others

### Phase 4 Testing

```python
# Test a handler in isolation
async def test_update_task_status():
    event = TaskCompleted(
        task_id="123",
        child_id="456",
        timestamp=datetime.now(),
        completion_id="789",
        session_number=1,
        metrics={},
        is_virtual=False,
        metadata={}
    )

    await update_task_status(event)

    # Verify task status was updated
    task = await db.tasks.find_one({"_id": "123"})
    assert task["status"] == "completed"
```

**Estimated Time**: 3 hours

---

## Phase 5: Query Builders for Complex Queries

**Goal**: Eliminate scattered MongoDB query building

### 5.1 Create Query Builder Base

**File**: `backend/services/task_service/queries/base.py` (NEW)

```python
"""Query builder pattern for task queries."""
from abc import ABC, abstractmethod
from typing import Dict, Any, List


class QuerySpecification(ABC):
    """Abstract base for query specifications.

    Specifications can be combined using & (AND) and | (OR) operators.

    Example:
        spec = ChildTasksSpec(child_id) & OverdueTasksSpec() & ObligationLevelSpec("must_do")
        query = spec.to_query()
        # Returns: {"$and": [{"child_id": ...}, {"scheduled_date": ...}, {"obligation_level": ...}]}
    """

    @abstractmethod
    def to_query(self) -> Dict[str, Any]:
        """Convert specification to MongoDB query."""
        pass

    def __and__(self, other: 'QuerySpecification') -> 'AndSpecification':
        """Combine with AND logic."""
        return AndSpecification([self, other])

    def __or__(self, other: 'QuerySpecification') -> 'OrSpecification':
        """Combine with OR logic."""
        return OrSpecification([self, other])


class AndSpecification(QuerySpecification):
    """Combines multiple specifications with AND."""
    def __init__(self, specs: List[QuerySpecification]):
        self.specs = specs

    def to_query(self) -> Dict[str, Any]:
        queries = [spec.to_query() for spec in self.specs]
        return {"$and": queries} if len(queries) > 1 else queries[0]


class OrSpecification(QuerySpecification):
    """Combines multiple specifications with OR."""
    def __init__(self, specs: List[QuerySpecification]):
        self.specs = specs

    def to_query(self) -> Dict[str, Any]:
        queries = [spec.to_query() for spec in self.specs]
        return {"$or": queries}
```

### 5.2 Implement Concrete Specifications

**File**: `backend/services/task_service/queries/specifications.py` (NEW)

```python
"""Concrete query specifications for tasks."""
from datetime import date, datetime
from typing import Optional
from bson import ObjectId
from .base import QuerySpecification


class ChildTasksSpec(QuerySpecification):
    """Tasks belonging to specific child."""
    def __init__(self, child_id: str):
        self.child_id = ObjectId(child_id)

    def to_query(self):
        return {"child_id": self.child_id}


class TaskStatusSpec(QuerySpecification):
    """Tasks with specific status."""
    def __init__(self, status: str):
        self.status = status

    def to_query(self):
        return {"status": self.status}


class OverdueTasksSpec(QuerySpecification):
    """Tasks that are overdue."""
    def __init__(self, as_of_date: Optional[date] = None):
        self.as_of_date = as_of_date or date.today()

    def to_query(self):
        return {
            "scheduled_date": {"$lt": datetime.combine(self.as_of_date, datetime.min.time())},
            "status": {"$in": ["pending", "in_progress", "paused"]}
        }


class RecurringTasksSpec(QuerySpecification):
    """Tasks that are recurring."""
    def to_query(self):
        return {"is_recurring": True}


class NonRecurringTasksSpec(QuerySpecification):
    """Tasks that are NOT recurring."""
    def to_query(self):
        return {"is_recurring": False}


class DateRangeSpec(QuerySpecification):
    """Tasks within date range."""
    def __init__(self, start_date: date, end_date: date):
        self.start_date = datetime.combine(start_date, datetime.min.time())
        self.end_date = datetime.combine(end_date, datetime.max.time())

    def to_query(self):
        return {
            "scheduled_date": {
                "$gte": self.start_date,
                "$lte": self.end_date
            }
        }


class ObligationLevelSpec(QuerySpecification):
    """Tasks with specific obligation level."""
    def __init__(self, level: str):
        self.level = level

    def to_query(self):
        return {"obligation_level": self.level}


class TaskSourceSpec(QuerySpecification):
    """Tasks from specific source (routine, activity, one_time)."""
    def __init__(self, source: str):
        self.source = source

    def to_query(self):
        return {"task_source": self.source}
```

### 5.3 Refactor get_overdue_tasks

**File**: `backend/services/task_service/crud.py`

**BEFORE** (complex query building):
```python
async def get_overdue_tasks(self, child_id: str, parent_id: str, must_do_only: bool = False):
    # ... 100+ lines of complex query building ...
    query = {
        "child_id": child_id_obj,
        "parent_id": parent_id_obj,
        "scheduled_date": {"$lt": today},
        "status": {"$in": ["pending", "in_progress"]},
        "is_recurring": False
    }
    if must_do_only:
        query["obligation_level"] = "must_do"
    # ... more complex logic ...
```

**AFTER** (declarative query building):
```python
from .queries.specifications import (
    ChildTasksSpec, OverdueTasksSpec, ObligationLevelSpec,
    NonRecurringTasksSpec
)

async def get_overdue_tasks(self, child_id: str, parent_id: str, must_do_only: bool = False):
    # Build query using specifications
    spec = ChildTasksSpec(child_id) & OverdueTasksSpec() & NonRecurringTasksSpec()

    if must_do_only:
        spec = spec & ObligationLevelSpec("must_do")

    # Execute query
    query = spec.to_query()
    cursor = self.tasks_collection.find(query)
    tasks = await cursor.to_list(length=None)

    # Process results...
```

### Phase 5 Benefits

- ✅ Queries are composable and readable
- ✅ Reusable across different methods
- ✅ Easy to test specifications in isolation
- ✅ Self-documenting: `OverdueTasksSpec()` is clearer than raw MongoDB query
- ✅ Easier to modify query logic (change one specification)

### Phase 5 Example Usage

```python
# Get overdue must-do tasks for a child
spec = ChildTasksSpec(child_id) & OverdueTasksSpec() & ObligationLevelSpec("must_do")

# Get tasks due this week
from datetime import date, timedelta
today = date.today()
next_week = today + timedelta(days=7)
spec = ChildTasksSpec(child_id) & DateRangeSpec(today, next_week)

# Get all recurring routine tasks
spec = RecurringTasksSpec() & TaskSourceSpec("routine")

# Complex query with OR
spec = (ChildTasksSpec(child_id) & TaskStatusSpec("pending")) | TaskStatusSpec("in_progress")
```

**Estimated Time**: 3 hours

---

## Implementation Priority

### Priority Matrix

| Phase | Impact | Effort | Risk | Priority | Estimated Time |
|-------|--------|--------|------|----------|----------------|
| Phase 1: TaskIdentifier | 🔥 HIGH | ⚡ LOW | ✅ LOW | **1st** | 2 hours |
| Phase 2: State Machine | 🔥 HIGH | ⚡ LOW | ✅ LOW | **2nd** | 3 hours |
| Phase 3: Strategy Pattern | 🔥 MEDIUM | ⚡ MEDIUM | ⚠️ MEDIUM | **3rd** | 4 hours |
| Phase 5: Query Builders | 🔥 MEDIUM | ⚡ LOW | ✅ LOW | **4th** | 3 hours |
| Phase 4: Domain Events | 🔥 LOW | ⚡ MEDIUM | ⚠️ MEDIUM | **5th** | 3 hours |

**Total Estimated Time**: 15 hours (2 working days)

### Recommended Approach

**Option A: All at once** (Recommended for dedicated refactoring sprint)
- Set aside 2 days for refactoring
- Implement all phases sequentially
- Single large PR for review
- Benefits: Consistent architecture from day 1

**Option B: Incremental** (Recommended for ongoing development)
- Week 1: Phase 1 (TaskIdentifier)
- Week 2: Phase 2 (State Machine)
- Week 3: Phase 3 (Strategy Pattern)
- Week 4: Phase 5 (Query Builders)
- Week 5: Phase 4 (Domain Events) - if needed
- Benefits: Lower risk, easier to review, immediate benefits from each phase

---

## Success Metrics

### Code Quality Metrics

**Before Refactoring**:
- Cyclomatic complexity of `get_overdue_tasks()`: ~20
- Lines with `if "_" in task_id`: ~15 occurrences
- Number of files touched for adding new task type: ~10 files

**After Phase 1**:
- Lines with `if "_" in task_id`: 0 occurrences ✅
- Code duplication: -50 lines

**After Phase 2**:
- State transition violations caught: 100% ✅
- Cyclomatic complexity of `complete_task()`: ~5

**After Phase 3**:
- Number of files touched for new task type: 1 file (new strategy) ✅
- Unit test isolation: Each strategy testable independently

**After Phase 5**:
- Cyclomatic complexity of `get_overdue_tasks()`: ~5 ✅
- Query reusability: Specifications used in multiple methods

### Developer Experience Metrics

- Time to add new task type: 30 min → 5 min
- Time to understand state transitions: Need to read code → `visualize()` diagram
- Bug rate for task ID handling: Reduced by eliminating duplication
- Onboarding time: New developers understand faster with clear patterns

---

## Risks and Mitigation

### Risk 1: Breaking Changes

**Likelihood**: Medium
**Impact**: High

**Mitigation**:
- Implement alongside existing code (parallel implementation)
- Comprehensive integration tests before removal
- Feature flags to toggle new vs old implementation
- Gradual rollout (canary deployment)

### Risk 2: Performance Regression

**Likelihood**: Low
**Impact**: Medium

**Mitigation**:
- Benchmark before/after (especially `get_overdue_tasks()`)
- Profile hot paths with actual data
- Strategy pattern adds minimal overhead (one factory call)
- Event bus runs handlers concurrently

### Risk 3: Team Adoption

**Likelihood**: Medium
**Impact**: Medium

**Mitigation**:
- Document patterns with examples
- Pair programming for first implementations
- Code review guidelines
- Team training session after Phase 1

### Risk 4: Incomplete Refactoring

**Likelihood**: Low
**Impact**: Low

**Mitigation**:
- Each phase is independently useful
- Can stop after Phase 3 if needed
- Clear rollback points
- Document what's done and what's not

---

## Additional Patterns to Consider (Future)

### Repository Pattern (Currently Partial)

```python
class TaskRepository:
    async def find_by_id(self, id: TaskIdentifier) -> Task
    async def find_by_spec(self, spec: QuerySpecification) -> List[Task]
    async def save(self, task: Task) -> Task
    async def delete(self, id: TaskIdentifier) -> bool
```

**Benefits**: Complete abstraction of database access

### Unit of Work Pattern

```python
async with unit_of_work.begin():
    task = await repo.get(id)
    task.complete()
    await repo.save(task)
    await event_bus.publish(TaskCompleted(...))
    # All-or-nothing commit
```

**Benefits**: Transactional boundaries, easier to reason about consistency

### CQRS (Command Query Responsibility Segregation)

```python
# Command (write) - strict validation
await command_bus.execute(CompleteTaskCommand(task_id, child_id))

# Query (read) - optimized projection
overdue_view = await query_bus.execute(GetOverdueTasksQuery(child_id))
```

**Benefits**: Separate read and write models, optimize each independently

---

## References

### Design Patterns

- **Value Object**: TaskIdentifier encapsulates task ID logic
- **State Machine**: Explicit state transitions
- **Strategy Pattern**: Different behaviors for different task types
- **Observer Pattern**: Event bus notifies handlers
- **Specification Pattern**: Composable query building
- **Factory Pattern**: Create strategies based on task type

### Recommended Reading

1. **Domain-Driven Design** by Eric Evans
   - Chapter 4: Isolating the Domain
   - Chapter 5: A Model Expressed in Software

2. **Patterns of Enterprise Application Architecture** by Martin Fowler
   - Repository Pattern
   - Unit of Work Pattern
   - Domain Events

3. **Clean Architecture** by Robert Martin
   - Chapter 22: The Clean Architecture
   - Chapter 23: Presenters and Humble Objects

4. **Implementing Domain-Driven Design** by Vaughn Vernon
   - Chapter 5: Entities
   - Chapter 8: Domain Events

---

## Appendix: Quick Reference

### TaskIdentifier API

```python
identifier = TaskIdentifier(raw_id="507f1f77bcf86cd799439011_2025-12-10")

identifier.is_virtual          # True
identifier.is_real             # False
identifier.template_id         # "507f1f77bcf86cd799439011"
identifier.template_id_obj     # ObjectId("507f1f77bcf86cd799439011")
identifier.occurrence_date     # date(2025, 12, 10)
identifier.db_id              # ObjectId("507f1f77bcf86cd799439011")
identifier.to_db_query()      # {"_id": ObjectId(...)}
```

### State Machine API

```python
# Check if transition is valid
TaskStateMachine.can_transition(TaskStatus.PENDING, TaskStatus.COMPLETED)  # True

# Validate (raises ValueError if invalid)
TaskStateMachine.validate_transition(TaskStatus.PENDING, TaskStatus.COMPLETED)

# Get allowed transitions
allowed = TaskStateMachine.get_allowed_transitions(TaskStatus.PENDING)
# Returns: {IN_PROGRESS, COMPLETED, CANCELLED, SKIPPED}

# Visualize state machine
print(TaskStateMachine.visualize())
```

### Strategy Pattern API

```python
# Create strategy
factory = TaskStrategyFactory(db)
identifier = TaskIdentifier(raw_id=task_id)
strategy = factory.create(identifier)

# Use strategy
task = await strategy.get_task(identifier, parent_id)
completed = await strategy.complete_task(identifier, child_id)
history = await strategy.get_completion_history(identifier)

# Check behavior
if strategy.should_update_template_status():
    # Update status
    pass
```

### Event Bus API

```python
# Subscribe to event
event_bus.subscribe(TaskCompleted, my_handler)

# Publish event
await event_bus.publish(TaskCompleted(
    task_id=task_id,
    child_id=child_id,
    timestamp=utcnow(),
    completion_id=completion_id,
    session_number=1,
    metrics={},
    is_virtual=False,
    metadata={}
))
```

### Query Specifications API

```python
# Create specifications
spec1 = ChildTasksSpec(child_id)
spec2 = OverdueTasksSpec()
spec3 = ObligationLevelSpec("must_do")

# Combine with operators
spec = spec1 & spec2 & spec3  # AND
spec = spec1 | spec2          # OR

# Generate query
query = spec.to_query()
# Execute
cursor = collection.find(query)
```

---

**Document Version**: 2.0
**Created**: 2025-12-11
**Last Updated**: 2025-12-11
**Status**: ✅ COMPLETE - All 5 Phases Implemented

