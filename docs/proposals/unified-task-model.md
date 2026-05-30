# Proposal: Unified Task Model

**Date**: 2025-11-17
**Status**: DRAFT for Review
**Impact**: HIGH - Major Architecture Change

## Problem Statement

Current system has 3 separate entities that are essentially the same thing:
1. **Tasks** - One-time tasks
2. **Routines** - Recurring task templates
3. **Activities** - Optional tasks in a pool

This causes:
- Code duplication across 3 services, 3 routes, 3 modals
- Inconsistent UI (different fields, different controls for same concept)
- User confusion (which should I create?)
- Maintenance burden (change one, must change all three)

## Proposed Solution: ONE Task Model

### Unified Task Model
```python
class Task(BaseModel):
    # Core fields
    title: str
    description: str

    # Scheduling
    scheduling_type: SchedulingType  # FIXED_TIME, PREFERRED_TIME, FLEXIBLE
    scheduled_date: Optional[datetime]  # When to do it (can be null for pool tasks)
    preferred_time_slot: Optional[TimeSlot]  # What time

    # NEW: Recurrence (replaces separate Routine model)
    is_recurring: bool = False
    recurrence: Optional[RecurrencePattern] = None  # Only if is_recurring=True

    # Task type/source
    task_source: TaskSource  # ONE_TIME, POOL, GENERATED_FROM_RECURRING
    source_recurring_task_id: Optional[str] = None  # Link to parent recurring task

    # Pool/Activity fields
    is_in_pool: bool = False  # True for activities
    pool_usage_rules: Optional[UsageRules] = None  # Max times per day, etc.

    # Everything else stays the same
    obligation_level: ObligationLevel
    priority_boost: int
    ...
```

### How It Works

#### Creating a Recurring Task
```
1. User clicks "Create Task"
2. Fills in: "Do homework"
3. Checks box: ☑ "Repeat this task"
4. Selects: "Weekly on Mon, Wed, Fri"
5. Save → Creates ONE task with is_recurring=True
```

#### Task Generation
```python
# Daily job generates instances from recurring tasks
for task in recurring_tasks:
    if should_generate_for_today(task):
        new_task = Task(
            title=task.title,
            task_source=TaskSource.GENERATED_FROM_RECURRING,
            source_recurring_task_id=task.id,
            is_recurring=False,  # The instance is not recurring
            scheduled_date=today,
            ...copy other fields...
        )
```

#### Activity Pool
```
1. User clicks "Create Task"
2. Fills in: "Read a book"
3. Checks box: ☑ "Add to activity pool"
4. Sets: "Can do max 2 times per day"
5. Save → Creates ONE task with is_in_pool=True
```

## Benefits

### For Users
- ✅ Simpler - only ONE "Create Task" button
- ✅ Clearer - checkbox for "repeat" is intuitive
- ✅ Consistent - same UI for all task types
- ✅ Flexible - can have recurring pool tasks!

### For Developers
- ✅ Less code - ONE service, ONE route, ONE modal
- ✅ Easier maintenance - change in one place
- ✅ Fewer bugs - no synchronization issues
- ✅ Better types - consistent schema

### For AI Scheduling
- ✅ Simpler queries - all tasks in one collection
- ✅ Better context - see all tasks together
- ✅ Easier conflict detection

## Migration Path

### Phase 1: Add Fields to Task Model (Non-Breaking)
```python
# Add to existing Task model
is_recurring: bool = False
recurrence: Optional[RecurrencePattern] = None
is_in_pool: bool = False
pool_usage_rules: Optional[UsageRules] = None
```

### Phase 2: Create Unified UI
- New TaskModal with all options
- Replace RoutineModal, ActivityModal, and old TaskModal

### Phase 3: Migration Script
```python
# Migrate routines → tasks with is_recurring=True
# Migrate activities → tasks with is_in_pool=True
# Link generated tasks via source_recurring_task_id
```

### Phase 4: Deprecate Old Models
- Mark Routine/Activity models as deprecated
- Keep for backwards compatibility (read-only)
- Eventually remove

## UI Mockup

```
┌─────────────────────────────────────────┐
│ Create Task                             │
├─────────────────────────────────────────┤
│ Title: [________________]               │
│ Description: [__________]               │
│                                         │
│ When:                                   │
│ ○ Specific date [2025-11-18]           │
│ ○ Add to pool (no specific date)       │
│                                         │
│ ☑ Repeat this task                     │
│   Frequency: [Weekly ▼]                │
│   On: ☑Mon ☑Wed ☑Fri                   │
│   Ends: ○ Never  ○ On [date]           │
│                                         │
│ Scheduling:                             │
│ ○ Flexible (anytime)                   │
│ ● Preferred time: [3:00 PM - 4:00 PM]  │
│ ○ Fixed time (must be at this time)    │
│                                         │
│ Priority:                               │
│ ● Must do  ○ Should do  ○ Optional     │
│ Fine-tune: [-2 ··|·· +2]               │
│                                         │
│ ☐ Advanced options ▼                   │
│                                         │
│ [Cancel]              [Create Task]     │
└─────────────────────────────────────────┘
```

## Questions to Resolve

1. **Keep old collections?**
   - Option A: Migrate all to `tasks` collection
   - Option B: Keep `routines`, `activities` for historical data

2. **Generated task cleanup?**
   - Auto-delete completed instances after N days?
   - Keep all for history?

3. **Edit recurring task behavior?**
   - Edit just this instance?
   - Edit this and all future?
   - Edit the recurring template?

## Recommendation

**Start with Phase 1**: Add the new fields to Task model NOW, but keep existing Routine/Activity models working. This gives us flexibility to:
1. Test the unified UI with new tasks
2. Keep existing features working
3. Migrate gradually

Then decide if full migration is worth it based on user feedback.

---

**What do you think?** Should we proceed with this unified approach?
