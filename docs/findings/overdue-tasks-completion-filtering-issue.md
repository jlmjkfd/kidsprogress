# Overdue Tasks - Completion Filtering Issue

> **Date**: 2025-12-11
> **Status**: 🔴 BUG - Completed overdue dates still showing
> **Severity**: MEDIUM - UX issue, functionality works but confusing

---

## Problem Description

**User Report**:
> "I executed some attempts of an overdue task by clicking start button in overdue list. The button is on a specific date. I can see the completion data in database, but the date still shown in the overdue list and I can't review the attempts (no button provided)."

**Root Cause**: The `get_overdue_tasks()` method doesn't check the `task_completions` collection to see if a date has already been completed.

---

## Current Flow (Broken)

### Step 1: User Views Overdue Tasks
```
GET /api/tasks/overdue?child_id=xxx
```

Backend returns:
```json
{
  "must_do": [{
    "task_id": "507f...",
    "title": "Writing Practice",
    "is_recurring": true,
    "source_id": "507f1f77bcf86cd799439011",
    "recent_missed_dates": ["2025-12-08", "2025-12-09", "2025-12-10"],
    // ...
  }]
}
```

### Step 2: User Clicks "Start" on Date "2025-12-09"

Frontend constructs virtual task ID:
```typescript
const virtualTaskId = `${task.source_id}_${date}`;
// "507f1f77bcf86cd799439011_2025-12-09"
```

Navigates to: `/child-portal/${childId}/tasks/execute/507f1f77bcf86cd799439011_2025-12-09`

### Step 3: User Completes Task

```
POST /api/completions/507f1f77bcf86cd799439011_2025-12-09/submit
```

Backend saves:
```json
{
  "_id": ObjectId("..."),
  "completion_id": "comp_xxx",
  "task_id": ObjectId("507f1f77bcf86cd799439011"),  // Template ID
  "scheduled_date": "2025-12-09",  // ✅ Specific date
  "session_number": 1,
  "child_id": ObjectId("..."),
  // ... metrics, data, etc.
}
```

### Step 4: User Refreshes Overdue List

```
GET /api/tasks/overdue?child_id=xxx
```

**❌ PROBLEM**: Backend still returns "2025-12-09" in `recent_missed_dates`!

**Why?** The backend only checks if the **task** status is "completed", not if there are **completions** for specific dates.

---

## Current Backend Logic (Incorrect)

**File**: [backend/services/task_service/crud.py:501-513](backend/services/task_service/crud.py#L501-L513)

```python
# Filter for overdue tasks only
overdue_tasks = []
for task_dict in all_tasks_list:
    # Skip completed, skipped, archived tasks
    if task_dict.get("status") in ["completed", "skipped", "archived"]:
        continue
    # Skip informational tasks
    if task_dict.get("is_informational"):
        continue
    # Must be scheduled before today
    scheduled_date = self._parse_date(task_dict.get("scheduled_date"))
    if scheduled_date and scheduled_date < today:
        overdue_tasks.append(task_dict)
```

**Problem**:
- For recurring tasks, the template status is always "pending" (never changes)
- Virtual instances are generated on-the-fly with `status="pending"`
- So ALL past dates are included, even if they have completions

---

## What Should Happen

For recurring tasks, we need to:
1. Generate all overdue virtual instances (dates before today)
2. Query `task_completions` collection for existing completions
3. **Filter out dates that have completions**
4. **Add completion info for dates that have completions** (for "review" functionality)

---

## Proposed Solution

### Solution 1: Filter Completed Dates (Backend)

**File**: `backend/services/task_service/crud.py`

**Add after line 543** (inside `for source_id, instances in recurring_groups.items():`):

```python
# Process recurring task groups
for source_id, instances in recurring_groups.items():
    # Sort instances by date
    instances.sort(key=lambda t: t.get("scheduled_date", ""))

    # Get first instance for task info
    first_task = instances[0]

    # ✅ NEW: Filter out dates that have completions
    source_id_obj = ObjectId(source_id) if ObjectId.is_valid(source_id) else None
    if source_id_obj:
        # Query for completions of this recurring task
        completions = await self.db.task_completions.find({
            "task_id": source_id_obj
        }).to_list(length=None)

        # Build set of completed dates
        completed_dates = set()
        for comp in completions:
            if comp.get("scheduled_date"):
                completed_dates.add(comp["scheduled_date"])

        # Filter instances to only include dates WITHOUT completions
        incomplete_instances = []
        for instance in instances:
            instance_date = self._parse_date(instance.get("scheduled_date"))
            if instance_date and str(instance_date) not in completed_dates:
                incomplete_instances.append(instance)

        # If all dates are completed, skip this task entirely
        if not incomplete_instances:
            continue

        # Use filtered instances for the rest of the logic
        instances = incomplete_instances

    # ... rest of existing code (lines 551-609)
```

### Solution 2: Add "View Completions" Feature (Frontend + Backend)

#### Backend: New endpoint to get completions for a recurring task

**File**: `backend/routes/completion_routes.py`

```python
@router.get("/recurring/{source_id}/by-date")
async def get_recurring_task_completions_by_date(
    source_id: str,
    child_id: str = Query(...),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
):
    """Get completions for a recurring task grouped by scheduled_date.

    Returns:
        {
            "2025-12-09": [completion1, completion2],  // Multiple attempts
            "2025-12-10": [completion1]
        }
    """
    database = db.get_database()
    completions_collection = database["task_completions"]

    # Build query
    query = {
        "task_id": ObjectId(source_id),
        "child_id": ObjectId(child_id)
    }

    if start_date:
        query.setdefault("scheduled_date", {})["$gte"] = start_date
    if end_date:
        query.setdefault("scheduled_date", {})["$lte"] = end_date

    # Get completions
    cursor = completions_collection.find(query).sort("completed_at", -1)
    completions = await cursor.to_list(length=None)

    # Group by scheduled_date
    by_date = {}
    for comp in completions:
        date_str = comp.get("scheduled_date", "unknown")
        if date_str not in by_date:
            by_date[date_str] = []
        by_date[date_str].append(TaskCompletion(**comp))

    return {
        "completions_by_date": by_date,
        "total_dates": len(by_date),
        "total_completions": len(completions)
    }
```

#### Frontend: Update OverdueTaskCard to show completion status

**File**: `frontend/src/components/OverdueTaskCard.tsx`

**Modify the date rendering** (around line 182):

```typescript
{task.recent_missed_dates.map((date) => {
  const virtualTaskId = `${task.source_id}_${date}`;
  const executePath = `/child-portal/${childId}/tasks/execute/${virtualTaskId}`;
  const completionPath = `/child-portal/${childId}/tasks/completion/${virtualTaskId}`;

  // ✅ NEW: Check if this date has completions
  const hasCompletion = dateCompletions[date] > 0;  // From API

  return (
    <div
      key={date}
      className="flex items-center justify-between rounded-lg bg-white p-3 shadow-sm"
    >
      <div className="flex-1">
        <span className="text-sm text-gray-700">{date}</span>
        {hasCompletion && (
          <span className="ml-2 text-xs text-green-600">
            ✓ {dateCompletions[date]} {dateCompletions[date] === 1 ? 'attempt' : 'attempts'}
          </span>
        )}
      </div>

      <div className="flex gap-1">
        {hasCompletion ? (
          // Show "View" button if completed
          <button
            onClick={() => navigate(completionPath)}
            className="rounded-lg bg-green-100 p-1 text-green-700 transition-colors hover:bg-green-200"
            title="View completion"
          >
            <IconEye size={16} />
          </button>
        ) : (
          // Show "Start" button if not completed
          task.completion_type === "simple" ? (
            <button
              onClick={() => onMarkDone && onMarkDone(virtualTaskId)}
              className="rounded-lg bg-green-100 p-1 text-green-700 transition-colors hover:bg-green-200"
              title="Mark done"
            >
              <IconCheck size={16} />
            </button>
          ) : (
            <button
              onClick={() => navigate(executePath)}
              className="rounded-lg bg-blue-100 p-1 text-blue-700 transition-colors hover:bg-blue-200"
              title="Open task"
            >
              <IconArrowRight size={16} />
            </button>
          )
        )}
      </div>
    </div>
  );
})}
```

---

## Alternative Approach: Mixed View (Recommended)

Instead of filtering completed dates entirely, show them differently:

### Backend Response Format

```json
{
  "must_do": [{
    "task_id": "507f...",
    "title": "Writing Practice",
    "is_recurring": true,
    "source_id": "507f1f77bcf86cd799439011",
    "incomplete_dates": ["2025-12-08", "2025-12-10"],  // Not completed
    "completed_dates": ["2025-12-09"],  // Has completions
    "total_missed_days": 2,  // Only count incomplete
    // ...
  }]
}
```

### Frontend Display

```
Writing Practice (Recurring)
  2 days overdue

  Incomplete:
    [ ] 2025-12-08  [Start →]
    [ ] 2025-12-10  [Start →]

  Completed:
    [✓] 2025-12-09  [View Results →]
```

---

## Recommended Implementation Plan

### Phase 1: Quick Fix (Filter Completed Dates)
1. ✅ Modify `get_overdue_tasks()` to query completions
2. ✅ Filter out dates with completions from `recent_missed_dates`
3. ✅ Update `total_missed_days` to exclude completed dates

**Impact**: Completed dates disappear from overdue list (like user expects)

### Phase 2: Add Review Functionality
1. Add `/api/completions/recurring/{source_id}/by-date` endpoint
2. Modify `OverdueTaskCard` to fetch completion counts
3. Show completed dates in a separate section with "View" buttons
4. Create completion review page/modal

**Impact**: User can see and review their completed attempts

### Phase 3: Enhanced UX
1. Show completion progress: "3/7 days completed"
2. Add calendar view showing completed vs incomplete dates
3. Add "retry" functionality for completed dates (if allowed)

---

## Testing Checklist

After implementing fix:

- [ ] Complete a recurring task for date A
- [ ] Refresh overdue list
- [ ] Verify date A no longer shows in incomplete dates
- [ ] Verify `total_missed_days` decreased by 1
- [ ] Verify completion is in database with correct `scheduled_date`
- [ ] Complete the same date again (multi-completion)
- [ ] Verify `session_number` increments

---

## Files to Modify

### Backend
1. `backend/services/task_service/crud.py` - Update `get_overdue_tasks()`
2. `backend/routes/completion_routes.py` - Add completion query endpoint

### Frontend
3. `frontend/src/components/OverdueTaskCard.tsx` - Show completion status
4. `frontend/src/api/queries/useCompletions.ts` - Add completion query hook
5. `frontend/src/types/task.ts` - Update OverdueTask type

---

**Priority**: 🟡 MEDIUM - Not breaking functionality, but confusing UX
**Estimated Time**: 2-3 hours for Phase 1, 3-4 hours for Phase 2
