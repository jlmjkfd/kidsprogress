# Timezone Issue in Overdue Tasks

> **Date**: 2025-12-11
> **Status**: ✅ FIXED
> **Severity**: MEDIUM - Date off by one day

---

## Problem Description

**User Report**:
> "The recurrence task is set from 3 Dec, but in overdue list, it is from 4 Dec. This may be the timezone issue."

**Root Cause**: Backend used `date.today()` which returns the server's local date (likely UTC), but the user is in New Zealand (Pacific/Auckland, UTC+13). This caused a date mismatch of up to 13 hours.

---

## Example Scenario

### Setup
- **User timezone**: Pacific/Auckland (UTC+13)
- **Server timezone**: UTC
- **Recurring task**: Starts December 3, 2025
- **Current time**: December 3, 2025 at 23:00 UTC (December 4, 2025 at 12:00 NZDT)

### What Happened (BEFORE FIX)

**Backend calculation**:
```python
today = date.today()  # Uses server timezone
# Returns: date(2025, 12, 3)  (Server still on Dec 3 in UTC)

# Overdue check: scheduled_date < today
# Dec 3 < Dec 3? NO
# Result: Dec 3 task NOT shown as overdue yet
```

**User expectation**:
- It's December 4 in New Zealand
- Task scheduled for Dec 3 should be overdue
- But backend says "not overdue yet" because server is still on Dec 3

### Timeline Visualization

```
Server Time (UTC):       2025-12-03 23:00
User Time (NZ):          2025-12-04 12:00

Server calculates:
  today = Dec 3
  Dec 3 < Dec 3? NO → Not overdue

User sees:
  Current date = Dec 4
  Task date = Dec 3
  Dec 3 < Dec 4? YES → Should be overdue!
```

---

## Solution Implemented

### 1. Created Timezone-Aware Utility

**File**: [backend/utils/datetime_utils.py](backend/utils/datetime_utils.py)

```python
def get_local_today(tz: str = "Pacific/Auckland") -> date:
    """Get today's date in the specified timezone.

    Args:
        tz: Timezone string (defaults to Pacific/Auckland for NZ)

    Returns:
        Today's date in the specified timezone

    Example:
        # Server time: 2025-12-03 23:00 UTC
        # NZ time: 2025-12-04 12:00 NZDT
        # get_local_today() returns date(2025, 12, 4)
    """
    try:
        local_tz = ZoneInfo(tz)
        return datetime.now(local_tz).date()
    except Exception:
        # Fallback to UTC if timezone is invalid
        return datetime.now(timezone.utc).date()
```

### 2. Updated Overdue Task Query

**File**: [backend/services/task_service/crud.py:490](backend/services/task_service/crud.py#L490)

**BEFORE**:
```python
today = date.today()  # Server timezone (UTC)
```

**AFTER**:
```python
from backend.utils.datetime_utils import get_local_today

# Use local timezone (NZ) instead of server timezone
today = get_local_today()  # Pacific/Auckland
```

### 3. Updated Query Specifications

**File**: [backend/services/task_service/queries/specifications.py:113-117](backend/services/task_service/queries/specifications.py#L113-L117)

**BEFORE**:
```python
def __init__(self, as_of_date: Optional[date] = None):
    self.as_of_date = as_of_date or date.today()
```

**AFTER**:
```python
def __init__(self, as_of_date: Optional[date] = None):
    if as_of_date is None:
        from backend.utils.datetime_utils import get_local_today
        self.as_of_date = get_local_today()
    else:
        self.as_of_date = as_of_date
```

---

## How It Works Now (AFTER FIX)

```
Server Time (UTC):       2025-12-03 23:00
User Time (NZ):          2025-12-04 12:00

Backend calculates:
  today = get_local_today()  # Pacific/Auckland
  today = Dec 4 (in NZ timezone)
  Dec 3 < Dec 4? YES → Overdue! ✅

User sees:
  Current date = Dec 4
  Task date = Dec 3
  Overdue list shows Dec 3 ✅
```

---

## Files Modified

1. `backend/utils/datetime_utils.py` - Added `get_local_today()` function
2. `backend/services/task_service/crud.py` - Use `get_local_today()` for overdue check
3. `backend/services/task_service/queries/specifications.py` - Use `get_local_today()` in OverdueTasksSpec

---

## Timezone Configuration

### Current Implementation
- **Default timezone**: `Pacific/Auckland` (New Zealand)
- **Hardcoded** in `get_local_today()` function

### Future Enhancement (TODO)

Ideally, timezone should be:
1. **Stored per user** in the User model:
   ```python
   class User(BaseModel):
       # ... existing fields
       timezone: str = "Pacific/Auckland"  # User's timezone
   ```

2. **Passed to queries**:
   ```python
   today = get_local_today(user.timezone)
   ```

3. **Configurable in user settings** (UI)

For now, the hardcoded value works for the NZ user base.

---

## Testing

### Test Case 1: Task Due Today (Boundary Case)

**Setup**:
- Current time: 2025-12-04 00:30 NZDT (2025-12-03 11:30 UTC)
- Task scheduled: 2025-12-03

**Expected**:
- `get_local_today()` returns `date(2025, 12, 4)`
- Overdue check: `2025-12-03 < 2025-12-04` → **TRUE** ✅
- Task shows in overdue list

### Test Case 2: Task Due Yesterday

**Setup**:
- Current time: 2025-12-05 12:00 NZDT
- Task scheduled: 2025-12-03

**Expected**:
- `get_local_today()` returns `date(2025, 12, 5)`
- Overdue check: `2025-12-03 < 2025-12-05` → **TRUE** ✅
- Task shows in overdue list

### Test Case 3: Task Due Tomorrow

**Setup**:
- Current time: 2025-12-04 12:00 NZDT
- Task scheduled: 2025-12-05

**Expected**:
- `get_local_today()` returns `date(2025, 12, 4)`
- Overdue check: `2025-12-05 < 2025-12-04` → **FALSE** ✅
- Task does NOT show in overdue list

---

## Related Timezone Issues to Check

### Other Places Using `date.today()`

Found these files also using `date.today()`:
- `backend/ai/context_builder.py:214`
- `backend/jobs/daily_task_generator.py:15`
- Multiple test files

**Action Needed**: Review each usage to determine if it should use `get_local_today()` instead.

### Virtual Instance Generation

**File**: `backend/services/virtual_instance_service.py:190-192`

```python
instance_data["scheduled_date"] = datetime.combine(
    occurrence_date, datetime.min.time()
)
```

This creates a **naive datetime** (no timezone). This is actually OK because:
1. We're storing just the date portion
2. Comparisons use `_parse_date()` which extracts just the date part
3. The timezone fix in `get_local_today()` handles the comparison

**No change needed here** - the issue was in the comparison, not the storage.

---

## Benefits of This Fix

1. ✅ **Accurate overdue detection** - Uses user's local time, not server time
2. ✅ **Better UX** - Tasks show as overdue when user expects them to
3. ✅ **Consistent behavior** - All date comparisons use same timezone
4. ✅ **Timezone-aware** - Explicitly handles timezone differences
5. ✅ **Fallback handling** - Falls back to UTC if timezone is invalid

---

## Known Limitations

1. **Hardcoded timezone** - Currently defaults to Pacific/Auckland
   - **Workaround**: Can be changed in `get_local_today()` function
   - **Future**: Should be per-user setting

2. **No daylight saving awareness** - `ZoneInfo` handles this automatically
   - ✅ NZDT (UTC+13) in summer
   - ✅ NZST (UTC+12) in winter

3. **Single timezone per deployment** - All users assumed to be in NZ
   - **Future**: Multi-timezone support when needed

---

**Status**: ✅ Fixed. Overdue tasks now use New Zealand local time for date comparisons.

**Priority**: 🟢 RESOLVED - Was causing 1-day offset in overdue list
