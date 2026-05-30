# Phase 2: State Machine - Implementation Process

> **Status**: Not Started
> **Estimated Time**: 6-8 hours
> **Priority**: High (Foundation for lifecycle management)
> **Depends On**: Phase 1 (TaskIdentifier)

---

## Objectives

Create a TaskStateMachine to centralize all state transition validation logic, replacing scattered status checks throughout the codebase.

**Success Criteria**:
- [ ] TaskStateMachine class implemented with all transitions defined
- [ ] All lifecycle methods use state machine validation
- [ ] Zero scattered status checks in business logic
- [ ] State diagram visualization created
- [ ] Comprehensive test coverage (>90%)
- [ ] All existing tests still passing

---

## Implementation Steps

### Step 1: Define State Machine Class (1 hour)

**File**: `backend/models/task_state_machine.py`

**Requirements**:
- Define all TaskStatus states as transitions
- Define valid transitions dictionary
- Provide validation methods
- Support optional transition reasons

**Code Template**:
```python
from enum import Enum
from typing import Dict, List, Optional, Set
from backend.models.task import TaskStatus

class TaskStateMachine:
    """State machine for task lifecycle transitions."""

    # Define valid transitions
    TRANSITIONS: Dict[TaskStatus, Set[TaskStatus]] = {
        TaskStatus.DRAFT: {TaskStatus.SCHEDULED, TaskStatus.CANCELLED},
        TaskStatus.SCHEDULED: {
            TaskStatus.IN_PROGRESS,
            TaskStatus.PENDING,
            TaskStatus.COMPLETED,  # Direct completion for simple tasks
            TaskStatus.SKIPPED,
            TaskStatus.CANCELLED,
        },
        TaskStatus.PENDING: {
            TaskStatus.IN_PROGRESS,
            TaskStatus.COMPLETED,  # Direct completion
            TaskStatus.SKIPPED,
            TaskStatus.CANCELLED,
        },
        TaskStatus.IN_PROGRESS: {
            TaskStatus.PAUSED,
            TaskStatus.COMPLETED,
            TaskStatus.CANCELLED,
        },
        TaskStatus.PAUSED: {
            TaskStatus.IN_PROGRESS,  # Resume
            TaskStatus.COMPLETED,    # Direct completion
            TaskStatus.CANCELLED,
        },
        TaskStatus.COMPLETED: {
            TaskStatus.PENDING,  # Uncomplete
        },
        TaskStatus.SKIPPED: {
            TaskStatus.PENDING,  # Restore
        },
        TaskStatus.CANCELLED: set(),  # Terminal state
    }

    @classmethod
    def can_transition(cls, from_status: TaskStatus, to_status: TaskStatus) -> bool:
        """Check if transition is valid."""
        pass

    @classmethod
    def validate_transition(
        cls, from_status: TaskStatus, to_status: TaskStatus, reason: Optional[str] = None
    ) -> None:
        """Validate transition, raise ValueError if invalid."""
        pass

    @classmethod
    def get_valid_transitions(cls, from_status: TaskStatus) -> Set[TaskStatus]:
        """Get all valid transitions from a status."""
        pass

    @classmethod
    def visualize(cls) -> str:
        """Generate Mermaid diagram of state machine."""
        pass
```

**Tests** (`tests/backend/models/test_task_state_machine.py`):
```python
def test_valid_transitions():
    assert TaskStateMachine.can_transition(TaskStatus.PENDING, TaskStatus.IN_PROGRESS)
    assert TaskStateMachine.can_transition(TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED)

def test_invalid_transitions():
    with pytest.raises(ValueError):
        TaskStateMachine.validate_transition(TaskStatus.COMPLETED, TaskStatus.IN_PROGRESS)

def test_get_valid_transitions():
    valid = TaskStateMachine.get_valid_transitions(TaskStatus.PENDING)
    assert TaskStatus.IN_PROGRESS in valid
    assert TaskStatus.COMPLETED in valid

def test_visualize():
    diagram = TaskStateMachine.visualize()
    assert "PENDING --> IN_PROGRESS" in diagram
```

**Checklist**:
- [ ] File created: `backend/models/task_state_machine.py`
- [ ] Tests created: `tests/backend/models/test_task_state_machine.py`
- [ ] All transition rules defined
- [ ] Tests passing: `pytest tests/backend/models/test_task_state_machine.py -v`
- [ ] Generate state diagram: Save output to `docs/architecture/task-state-diagram.md`

---

### Step 2: Update TaskLifecycle - start_task (45 min)

**File**: `backend/services/task_service/lifecycle.py`

**Current Code** (lines ~200-220):
```python
async def start_task(self, task_id: str, child_id: str) -> dict:
    # Manual validation
    if current_status != TaskStatus.SCHEDULED.value:
        if current_status == TaskStatus.PENDING.value:
            # Allow starting from PENDING
            pass
        else:
            raise ValueError(...)
```

**New Code**:
```python
from backend.models.task_state_machine import TaskStateMachine

async def start_task(self, task_id: str, child_id: str) -> dict:
    current_status = TaskStatus(task_obj.status)

    # Use state machine validation
    TaskStateMachine.validate_transition(current_status, TaskStatus.IN_PROGRESS)

    # ... rest of logic ...
```

**Checklist**:
- [ ] Import TaskStateMachine
- [ ] Replace manual validation with state machine
- [ ] Run tests: `pytest tests/backend/services/task_service/test_lifecycle.py::test_start_task -v`
- [ ] All tests passing

---

### Step 3: Update TaskLifecycle - complete_task (45 min)

**File**: `backend/services/task_service/lifecycle.py`

**Current Code** (lines 376-379):
```python
if current_status not in [TaskStatus.PENDING.value, TaskStatus.IN_PROGRESS.value, TaskStatus.PAUSED.value]:
    raise ValueError(...)
```

**New Code**:
```python
TaskStateMachine.validate_transition(current_status, TaskStatus.COMPLETED)
```

**Checklist**:
- [ ] Replace manual validation
- [ ] Run tests: `pytest tests/backend/services/task_service/test_lifecycle.py::test_complete_task -v`
- [ ] Test all paths: PENDING→COMPLETED, IN_PROGRESS→COMPLETED, PAUSED→COMPLETED

---

### Step 4: Update All Lifecycle Methods (2 hours)

**Methods to Update**:
1. `activate_task` (DRAFT → SCHEDULED)
2. `pause_task` (IN_PROGRESS → PAUSED)
3. `resume_task` (PAUSED → IN_PROGRESS)
4. `cancel_task` (any → CANCELLED)
5. `uncomplete_task` (COMPLETED → PENDING)
6. `skip_task` (any → SKIPPED)
7. `restore_skipped_task` (SKIPPED → PENDING)

**Pattern for Each**:
```python
async def pause_task(self, task_id: str, paused_by: str, reason: Optional[str] = None):
    current_status = TaskStatus(task_obj.status)

    # Validate transition
    TaskStateMachine.validate_transition(current_status, TaskStatus.PAUSED, reason=reason)

    # Perform transition
    # ... rest of logic ...
```

**Checklist**:
- [ ] `activate_task` updated
- [ ] `pause_task` updated
- [ ] `resume_task` updated
- [ ] `cancel_task` updated
- [ ] `uncomplete_task` updated
- [ ] `skip_task` updated
- [ ] `restore_skipped_task` updated
- [ ] Run full lifecycle tests: `pytest tests/backend/services/task_service/test_lifecycle.py -v`

---

### Step 5: Remove Scattered Status Checks (1 hour)

**Search for Manual Checks**:
```bash
# Find status checks in business logic
grep -rn "status.*=.*TaskStatus" backend/ | grep -v "state_machine" | grep -v "model"
grep -rn "status in \[" backend/
grep -rn "status not in" backend/
```

**Files to Check**:
- `backend/services/task_service/crud.py`
- `backend/routes/task_routes.py`
- `backend/routes/completion_routes.py`

**Replace Patterns**:
```python
# BEFORE
if task.status not in [TaskStatus.PENDING, TaskStatus.IN_PROGRESS]:
    raise ValueError(...)

# AFTER
TaskStateMachine.validate_transition(TaskStatus(task.status), desired_status)
```

**Checklist**:
- [ ] All scattered checks replaced
- [ ] Run full backend test suite: `pytest tests/backend/ -v`
- [ ] All tests passing

---

### Step 6: Create State Diagram Documentation (30 min)

**File**: `docs/architecture/task-state-diagram.md`

**Content**:
```markdown
# Task State Machine

This diagram shows all valid state transitions for tasks in the KidsProgress system.

## State Diagram

```mermaid
[Output from TaskStateMachine.visualize()]
```

## State Descriptions

### DRAFT
- Initial state when task is created
- Not visible to child
- Parent can edit all fields

### SCHEDULED
- Task is scheduled for a specific date
- Visible to child
- Ready to be started

[... continue for all states ...]

## Transition Rules

| From | To | Conditions | Triggered By |
|------|-----|-----------|-------------|
| DRAFT | SCHEDULED | None | Parent activates task |
| SCHEDULED | IN_PROGRESS | None | Child starts task |
[... complete table ...]
```

**Checklist**:
- [ ] State diagram created
- [ ] All states documented
- [ ] Transition table complete
- [ ] Reviewed for accuracy

---

### Step 7: Integration Testing (1 hour)

**Test Scenarios**:

1. **Happy Path**:
   - DRAFT → SCHEDULED → IN_PROGRESS → COMPLETED

2. **Pause and Resume**:
   - SCHEDULED → IN_PROGRESS → PAUSED → IN_PROGRESS → COMPLETED

3. **Skip and Restore**:
   - SCHEDULED → SKIPPED → PENDING → IN_PROGRESS → COMPLETED

4. **Uncomplete**:
   - SCHEDULED → COMPLETED → PENDING

5. **Cancel**:
   - SCHEDULED → CANCELLED
   - IN_PROGRESS → CANCELLED

6. **Invalid Transitions** (should fail):
   - COMPLETED → IN_PROGRESS
   - CANCELLED → SCHEDULED
   - COMPLETED → PAUSED

**Checklist**:
- [ ] All happy paths tested
- [ ] All invalid transitions correctly rejected
- [ ] Error messages are clear
- [ ] Manual testing in UI confirms behavior

---

### Step 8: Documentation and Review (30 min)

**Updates Needed**:
1. Update `docs/architecture/implementation-progress.md`
2. Add state machine example to architecture-patterns.md (if not present)
3. Update API documentation with state transition info

**Checklist**:
- [ ] implementation-progress.md updated (Phase 2 complete)
- [ ] task-state-diagram.md complete
- [ ] Code review against `.claude/skills/architecture-patterns.md`
- [ ] Team review of state machine design

---

## Testing Checklist

### Unit Tests
- [ ] `test_task_state_machine.py` - All transitions validated
- [ ] `test_lifecycle.py` - All lifecycle methods
- [ ] Edge cases: null status, invalid enum values

### Integration Tests
- [ ] Create task → Activate → Start → Complete
- [ ] Start → Pause → Resume → Complete
- [ ] Schedule → Skip → Restore → Complete
- [ ] Complete → Uncomplete → Start → Complete

### Manual Tests
1. [ ] Child portal: Start scheduled task
2. [ ] Child portal: Complete task from pending
3. [ ] Parent portal: Skip task
4. [ ] Parent portal: Restore skipped task
5. [ ] Parent portal: Cancel task
6. [ ] Parent portal: Uncomplete task

---

## Rollback Plan

If issues arise:
1. Revert to Phase 1 completion commit
2. Keep TaskStateMachine class but remove usages
3. Address issues and retry

**Git Strategy**:
- Create branch: `refactor/phase-2-statemachine`
- Commit after each lifecycle method updated
- Merge to main only when all tests pass

---

## Success Metrics

**Before**:
- Status validation in ~12 different places
- Inconsistent validation logic
- Hard to add new states or transitions

**After**:
- Status validation in exactly 1 place (TaskStateMachine)
- Consistent validation across all lifecycle methods
- Easy to add new states/transitions

**Measurements**:
```bash
# Count manual status checks (should be minimal after)
grep -r "status in \[" backend/ | wc -l
grep -r "status not in" backend/ | wc -l

# Verify state machine usage
grep -r "TaskStateMachine.validate_transition" backend/ | wc -l  # Should be ~7
```

---

## Notes and Issues

### Issues Encountered
- None yet

### Design Decisions
- Allow SCHEDULED→COMPLETED for simple "mark done" tasks
- Allow PAUSED→COMPLETED for direct completion without resume
- CANCELLED and COMPLETED are not terminal (can uncomplete)

### Questions
- Should CANCELLED tasks be restorable? (Decision: No, only SKIPPED can be restored)

---

## References

- **Architecture Patterns**: [../../.claude/skills/architecture-patterns.md](../../.claude/skills/architecture-patterns.md)
- **Refactoring Plan**: [task-system-refactoring-plan.md](task-system-refactoring-plan.md)
- **Implementation Progress**: [implementation-progress.md](implementation-progress.md)
- **Phase 1**: [phase-1-taskidentifier-process.md](phase-1-taskidentifier-process.md)
