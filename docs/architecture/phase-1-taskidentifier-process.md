# Phase 1: TaskIdentifier Value Object - Implementation Process

> **Status**: Not Started
> **Estimated Time**: 4-6 hours
> **Priority**: High (Foundation for other phases)

---

## Objectives

Create a TaskIdentifier value object to encapsulate all logic related to parsing and working with task IDs (both real ObjectId tasks and virtual task instances).

**Success Criteria**:
- [ ] TaskIdentifier class implemented with full validation
- [ ] All scattered parsing logic replaced with TaskIdentifier
- [ ] Zero hardcoded `_` splitting or date parsing
- [ ] Comprehensive test coverage (>90%)
- [ ] All existing tests still passing

---

## Implementation Steps

### Step 1: Create TaskIdentifier Class (30 min)

**File**: `backend/models/task_identifier.py`

**Requirements**:
- Immutable Pydantic model (frozen=True)
- Properties: `raw_id`, `is_virtual`, `is_real`, `template_id`, `occurrence_date`
- Validation in constructor
- String representations (`__str__`, `__repr__`)

**Code Template**:
```python
from pydantic import BaseModel, Field, field_validator
from datetime import date
from typing import Optional
from bson import ObjectId

class TaskIdentifier(BaseModel):
    """Value object for task identification (real or virtual)."""

    model_config = {"frozen": True}

    raw_id: str = Field(..., description="Raw task ID string")

    @property
    def is_virtual(self) -> bool:
        """Check if this is a virtual task ID (template_id_date)."""
        # Implementation

    @property
    def is_real(self) -> bool:
        """Check if this is a real task ID (ObjectId)."""
        # Implementation

    @property
    def template_id(self) -> Optional[str]:
        """Get template ID if virtual, None otherwise."""
        # Implementation

    @property
    def occurrence_date(self) -> Optional[date]:
        """Get occurrence date if virtual, None otherwise."""
        # Implementation
```

**Tests** (`tests/backend/models/test_task_identifier.py`):
- Test virtual task ID parsing
- Test real task ID (ObjectId)
- Test invalid formats
- Test edge cases (multiple underscores, invalid dates)

**Checklist**:
- [ ] File created: `backend/models/task_identifier.py`
- [ ] Tests created: `tests/backend/models/test_task_identifier.py`
- [ ] Tests passing (run: `pytest tests/backend/models/test_task_identifier.py -v`)
- [ ] Code reviewed against architecture-patterns.md

---

### Step 2: Update crud.py - get_task_by_id (1 hour)

**File**: `backend/services/task_service/crud.py`

**Current Code** (lines 440-495):
```python
async def get_task_by_id(self, task_id: str, parent_id: str) -> Optional[Task]:
    # Check if this is a virtual task ID (format: template_id_date)
    if "_" in task_id and not task_id.count("_") > 2:
        parts = task_id.rsplit("_", 1)
        # ... manual parsing logic ...
```

**New Code**:
```python
from backend.models.task_identifier import TaskIdentifier

async def get_task_by_id(self, task_id: str, parent_id: str) -> Optional[Task]:
    identifier = TaskIdentifier(raw_id=task_id)

    if identifier.is_virtual:
        # Use identifier.template_id and identifier.occurrence_date
        # ... cleaner logic ...

    # Regular task lookup
    task_id_obj = ObjectId(identifier.raw_id)
    # ... rest of logic ...
```

**Checklist**:
- [ ] Import TaskIdentifier
- [ ] Replace manual parsing with TaskIdentifier
- [ ] Update virtual task handling
- [ ] Run tests: `pytest tests/backend/services/task_service/test_crud.py::test_get_task_by_id -v`
- [ ] All tests passing

---

### Step 3: Update completion_routes.py (1 hour)

**Files to Update**:
- `backend/routes/completion_routes.py` (lines 169-196, 364-379)

**Current Issues**:
- Manual virtual task ID parsing in multiple places
- Duplicated `rsplit("_", 1)` logic

**New Approach**:
```python
from backend.models.task_identifier import TaskIdentifier

async def submit_task_completion(...):
    identifier = TaskIdentifier(raw_id=task_id)

    if identifier.is_virtual:
        template_id_str = identifier.template_id
        # ... rest of logic ...
```

**Checklist**:
- [ ] Update `submit_task_completion`
- [ ] Update `get_completions`
- [ ] Run tests: `pytest tests/backend/routes/test_completion_routes.py -v`
- [ ] Manual test: Complete a virtual task instance

---

### Step 4: Update Frontend Components (1-2 hours)

**Files to Update**:
1. `frontend/src/components/OverdueTaskCard.tsx` (lines 181-213)
2. `frontend/src/pages/child-portal/[id]/tasks/execute/[taskId].tsx`
3. Any other components that construct virtual task IDs

**Current Code**:
```typescript
const virtualTaskId = `${task.source_id}_${date}`;
```

**New Approach**:
Create TypeScript equivalent or use helper function:
```typescript
// frontend/src/utils/taskIdentifier.ts
export function createVirtualTaskId(templateId: string, date: string): string {
  return `${templateId}_${date}`;
}

export function parseVirtualTaskId(taskId: string): { templateId: string; date: string } | null {
  const parts = taskId.split('_');
  if (parts.length === 2) {
    return { templateId: parts[0], date: parts[1] };
  }
  return null;
}
```

**Checklist**:
- [ ] Create `frontend/src/utils/taskIdentifier.ts`
- [ ] Update OverdueTaskCard.tsx
- [ ] Update execute page
- [ ] Search for other usages: `grep -r "_\${" frontend/src/`
- [ ] Frontend tests passing: `npm test`
- [ ] Manual test in browser

---

### Step 5: Global Search and Replace (1 hour)

**Search for Remaining Manual Parsing**:

```bash
# Backend - search for manual splitting
grep -rn "rsplit.*_.*1" backend/
grep -rn "split.*_" backend/ | grep -v "import"

# Frontend - search for virtual task ID construction
grep -rn "_\${" frontend/src/
grep -rn 'split("_")' frontend/src/
```

**Files to Check**:
- `backend/services/task_service/lifecycle.py`
- `backend/services/task_service/virtual_materialization.py`
- `backend/routes/task_routes.py`
- `frontend/src/components/EditOccurrenceModal.tsx`

**Checklist**:
- [ ] All manual parsing replaced
- [ ] No hardcoded `_` splitting logic
- [ ] Run full backend test suite: `pytest tests/backend/ -v`
- [ ] Run full frontend test suite: `npm test`

---

### Step 6: Documentation and Review (30 min)

**Updates Needed**:
1. Add docstring examples to TaskIdentifier class
2. Update `docs/architecture/implementation-progress.md`
3. Add entry to `docs/CODE_ORGANIZATION.md` if not present

**Checklist**:
- [ ] TaskIdentifier docstring complete with examples
- [ ] implementation-progress.md updated (Phase 1 complete)
- [ ] CODE_ORGANIZATION.md updated if needed
- [ ] Code review against `.claude/skills/architecture-patterns.md`

---

## Testing Checklist

### Unit Tests
- [ ] `test_task_identifier.py` - All tests passing
- [ ] `test_crud.py::test_get_task_by_id` - Virtual task handling
- [ ] `test_completion_routes.py` - Virtual task completion

### Integration Tests
- [ ] Create recurring task → View in overdue → Complete virtual instance
- [ ] Edit virtual task occurrence
- [ ] Delete virtual task occurrence

### Manual Tests
1. [ ] Child portal: View overdue recurring tasks
2. [ ] Child portal: Start virtual task from overdue list
3. [ ] Child portal: Complete virtual task
4. [ ] Parent portal: Edit single occurrence
5. [ ] Parent portal: View completed virtual tasks

---

## Rollback Plan

If issues arise:
1. Revert to commit before Phase 1 started
2. Keep TaskIdentifier class but remove usages
3. Address issues and retry

**Git Strategy**:
- Create branch: `refactor/phase-1-taskidentifier`
- Commit after each step
- Merge to main only when all tests pass

---

## Success Metrics

**Before**:
- Virtual task ID parsing in ~8 different places
- Manual `rsplit("_", 1)` logic scattered
- Difficult to change ID format

**After**:
- Virtual task ID parsing in exactly 1 place (TaskIdentifier)
- Zero manual splitting logic
- Can change ID format by updating TaskIdentifier only

**Measurements**:
```bash
# Count manual splitting (should be 0 after)
grep -r "rsplit.*_.*1" backend/ | wc -l
grep -r 'split("_")' frontend/src/ | grep -v import | wc -l
```

---

## Notes and Issues

### Issues Encountered
- None yet

### Design Decisions
- None yet

### Questions
- None yet

---

## References

- **Architecture Patterns**: [../../.claude/skills/architecture-patterns.md](../../.claude/skills/architecture-patterns.md)
- **Refactoring Plan**: [task-system-refactoring-plan.md](task-system-refactoring-plan.md)
- **Implementation Progress**: [implementation-progress.md](implementation-progress.md)
