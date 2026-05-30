# Phase 5: Query Builders (Specification Pattern) - Implementation Process

> **Status**: Not Started
> **Estimated Time**: 4-6 hours
> **Priority**: Low (Quality of life improvement)
> **Depends On**: Phase 3 (Strategy Pattern)

---

## Objectives

Implement Specification Pattern for composable, reusable query building, eliminating complex query construction logic scattered throughout the codebase.

**Success Criteria**:
- [ ] Specification base class implemented
- [ ] Concrete specifications for common queries
- [ ] Support for composition (& and | operators)
- [ ] Replace complex query building in get_overdue_tasks and get_tasks_by_child
- [ ] Self-documenting query logic
- [ ] All existing tests still passing

---

## Implementation Steps

### Step 1: Create Specification Base Class (1 hour)

**File**: `backend/services/task_service/specifications/__init__.py`

**Requirements**:
- Abstract base class with to_query() method
- Support for & (AND) and | (OR) operators
- Composable specifications
- Type-safe MongoDB query generation

**Code Template**:
```python
from abc import ABC, abstractmethod
from typing import Dict, Any

class Specification(ABC):
    """Base class for composable query specifications."""

    @abstractmethod
    def to_query(self) -> Dict[str, Any]:
        """Convert specification to MongoDB query dict."""
        pass

    def __and__(self, other: 'Specification') -> 'Specification':
        """Combine two specifications with AND."""
        return AndSpecification(self, other)

    def __or__(self, other: 'Specification') -> 'Specification':
        """Combine two specifications with OR."""
        return OrSpecification(self, other)


class AndSpecification(Specification):
    """Combines two specifications with AND logic."""

    def __init__(self, left: Specification, right: Specification):
        self.left = left
        self.right = right

    def to_query(self) -> Dict[str, Any]:
        left_query = self.left.to_query()
        right_query = self.right.to_query()

        # Merge queries with $and if both non-empty
        if left_query and right_query:
            return {"$and": [left_query, right_query]}
        return left_query or right_query


class OrSpecification(Specification):
    """Combines two specifications with OR logic."""

    def __init__(self, left: Specification, right: Specification):
        self.left = left
        self.right = right

    def to_query(self) -> Dict[str, Any]:
        left_query = self.left.to_query()
        right_query = self.right.to_query()

        # Merge queries with $or if both non-empty
        if left_query and right_query:
            return {"$or": [left_query, right_query]}
        return left_query or right_query
```

**Tests** (`tests/backend/services/task_service/specifications/test_specification.py`):
```python
from backend.services.task_service.specifications import Specification, AndSpecification, OrSpecification

class SimpleSpec(Specification):
    def __init__(self, field: str, value: Any):
        self.field = field
        self.value = value

    def to_query(self):
        return {self.field: self.value}

def test_and_specification():
    spec1 = SimpleSpec("status", "pending")
    spec2 = SimpleSpec("child_id", "123")

    combined = spec1 & spec2
    query = combined.to_query()

    assert query == {"$and": [{"status": "pending"}, {"child_id": "123"}]}

def test_or_specification():
    spec1 = SimpleSpec("status", "pending")
    spec2 = SimpleSpec("status", "in_progress")

    combined = spec1 | spec2
    query = combined.to_query()

    assert query == {"$or": [{"status": "pending"}, {"status": "in_progress"}]}

def test_complex_composition():
    spec = (SimpleSpec("child_id", "123") & SimpleSpec("status", "pending")) | SimpleSpec("status", "overdue")
    query = spec.to_query()

    # Should create nested query
    assert "$or" in query
    assert "$and" in query["$or"][0]
```

**Checklist**:
- [ ] File created: `backend/services/task_service/specifications/__init__.py`
- [ ] Tests created: `tests/backend/services/task_service/specifications/test_specification.py`
- [ ] Tests passing: `pytest tests/backend/services/task_service/specifications/ -v`
- [ ] Composition operators working

---

### Step 2: Implement Common Specifications (2 hours)

**File**: `backend/services/task_service/specifications/task_specs.py`

**Requirements**:
- Specifications for common query patterns
- Clear, descriptive class names
- Reusable across different queries

**Code Template**:
```python
from datetime import date, datetime
from typing import List, Optional
from bson import ObjectId
from backend.services.task_service.specifications import Specification
from backend.models.task import TaskStatus, ObligationLevel

class ChildTasksSpec(Specification):
    """Specification for tasks belonging to a child."""

    def __init__(self, child_id: str):
        self.child_id = child_id

    def to_query(self):
        try:
            child_id_obj = ObjectId(self.child_id)
            return {"child_id": child_id_obj}
        except:
            return {"child_id": self.child_id}


class TaskStatusSpec(Specification):
    """Specification for tasks with a specific status."""

    def __init__(self, status: TaskStatus):
        self.status = status

    def to_query(self):
        return {"status": self.status.value}


class TaskStatusInSpec(Specification):
    """Specification for tasks with status in a list."""

    def __init__(self, statuses: List[TaskStatus]):
        self.statuses = statuses

    def to_query(self):
        return {"status": {"$in": [s.value for s in self.statuses]}}


class OverdueTasksSpec(Specification):
    """Specification for overdue tasks (scheduled_date < today)."""

    def __init__(self, reference_date: Optional[date] = None):
        self.reference_date = reference_date or date.today()

    def to_query(self):
        return {"scheduled_date": {"$lt": datetime.combine(self.reference_date, datetime.min.time())}}


class ScheduledDateRangeSpec(Specification):
    """Specification for tasks within a date range."""

    def __init__(self, start_date: Optional[date] = None, end_date: Optional[date] = None):
        self.start_date = start_date
        self.end_date = end_date

    def to_query(self):
        query = {}
        if self.start_date:
            query["scheduled_date"] = {"$gte": datetime.combine(self.start_date, datetime.min.time())}
        if self.end_date:
            if "scheduled_date" in query:
                query["scheduled_date"]["$lte"] = datetime.combine(self.end_date, datetime.max.time())
            else:
                query["scheduled_date"] = {"$lte": datetime.combine(self.end_date, datetime.max.time())}
        return query


class ObligationLevelSpec(Specification):
    """Specification for tasks with a specific obligation level."""

    def __init__(self, level: ObligationLevel):
        self.level = level

    def to_query(self):
        return {"obligation_level": self.level.value}


class NonRecurringTasksSpec(Specification):
    """Specification for non-recurring (one-time) tasks."""

    def to_query(self):
        return {"is_recurring": False}


class ParentAuthorizedSpec(Specification):
    """Specification for tasks the parent is authorized to access."""

    def __init__(self, parent_id: str):
        self.parent_id = parent_id

    def to_query(self):
        try:
            parent_id_obj = ObjectId(self.parent_id)
            return {"$or": [{"parent_id": parent_id_obj}, {"parent_id": self.parent_id}]}
        except:
            return {"parent_id": self.parent_id}


class NotSkippedOrCancelledSpec(Specification):
    """Specification for tasks that are not skipped or cancelled."""

    def to_query(self):
        return {
            "status": {
                "$nin": [TaskStatus.SKIPPED.value, TaskStatus.CANCELLED.value]
            }
        }
```

**Tests** (`tests/backend/services/task_service/specifications/test_task_specs.py`):
```python
from datetime import date, datetime
from backend.services.task_service.specifications.task_specs import (
    ChildTasksSpec, TaskStatusSpec, OverdueTasksSpec, ObligationLevelSpec
)
from backend.models.task import TaskStatus, ObligationLevel

def test_child_tasks_spec():
    spec = ChildTasksSpec("507f1f77bcf86cd799439011")
    query = spec.to_query()
    assert "child_id" in query

def test_task_status_spec():
    spec = TaskStatusSpec(TaskStatus.PENDING)
    query = spec.to_query()
    assert query == {"status": "pending"}

def test_overdue_tasks_spec():
    spec = OverdueTasksSpec(reference_date=date(2025, 12, 10))
    query = spec.to_query()
    assert "scheduled_date" in query
    assert "$lt" in query["scheduled_date"]

def test_obligation_level_spec():
    spec = ObligationLevelSpec(ObligationLevel.MUST_DO)
    query = spec.to_query()
    assert query == {"obligation_level": "must_do"}

def test_composition():
    spec = (
        ChildTasksSpec("123") &
        TaskStatusSpec(TaskStatus.PENDING) &
        OverdueTasksSpec()
    )
    query = spec.to_query()
    assert "$and" in query
```

**Checklist**:
- [ ] File created: `backend/services/task_service/specifications/task_specs.py`
- [ ] Tests created: `tests/backend/services/task_service/specifications/test_task_specs.py`
- [ ] All specifications implemented
- [ ] Tests passing

---

### Step 3: Update get_overdue_tasks (1 hour)

**File**: `backend/services/task_service/crud.py`

**Current Code** (lines 495-670):
```python
async def get_overdue_tasks(...):
    # Complex manual query building
    all_tasks = await self.get_tasks_by_child(child_id, parent_id, None, None, today)

    # Manual filtering and grouping
    overdue_tasks = []
    for task in all_tasks:
        if not isinstance(task, dict):
            task_dict = task.model_dump(by_alias=True)
        else:
            task_dict = task

        scheduled_date_str = self._parse_date(task_dict.get("scheduled_date"))
        if scheduled_date_str and scheduled_date_str < today_str:
            # ... complex logic ...
```

**New Code**:
```python
from backend.services.task_service.specifications.task_specs import (
    ChildTasksSpec, TaskStatusInSpec, OverdueTasksSpec, NotSkippedOrCancelledSpec
)

async def get_overdue_tasks(...):
    # Build query using specifications
    spec = (
        ChildTasksSpec(child_id) &
        OverdueTasksSpec(today) &
        TaskStatusInSpec([TaskStatus.PENDING, TaskStatus.IN_PROGRESS]) &
        NotSkippedOrCancelledSpec()
    )

    if must_do_only:
        spec = spec & ObligationLevelSpec(ObligationLevel.MUST_DO)

    query = spec.to_query()

    # Fetch tasks with composed query
    all_tasks = await self.get_tasks_by_child(child_id, parent_id, None, None, today)

    # ... rest of grouping logic ...
```

**Checklist**:
- [ ] Import specifications
- [ ] Replace manual query building with specifications
- [ ] Run tests: `pytest tests/backend/services/task_service/test_crud.py::test_get_overdue_tasks -v`
- [ ] All tests passing

---

### Step 4: Update get_tasks_by_child (1 hour)

**File**: `backend/services/task_service/crud.py`

**Current Code**:
```python
async def get_tasks_by_child(...):
    query = {
        "child_id": child_id_obj,
        "is_recurring": False,
        "status": {"$nin": ["skipped", "cancelled"]},
    }

    if status:
        query["status"] = status.value
```

**New Code**:
```python
async def get_tasks_by_child(...):
    spec = (
        ChildTasksSpec(child_id) &
        NonRecurringTasksSpec() &
        NotSkippedOrCancelledSpec()
    )

    if status:
        spec = spec & TaskStatusSpec(status)

    if start_date or end_date:
        spec = spec & ScheduledDateRangeSpec(start_date, end_date)

    query = spec.to_query()
    # ... rest of logic ...
```

**Checklist**:
- [ ] Replace manual query building
- [ ] Run tests: `pytest tests/backend/services/task_service/test_crud.py::test_get_tasks_by_child -v`
- [ ] All tests passing

---

### Step 5: Search for Other Query Building (1 hour)

**Search for Complex Queries**:
```bash
# Find manual query building
grep -rn "query = {" backend/services/task_service/
grep -rn '\$and' backend/services/task_service/
grep -rn '\$or' backend/services/task_service/
```

**Files to Check**:
- `backend/services/task_service/crud.py` (other methods)
- `backend/services/task_service/recurrence.py`
- `backend/routes/task_routes.py`

**Replace with Specifications** where appropriate:
- Focus on complex queries (3+ conditions)
- Simple queries (1-2 conditions) can remain as-is

**Checklist**:
- [ ] All complex query building replaced
- [ ] Simple queries left as-is (overhead not worth it)
- [ ] Run full test suite: `pytest tests/backend/ -v`

---

### Step 6: Documentation (30 min)

**File**: `docs/architecture/specifications-guide.md`

**Content**:
```markdown
# Query Specifications Guide

## Overview

Specifications provide a composable, reusable way to build MongoDB queries.

## Basic Usage

```python
from backend.services.task_service.specifications.task_specs import (
    ChildTasksSpec, TaskStatusSpec, OverdueTasksSpec
)

# Single specification
spec = ChildTasksSpec("507f1f77bcf86cd799439011")
query = spec.to_query()  # {"child_id": ObjectId("...")}

# Composed specifications (AND)
spec = ChildTasksSpec("123") & TaskStatusSpec(TaskStatus.PENDING)
query = spec.to_query()  # {"$and": [{"child_id": ...}, {"status": "pending"}]}

# Composed specifications (OR)
spec = TaskStatusSpec(TaskStatus.PENDING) | TaskStatusSpec(TaskStatus.IN_PROGRESS)
query = spec.to_query()  # {"$or": [{"status": "pending"}, {"status": "in_progress"}]}
```

## Available Specifications

[... list all specifications with examples ...]

## Creating New Specifications

[... template and guidelines ...]
```

**Checklist**:
- [ ] specifications-guide.md created
- [ ] All specifications documented with examples
- [ ] Guidelines for creating new specifications

---

### Step 7: Integration Testing (1 hour)

**Test Scenarios**:

1. **Overdue Tasks Query**:
   - Use composed spec to fetch overdue tasks
   - Verify results match manual query

2. **Task List Query**:
   - Use composed spec to fetch child's tasks
   - Verify filtering and date ranges work

3. **Complex Composition**:
   - Combine 4+ specifications with & and |
   - Verify query correctness

**Checklist**:
- [ ] All query results match expected
- [ ] Composition works correctly
- [ ] Manual testing confirms behavior

---

### Step 8: Documentation and Review (30 min)

**Updates Needed**:
1. Update `docs/architecture/implementation-progress.md`
2. Add specification pattern to architecture-patterns.md (if not present)

**Checklist**:
- [ ] implementation-progress.md updated (Phase 5 complete)
- [ ] specifications-guide.md complete
- [ ] Code review against `.claude/skills/architecture-patterns.md`

---

## Testing Checklist

### Unit Tests
- [ ] `test_specification.py` - Composition logic
- [ ] `test_task_specs.py` - All concrete specifications
- [ ] Edge cases: empty queries, null values

### Integration Tests
- [ ] Get overdue tasks using specifications
- [ ] Get child tasks using specifications
- [ ] Complex multi-level composition

### Manual Tests
1. [ ] Child portal: View overdue tasks
2. [ ] Child portal: View all tasks
3. [ ] Parent portal: Filter tasks by status
4. [ ] Verify query performance (no regression)

---

## Rollback Plan

If issues arise:
1. Revert to Phase 4 completion commit
2. Keep specification classes but don't use in queries
3. Address issues and retry

**Git Strategy**:
- Create branch: `refactor/phase-5-queries`
- Commit after each query method updated
- Merge to main only when all tests pass

---

## Success Metrics

**Before**:
- Complex query building in ~5 places
- Hard to reuse query logic
- Difficult to read/understand queries

**After**:
- Reusable query specifications
- Self-documenting query logic
- Easy to compose complex queries

**Measurements**:
```bash
# Count manual query dicts (should be reduced)
grep -r "query = {" backend/services/task_service/ | wc -l

# Count specification usage
grep -r "Spec(" backend/services/task_service/ | wc -l
```

---

## Notes and Issues

### Issues Encountered
- None yet

### Design Decisions
- Use & and | operators for composition (Pythonic)
- Keep simple queries (1-2 conditions) as manual dicts
- Focus on complex, reusable queries

### Questions
- Should we support NOT operator? (Decision: Not needed for now, use NotSkippedOrCancelledSpec pattern)

---

## References

- **Architecture Patterns**: [../../.claude/skills/architecture-patterns.md](../../.claude/skills/architecture-patterns.md)
- **Refactoring Plan**: [task-system-refactoring-plan.md](task-system-refactoring-plan.md)
- **Implementation Progress**: [implementation-progress.md](implementation-progress.md)
- **Phase 3**: [phase-3-strategy-process.md](phase-3-strategy-process.md)
