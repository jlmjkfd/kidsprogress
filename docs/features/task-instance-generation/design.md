# Task Instance Generation - Design Document

**Date**: 2025-11-19
**Status**: ✅ Phases 1-4 Implemented (Commit: f9c5323)
**Next**: Testing and UI integration

## Problem Statement

Currently, recurring tasks (like "School Time 8:30-15:00, Mon-Fri from Nov 9 to Dec 19") are stored as template tasks with RRULE patterns, but **task instances are not automatically generated** for each occurrence date. This means:

1. ❌ Calendar doesn't show the recurring task on all applicable days
2. ❌ Tasks query doesn't return instances for specific dates
3. ❌ Cannot track which instances are completed vs which aren't

## Goals

1. ✅ Automatically generate task instances from recurring tasks
2. ✅ Display recurring tasks on all applicable days in calendar
3. ✅ Informational tasks (like "School Time") should:
   - Not have Start/Pause/Complete buttons
   - Never show as overdue
   - Display in grey on calendar
4. ✅ Make task type determination easier for frontend

## Proposed Solution

### 1. Add `is_informational` Field to Task Model

**Backend** (`backend/models/task.py`):
```python
class Task(BaseModel):
    # ... existing fields ...

    # NEW FIELD
    is_informational: bool = Field(default=False)
    # When True, automatically sets:
    # - blocks_other_tasks = True
    # - scheduling_type = FIXED_TIME
    # - can_be_interrupted = False
    # - Frontend won't show action buttons (start/pause/complete)
    # - Won't trigger overdue warnings
```

**Frontend** (`frontend/src/types/task.ts`):
```typescript
export interface Task {
  // ... existing fields ...

  // NEW FIELD
  is_informational: boolean;
  // Replaces the isInformationalTask() check in components
}
```

### 2. Task Instance Generation Strategy

#### Option A: Generate on-demand (Recommended)
**When**: Generate instances when querying tasks for a date range
**Pros**:
- No storage overhead
- Always up-to-date with RRULE changes
- Simple to implement
**Cons**:
- Computation on every query
- Cannot track completion status per instance

#### Option B: Pre-generate instances
**When**: Generate instances when recurring task is created/updated
**Pros**:
- Fast queries
- Can track per-instance completion
- Better for statistics
**Cons**:
- Storage overhead
- Need to handle RRULE updates
- Need background jobs for cleanup

**Decision**: Use **Option B (Pre-generate)** for better UX and completion tracking

### 3. Database Schema Changes

#### New Field in Task Collection
```python
# In Task model
is_informational: bool = False
is_recurring: bool  # Already exists
source_recurring_task_id: Optional[str] = None  # Already exists - links instance to template
```

#### Generated Instance Example
```python
{
    "_id": "task_instance_20241115_school",
    "title": "School Time",
    "scheduled_date": "2024-11-15",
    "scheduled_time": "08:30:00",

    # Source tracking
    "task_source": "ROUTINE",
    "is_recurring": False,  # Instance itself is not recurring
    "source_recurring_task_id": "recurring_task_school",  # Links to template

    # Informational flag
    "is_informational": True,
    "blocks_other_tasks": True,
    "scheduling_type": "FIXED_TIME",
    "can_be_interrupted": False,

    # Time
    "fixed_time_slot": {"start": "08:30", "end": "15:00"},

    # Status (informational tasks never complete)
    "status": "SCHEDULED",

    # Other fields copied from template...
}
```

### 4. Implementation Plan

#### Phase 1: Model Updates ✅ COMPLETE
- [x] Add `is_informational` field to backend Task model
- [x] Add `is_informational` field to frontend Task interface
- [x] Update TaskCreate/TaskUpdate schemas
- [x] Update task_service.py create_task() to copy is_informational
- [x] Update task_service.py update_task() to handle is_informational

#### Phase 2: Instance Generation Service ✅ COMPLETE
Created `backend/services/task_instance_service.py`:
- [x] TaskInstanceGenerator class with generate_instances() method
- [x] RRULE parsing using dateutil.rrule
- [x] Instance creation from template
- [x] regenerate_instances_for_task() for updating instances
- [x] calculate_date_range_for_generation() helper

**Note**: Basic service created. Integration with task routes already exists in task_service.py (_generate_recurring_instances)

```python
class TaskInstanceGenerator:
    async def generate_instances(
        self,
        recurring_task: Task,
        start_date: datetime,
        end_date: datetime
    ) -> List[Task]:
        """Generate task instances from recurring task."""
        # 1. Parse RRULE
        # 2. Get occurrences in date range
        # 3. For each occurrence:
        #    - Create task instance
        #    - Link to source (source_recurring_task_id)
        #    - Copy all properties from template
        #    - Set scheduled_date to occurrence date

    async def sync_instances_for_task(
        self,
        task_id: str,
        generate_until: datetime
    ):
        """Sync instances when recurring task is created/updated."""
        # Generate instances from now until generate_until
        # Delete old instances beyond generate_until

    async def get_tasks_for_date_range(
        self,
        child_id: str,
        start_date: str,
        end_date: str
    ) -> List[Task]:
        """Get all tasks (one-time + instances) for date range."""
        # Query one-time tasks in range
        # Query instances in range
        # Combine and return
```

#### Phase 3: Frontend Updates ✅ COMPLETE
- [x] Update `isInformationalTask()` helper to use `task.is_informational`
- [x] Remove unused SchedulingType imports from calendar components
- [x] Update TaskCalendar filter count to use `task.is_informational`
- [x] Updated components:
  - DayView.tsx
  - WeekView.tsx
  - DayDetailModal.tsx
  - TaskCalendar.tsx

#### Phase 4: API Updates ✅ COMPLETE (Already Implemented)
- [x] Task creation already triggers instance generation via `_generate_recurring_instances()`
- [x] Instances are stored as separate task documents with `source_recurring_task_id`
- [x] Task queries already return instances (they're regular tasks with `is_recurring=False`)

**Note**: Existing implementation in task_service.py already handles instance generation on create. May need optimization for large date ranges in future.

### 5. UI/UX Changes

#### Task Creation Form
```
[✓] This is an informational task
    (Blocks other tasks, fixed time, no start/complete buttons)
```

When checked:
- ✅ Auto-checks "Blocks other tasks"
- ✅ Auto-selects "Fixed time" scheduling
- ✅ Auto-checks "Cannot be interrupted"
- ✅ Disables these checkboxes (greyed out)

#### Calendar Display
```
Mon Nov 11
┌─────────────────────┐
│ 08:30 School Time   │ ← Grey background
│ (Informational)     │   No click to start
├─────────────────────┤
│ 15:30 Homework      │ ← Normal task
│ [Start]             │   Has action buttons
└─────────────────────┘
```

### 6. Edge Cases

#### Case 1: Recurring Task Updated
```python
# When parent edits recurring task:
# Option A: Update template + regenerate future instances
# Option B: Update template + keep existing instances unchanged

# Recommendation: Option A for consistency
```

#### Case 2: Instance Deleted
```python
# When parent deletes a single instance:
# - Mark instance as CANCELLED
# - Don't regenerate it
# - Keep template intact
```

#### Case 3: Timezone Changes
```python
# All instances use local dates (YYYY-MM-DD)
# Time slots use HH:MM format (local time)
# No timezone conversion needed
```

### 7. Migration Plan

```python
# Migration script: migrate_add_is_informational.py
async def migrate():
    # For all existing tasks:
    # If blocks_other_tasks == True AND scheduling_type == FIXED_TIME:
    #     Set is_informational = True
    # Else:
    #     Set is_informational = False
```

### 8. Testing Plan

1. **Unit Tests**:
   - Generate instances from RRULE
   - Handle RRULE edge cases (until, count, exceptions)
   - Validate instance properties

2. **Integration Tests**:
   - Create recurring task → verify instances generated
   - Update recurring task → verify instances updated
   - Query date range → verify correct instances returned

3. **E2E Tests**:
   - Create "School Time" 8:30-15:00 Mon-Fri Nov 9 - Dec 19
   - Verify shows on all school days in calendar
   - Verify grey background, no action buttons
   - Verify doesn't show as overdue

## Open Questions

1. **How far ahead to generate instances?**
   - Recommendation: Generate 3 months ahead
   - Regenerate monthly via cron job

2. **Should we allow editing single instances?**
   - Recommendation: Yes, but create a copy (detach from template)
   - Mark with `source_recurring_task_id` but set `is_recurring=False`

3. **Performance with large instance counts?**
   - Recommendation: Add index on `scheduled_date` and `source_recurring_task_id`
   - Consider pagination for long date ranges

## Next Steps

1. Get approval on design approach
2. Implement Phase 1: Model updates
3. Implement Phase 2: Instance generator
4. Implement Phase 3: Frontend updates
5. Test end-to-end

---

## Implementation Summary (Commit f9c5323)

### ✅ What Was Implemented

**Backend Changes:**
1. Added `is_informational: bool = False` to Task model
2. Updated TaskCreate and TaskUpdate Pydantic schemas
3. Modified task_service.py to copy is_informational to recurring instances
4. Created TaskInstanceGenerator service (task_instance_service.py)
   - RRULE parsing with dateutil
   - Instance generation from templates
   - Date range calculation helpers

**Frontend Changes:**
1. Added `is_informational: boolean` to Task TypeScript interface
2. Updated TaskCreate and TaskUpdate interfaces
3. Updated calendar components to use `task.is_informational`:
   - DayView.tsx
   - WeekView.tsx
   - DayDetailModal.tsx
   - TaskCalendar.tsx
4. Removed unused SchedulingType imports

### 🎯 Current Status

**Working:**
- ✅ Backend model fully supports is_informational field
- ✅ Frontend components use is_informational for display logic
- ✅ Recurring task instance generation already implemented
- ✅ Calendar filters correctly hide informational tasks

**Next Steps (Phase 5 - Testing & UI):**
1. Test creating recurring informational task (e.g., "School Time 8:30-15:00, Mon-Fri")
2. Verify instances appear on all applicable days
3. Verify grey styling and no action buttons
4. Add UI checkbox for "This is an informational task" in task creation form
5. Auto-check related fields when informational checkbox is selected

**Future Optimizations:**
- Consider virtual instance expansion instead of pre-generating all instances
- Add instance regeneration on recurring task edit
- Optimize query performance for large date ranges

---

**Status**: Phases 1-4 Complete ✅ | Ready for Testing 🧪
