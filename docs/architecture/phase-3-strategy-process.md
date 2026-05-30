# Phase 3: Strategy Pattern - Implementation Process

> **Status**: Not Started
> **Estimated Time**: 8-10 hours
> **Priority**: Medium (Major refactoring)
> **Depends On**: Phase 1 (TaskIdentifier), Phase 2 (State Machine)

---

## Objectives

Apply Strategy Pattern to eliminate conditional logic for real vs virtual tasks, making it easy to add new task types without modifying existing code.

**Success Criteria**:
- [ ] TaskStrategy base class implemented
- [ ] RealTaskStrategy and VirtualTaskStrategy implemented
- [ ] TaskStrategyFactory implemented
- [ ] Zero `if is_virtual` or `if "_" in task_id` in business logic
- [ ] Each strategy independently testable
- [ ] All existing tests still passing

---

## Implementation Steps

### Step 1: Define Strategy Interface (1 hour)

**File**: `backend/services/task_service/strategies/__init__.py`

**Requirements**:
- Abstract base class with core operations
- Clear interface for task retrieval, completion, deletion
- Support for both CRUD and lifecycle operations

**Code Template**:
```python
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any
from backend.models.task import Task
from backend.models.task_identifier import TaskIdentifier

class TaskStrategy(ABC):
    """Abstract strategy for task operations."""

    def __init__(self, db, collections):
        self.db = db
        self.tasks_collection = collections["tasks"]
        self.sessions_collection = collections["sessions"]

    @abstractmethod
    async def get_task(
        self, identifier: TaskIdentifier, parent_id: str
    ) -> Optional[Task]:
        """Retrieve task by identifier."""
        pass

    @abstractmethod
    async def complete_task(
        self, identifier: TaskIdentifier, child_id: str
    ) -> Optional[Task]:
        """Complete task."""
        pass

    @abstractmethod
    async def delete_task(
        self, identifier: TaskIdentifier, parent_id: str
    ) -> bool:
        """Delete task or add exception."""
        pass

    @abstractmethod
    async def update_task(
        self, identifier: TaskIdentifier, parent_id: str, task_data: Dict[str, Any]
    ) -> Optional[Task]:
        """Update task."""
        pass
```

**Checklist**:
- [ ] File created: `backend/services/task_service/strategies/__init__.py`
- [ ] TaskStrategy base class defined
- [ ] All abstract methods documented
- [ ] Type hints complete

---

### Step 2: Implement RealTaskStrategy (2 hours)

**File**: `backend/services/task_service/strategies/real_task_strategy.py`

**Requirements**:
- Handle standard database tasks with ObjectId
- Direct database CRUD operations
- No virtual task or template logic

**Code Template**:
```python
from typing import Optional, Dict, Any
from bson import ObjectId
from backend.models.task import Task
from backend.models.task_identifier import TaskIdentifier
from backend.services.task_service.strategies import TaskStrategy
from backend.utils.validation import validate_object_id

class RealTaskStrategy(TaskStrategy):
    """Strategy for real database tasks."""

    async def get_task(
        self, identifier: TaskIdentifier, parent_id: str
    ) -> Optional[Task]:
        """Get task from database by ObjectId."""
        if not identifier.is_real:
            return None

        task_id_obj = validate_object_id(identifier.raw_id, "task_id", raise_http_exception=False)
        parent_id_obj = validate_object_id(parent_id, "parent_id", raise_http_exception=False)

        doc = await self.tasks_collection.find_one({
            "_id": task_id_obj,
            "$or": [{"parent_id": parent_id_obj}, {"parent_id": parent_id}]
        })
        return Task(**doc) if doc else None

    async def complete_task(
        self, identifier: TaskIdentifier, child_id: str
    ) -> Optional[Task]:
        """Complete real task in database."""
        # Implementation: Standard database update
        pass

    async def delete_task(
        self, identifier: TaskIdentifier, parent_id: str
    ) -> bool:
        """Delete real task from database."""
        # Implementation: Standard database deletion
        pass

    async def update_task(
        self, identifier: TaskIdentifier, parent_id: str, task_data: Dict[str, Any]
    ) -> Optional[Task]:
        """Update real task in database."""
        # Implementation: Standard database update
        pass
```

**Tests** (`tests/backend/services/task_service/strategies/test_real_task_strategy.py`):
```python
@pytest.fixture
async def strategy(db):
    collections = {
        "tasks": db.tasks,
        "sessions": db.active_task_sessions,
    }
    return RealTaskStrategy(db, collections)

async def test_get_real_task(strategy, sample_task):
    identifier = TaskIdentifier(raw_id=str(sample_task.id))
    task = await strategy.get_task(identifier, parent_id)
    assert task is not None
    assert task.id == sample_task.id

async def test_get_virtual_task_returns_none(strategy):
    identifier = TaskIdentifier(raw_id="507f1f77bcf86cd799439011_2025-12-10")
    task = await strategy.get_task(identifier, parent_id)
    assert task is None  # Real strategy doesn't handle virtual
```

**Checklist**:
- [ ] File created: `backend/services/task_service/strategies/real_task_strategy.py`
- [ ] Tests created: `tests/backend/services/task_service/strategies/test_real_task_strategy.py`
- [ ] All methods implemented
- [ ] Tests passing: `pytest tests/backend/services/task_service/strategies/test_real_task_strategy.py -v`

---

### Step 3: Implement VirtualTaskStrategy (2 hours)

**File**: `backend/services/task_service/strategies/virtual_task_strategy.py`

**Requirements**:
- Handle virtual task instances
- Generate instances from templates
- Materialize virtual tasks when needed
- Add recurrence exceptions

**Code Template**:
```python
from typing import Optional, Dict, Any
from datetime import datetime
from bson import ObjectId
from backend.models.task import Task
from backend.models.task_identifier import TaskIdentifier
from backend.services.task_service.strategies import TaskStrategy
from backend.services.virtual_instance_service import VirtualInstanceService

class VirtualTaskStrategy(TaskStrategy):
    """Strategy for virtual task instances."""

    def __init__(self, db, collections, recurrence_service):
        super().__init__(db, collections)
        self.recurrence_service = recurrence_service

    async def get_task(
        self, identifier: TaskIdentifier, parent_id: str
    ) -> Optional[Task]:
        """Generate virtual task instance from template."""
        if not identifier.is_virtual:
            return None

        # Fetch template
        template_id_obj = ObjectId(identifier.template_id)
        parent_id_obj = ObjectId(parent_id)

        template_doc = await self.tasks_collection.find_one({
            "_id": template_id_obj,
            "$or": [{"parent_id": parent_id_obj}, {"parent_id": parent_id}]
        })

        if not template_doc or not template_doc.get("is_recurring"):
            return None

        # Generate virtual instance
        template = Task(**template_doc)
        virtual_instance = VirtualInstanceService._create_virtual_instance(
            template, identifier.occurrence_date
        )
        return Task.model_construct(**virtual_instance)

    async def complete_task(
        self, identifier: TaskIdentifier, child_id: str
    ) -> Optional[Task]:
        """Materialize and complete virtual task."""
        # Implementation: Materialize, then complete
        pass

    async def delete_task(
        self, identifier: TaskIdentifier, parent_id: str
    ) -> bool:
        """Add 'deleted' exception to template."""
        # Implementation: Use recurrence_service.add_exception
        pass

    async def update_task(
        self, identifier: TaskIdentifier, parent_id: str, task_data: Dict[str, Any]
    ) -> Optional[Task]:
        """Materialize and update virtual task (or add 'modified' exception)."""
        # Implementation: Use recurrence_service.add_exception with overrides
        pass
```

**Tests** (`tests/backend/services/task_service/strategies/test_virtual_task_strategy.py`):
```python
async def test_get_virtual_task(strategy, sample_recurring_task):
    identifier = TaskIdentifier(raw_id=f"{sample_recurring_task.id}_2025-12-10")
    task = await strategy.get_task(identifier, parent_id)
    assert task is not None
    assert task.scheduled_date.date() == date(2025, 12, 10)

async def test_get_real_task_returns_none(strategy):
    identifier = TaskIdentifier(raw_id="507f1f77bcf86cd799439011")
    task = await strategy.get_task(identifier, parent_id)
    assert task is None  # Virtual strategy doesn't handle real
```

**Checklist**:
- [ ] File created: `backend/services/task_service/strategies/virtual_task_strategy.py`
- [ ] Tests created: `tests/backend/services/task_service/strategies/test_virtual_task_strategy.py`
- [ ] All methods implemented
- [ ] Tests passing: `pytest tests/backend/services/task_service/strategies/test_virtual_task_strategy.py -v`

---

### Step 4: Implement TaskStrategyFactory (1 hour)

**File**: `backend/services/task_service/strategies/factory.py`

**Requirements**:
- Select appropriate strategy based on TaskIdentifier
- Initialize strategies with dependencies
- Cache strategy instances

**Code Template**:
```python
from typing import Dict
from backend.models.task_identifier import TaskIdentifier
from backend.services.task_service.strategies import TaskStrategy
from backend.services.task_service.strategies.real_task_strategy import RealTaskStrategy
from backend.services.task_service.strategies.virtual_task_strategy import VirtualTaskStrategy

class TaskStrategyFactory:
    """Factory for selecting task strategies."""

    def __init__(self, db, collections, recurrence_service):
        self.db = db
        self.collections = collections
        self.recurrence_service = recurrence_service

        # Cache strategy instances
        self._strategies: Dict[str, TaskStrategy] = {
            "real": RealTaskStrategy(db, collections),
            "virtual": VirtualTaskStrategy(db, collections, recurrence_service),
        }

    def get_strategy(self, identifier: TaskIdentifier) -> TaskStrategy:
        """Select strategy based on task identifier."""
        if identifier.is_virtual:
            return self._strategies["virtual"]
        else:
            return self._strategies["real"]
```

**Tests** (`tests/backend/services/task_service/strategies/test_factory.py`):
```python
async def test_factory_returns_real_strategy():
    identifier = TaskIdentifier(raw_id="507f1f77bcf86cd799439011")
    strategy = factory.get_strategy(identifier)
    assert isinstance(strategy, RealTaskStrategy)

async def test_factory_returns_virtual_strategy():
    identifier = TaskIdentifier(raw_id="507f1f77bcf86cd799439011_2025-12-10")
    strategy = factory.get_strategy(identifier)
    assert isinstance(strategy, VirtualTaskStrategy)
```

**Checklist**:
- [ ] File created: `backend/services/task_service/strategies/factory.py`
- [ ] Tests created: `tests/backend/services/task_service/strategies/test_factory.py`
- [ ] Factory logic implemented
- [ ] Tests passing

---

### Step 5: Update TaskCRUD to Use Strategies (2 hours)

**File**: `backend/services/task_service/crud.py`

**Current Code** (get_task_by_id, lines 440-495):
```python
async def get_task_by_id(self, task_id: str, parent_id: str) -> Optional[Task]:
    # Check if this is a virtual task ID (format: template_id_date)
    if "_" in task_id and not task_id.count("_") > 2:
        # ... manual virtual task logic ...

    # Regular task lookup by ObjectId
    # ... manual real task logic ...
```

**New Code**:
```python
from backend.services.task_service.strategies.factory import TaskStrategyFactory
from backend.models.task_identifier import TaskIdentifier

async def get_task_by_id(self, task_id: str, parent_id: str) -> Optional[Task]:
    identifier = TaskIdentifier(raw_id=task_id)
    strategy = self.strategy_factory.get_strategy(identifier)
    return await strategy.get_task(identifier, parent_id)
```

**Checklist**:
- [ ] Initialize TaskStrategyFactory in TaskCRUD.__init__
- [ ] Update get_task_by_id
- [ ] Update delete_task
- [ ] Run tests: `pytest tests/backend/services/task_service/test_crud.py -v`
- [ ] All tests passing

---

### Step 6: Update TaskLifecycle to Use Strategies (1 hour)

**File**: `backend/services/task_service/lifecycle.py`

**Methods to Update**:
- `start_task` (materialize virtual if needed)
- `complete_task` (materialize virtual if needed)

**Pattern**:
```python
async def complete_task(self, task_id: str, child_id: str) -> Optional[Task]:
    identifier = TaskIdentifier(raw_id=task_id)
    strategy = self.strategy_factory.get_strategy(identifier)

    # Get task (real or virtual)
    task = await strategy.get_task(identifier, parent_id)

    # Validate and complete
    # ... rest of logic ...

    # Use strategy for completion
    return await strategy.complete_task(identifier, child_id)
```

**Checklist**:
- [ ] Initialize TaskStrategyFactory in TaskLifecycle.__init__
- [ ] Update start_task
- [ ] Update complete_task
- [ ] Run tests: `pytest tests/backend/services/task_service/test_lifecycle.py -v`

---

### Step 7: Remove Conditional Logic (1 hour)

**Search for Remaining Conditionals**:
```bash
# Find is_virtual checks
grep -rn "is_virtual" backend/ | grep -v "strategy"

# Find manual task ID checks
grep -rn 'if "_" in' backend/ | grep task_id
```

**Files to Check**:
- `backend/routes/completion_routes.py`
- `backend/services/task_service/virtual_materialization.py`

**Replace Patterns**:
```python
# BEFORE
if is_virtual_task:
    # virtual logic
else:
    # real logic

# AFTER
identifier = TaskIdentifier(raw_id=task_id)
strategy = factory.get_strategy(identifier)
await strategy.operation(identifier, ...)
```

**Checklist**:
- [ ] All conditional logic replaced
- [ ] Run full backend test suite: `pytest tests/backend/ -v`
- [ ] All tests passing

---

### Step 8: Integration Testing (1 hour)

**Test Scenarios**:

1. **Real Task Operations**:
   - Create real task → Get → Update → Delete

2. **Virtual Task Operations**:
   - Create recurring task → Get virtual instance → Complete → Verify exception added

3. **Mixed Operations**:
   - Get overdue tasks (mix of real and virtual)
   - Complete mix of real and virtual tasks

4. **Strategy Selection**:
   - Verify correct strategy selected for each identifier type

**Checklist**:
- [ ] All real task operations work
- [ ] All virtual task operations work
- [ ] Mixed operations work correctly
- [ ] Manual testing in UI confirms behavior

---

### Step 9: Documentation and Review (30 min)

**Updates Needed**:
1. Update `docs/architecture/implementation-progress.md`
2. Add strategy pattern example to architecture-patterns.md (if not present)
3. Create strategy selection diagram

**Checklist**:
- [ ] implementation-progress.md updated (Phase 3 complete)
- [ ] Strategy pattern documented
- [ ] Code review against `.claude/skills/architecture-patterns.md`
- [ ] Team review of strategy design

---

## Testing Checklist

### Unit Tests
- [ ] `test_real_task_strategy.py` - All real task operations
- [ ] `test_virtual_task_strategy.py` - All virtual task operations
- [ ] `test_factory.py` - Strategy selection
- [ ] Edge cases: Invalid identifiers, missing templates

### Integration Tests
- [ ] Create and complete real task
- [ ] Create recurring task and complete virtual instance
- [ ] Delete virtual instance (adds exception)
- [ ] Update virtual instance (adds modified exception)

### Manual Tests
1. [ ] Child portal: Complete real task
2. [ ] Child portal: Complete virtual task from overdue
3. [ ] Parent portal: Edit virtual task occurrence
4. [ ] Parent portal: Delete virtual task occurrence
5. [ ] Parent portal: View completions (mix of real/virtual)

---

## Rollback Plan

If issues arise:
1. Revert to Phase 2 completion commit
2. Keep strategy classes but don't use in CRUD/Lifecycle
3. Address issues and retry

**Git Strategy**:
- Create branch: `refactor/phase-3-strategy`
- Commit after each strategy implemented
- Merge to main only when all tests pass

---

## Success Metrics

**Before**:
- Virtual task logic scattered in ~10 files
- `if is_virtual` checks throughout codebase
- Hard to add new task types

**After**:
- Virtual task logic in VirtualTaskStrategy only
- Zero `if is_virtual` checks in business logic
- New task types = new strategy class (no existing code modified)

**Measurements**:
```bash
# Count conditional checks (should be 0 after, except in strategies/)
grep -r "is_virtual" backend/ | grep -v "strategy" | wc -l
grep -r 'if "_" in.*task_id' backend/ | grep -v "strategy" | wc -l
```

---

## Notes and Issues

### Issues Encountered
- None yet

### Design Decisions
- Each strategy is stateless and reusable
- Factory caches strategy instances for performance
- Strategies handle both CRUD and lifecycle operations

### Questions
- Should we add a CompositeTaskStrategy for mixed operations? (Decision: Not needed for now)

---

## References

- **Architecture Patterns**: [../../.claude/skills/architecture-patterns.md](../../.claude/skills/architecture-patterns.md)
- **Refactoring Plan**: [task-system-refactoring-plan.md](task-system-refactoring-plan.md)
- **Implementation Progress**: [implementation-progress.md](implementation-progress.md)
- **Phase 1**: [phase-1-taskidentifier-process.md](phase-1-taskidentifier-process.md)
- **Phase 2**: [phase-2-statemachine-process.md](phase-2-statemachine-process.md)
