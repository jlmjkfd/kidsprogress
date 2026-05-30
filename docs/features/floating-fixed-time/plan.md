# Floating vs Fixed Time Implementation Plan

## Overview

Implement industry-standard timezone handling with explicit support for both **floating** (location-dependent) and **fixed** (timezone-specific) time scheduling.

## Problem Statement

Current system:
- Stores all datetimes as UTC
- No distinction between floating and fixed time
- When user travels, all tasks follow UTC time (wrong for most personal tasks)
- Example: "Bedtime at 8 PM" should be 8 PM wherever child is (floating), not 8 PM in original timezone

## Solution: Dual-Mode Time Handling

### Floating Time (Default)
- Task scheduled for "Jan 11, 3 PM" stays at 3 PM in user's **current** timezone
- Best for: Daily routines, medications, exercise, homework
- Storage: Date + time components separately, with original timezone for reference

### Fixed Time
- Task scheduled for "Jan 11, 3 PM PST" stays at 3 PM Pacific time
- Shows equivalent in user's current timezone
- Best for: Video calls, webinars, coordinated events
- Storage: Datetime with specific timezone

## Data Model Changes

### Current Model
```python
class Task:
    scheduled_date: Optional[datetime]  # UTC datetime
    fixed_time_slot: Optional[TimeSlot]  # {start: "15:00", end: "16:00"}
```

### New Model
```python
class Task:
    # Floating time (most tasks)
    scheduled_date: Optional[str]  # "2026-01-11" (date only)
    scheduled_time: Optional[str]  # "15:00" (time in HH:MM, optional)

    # Fixed time (special cases)
    scheduled_datetime: Optional[datetime]  # Full datetime with timezone
    scheduled_timezone: Optional[str]  # IANA timezone ("America/New_York")

    # Metadata
    is_floating_time: bool = True  # Default: floating
    created_timezone: str  # Timezone when task was created (for reference)

    # Legacy fields (deprecated, for backwards compat)
    # scheduled_date will be migrated to new format
```

### Time Slot Model
```python
class TimeSlot:
    start: str  # "15:00"
    end: str    # "16:00"
    # For floating tasks, these are in local time
    # For fixed tasks, these combine with scheduled_datetime's timezone
```

## Implementation Steps

### Phase 1: Backend Models

1. **Add new fields to Task model** (`backend/models/task.py`)
   - `scheduled_date` → change type to `Optional[str]` (date only)
   - Add `scheduled_time: Optional[str]`
   - Add `scheduled_datetime: Optional[datetime]`
   - Add `scheduled_timezone: Optional[str]`
   - Add `is_floating_time: bool = True`
   - Add `created_timezone: str`

2. **Create timezone value object** (`backend/models/timezone_info.py`)
   ```python
   class TimezoneInfo:
       """Value object for timezone handling"""
       timezone: str  # IANA timezone

       def to_utc(self, local_dt: datetime) -> datetime:
           """Convert local datetime to UTC"""

       def from_utc(self, utc_dt: datetime) -> datetime:
           """Convert UTC datetime to local"""
   ```

3. **Update TaskCreate/TaskUpdate models**
   - Add validation: either (scheduled_date + scheduled_time) OR scheduled_datetime
   - Set `created_timezone` from request header (`X-Timezone`)

### Phase 2: Backend Services

4. **Update virtual_instance_service.py**
   - For floating tasks: Use `scheduled_date` + `scheduled_time`
   - For fixed tasks: Convert `scheduled_datetime` to user's timezone

5. **Update task_service/crud.py**
   - `create_task`: Set `created_timezone` from context
   - `create_task`: For recurring, use local date for `effective_from`
   - Handle both floating and fixed time in queries

6. **Update recurrence_rule_service.py**
   - Store timezone with recurrence rules
   - Generate occurrences respecting timezone

### Phase 3: Backend Routes

7. **Update completion_routes.py**
   - Handle both time formats when materializing virtual instances

8. **Update tasks.py routes**
   - Return timezone info in task responses
   - Accept timezone in headers

### Phase 4: Frontend Types

9. **Update types/task.ts**
   ```typescript
   interface Task {
     // Floating time
     scheduled_date?: string;      // "2026-01-11"
     scheduled_time?: string;      // "15:00"

     // Fixed time
     scheduled_datetime?: string;  // ISO string with timezone
     scheduled_timezone?: string;  // "America/New_York"

     is_floating_time: boolean;
     created_timezone: string;

     // Display helpers
     fixed_time_slot?: TimeSlot;  // Still used for UI
   }
   ```

### Phase 5: Frontend Utils

10. **Update utils/timezone.ts**
    ```typescript
    export function getDisplayDate(task: Task): string {
      if (task.is_floating_time) {
        return task.scheduled_date!;  // Already correct date
      } else {
        // Convert fixed datetime to user's local date
        return utcToLocalDate(task.scheduled_datetime!);
      }
    }

    export function getDisplayTime(task: Task): string {
      if (task.is_floating_time) {
        return task.scheduled_time || task.fixed_time_slot?.start || "";
      } else {
        // Show both local and origin time
        const localTime = formatLocalTime(task.scheduled_datetime!);
        const tz = task.scheduled_timezone!;
        return `${localTime} (${tz})`;
      }
    }
    ```

### Phase 6: Frontend Components

11. **Update UnifiedTaskModal.tsx**
    - Add radio toggle: "Floating Time" vs "Fixed Time"
    - Show different UI based on selection:
      - Floating: Date picker + time picker (optional)
      - Fixed: Datetime picker + timezone selector

12. **Update TaskCard.tsx**
    - Display time with timezone indicator
    - Show tooltip for fixed time tasks

13. **Update calendar components**
    - TaskCalendar.tsx: Use `getDisplayDate()` for grouping
    - WeekView.tsx: Use `getDisplayTime()` for display

### Phase 7: Migration

14. **Create migration script** (`backend/scripts/migrate_to_floating_time.py`)
    - Read existing tasks
    - For each task with `scheduled_date` (old format):
      - Extract date component → `scheduled_date` (new)
      - Extract time → `scheduled_time` or `fixed_time_slot`
      - Set `is_floating_time = True`
      - Set `created_timezone = "Pacific/Auckland"` (default)

15. **Recurrence rules migration**
    - Add `timezone` field to recurrence rules
    - Default to `"Pacific/Auckland"` for existing rules

## Database Migration Strategy

### Collections to Empty (Fresh Start)

Given the complexity of data migration and that this is a development environment:

**Option 1: Fresh Start (Recommended for Development)**
```bash
# Empty these collections:
- tasks
- recurrence_rules
- completions (depends on tasks)
- sessions (if task-related)
```

**Option 2: Selective Migration (If Preserving Data)**
```python
# Keep:
- users
- children
- task_collections
- school_calendars

# Migrate:
- tasks (run migration script)
- recurrence_rules (run migration script)

# Regenerate:
- completions (will be recreated as users complete tasks)
```

### Migration Steps

1. Backup database:
   ```bash
   mongodump --db kidsprogress --out backup_before_floating_time
   ```

2. Run migration script or empty collections

3. Restart backend server

4. Create sample tasks to verify

## UI/UX Changes

### Task Creation Modal

**Add Toggle:**
```
┌─────────────────────────────────────┐
│ Scheduling                          │
│                                     │
│ ○ Floating Time (follows you)      │
│ ○ Fixed Time (specific timezone)   │
│                                     │
│ [Date: Jan 11, 2026]               │
│ [Time: 15:00] (optional)           │
│                                     │
│ ℹ️  Floating time: 3 PM wherever   │
│    you are                         │
└─────────────────────────────────────┘
```

**If Fixed Time Selected:**
```
┌─────────────────────────────────────┐
│ Scheduling                          │
│                                     │
│ ○ Floating Time (follows you)      │
│ ● Fixed Time (specific timezone)   │
│                                     │
│ [DateTime: Jan 11, 2026 15:00]     │
│ [Timezone: Pacific/Auckland ▼]     │
│                                     │
│ ℹ️  Will show as equivalent time   │
│    in other timezones              │
└─────────────────────────────────────┘
```

### Task Display

**Floating Task:**
```
📚 Do Homework
📅 Jan 11
🕐 3:00 PM
```

**Fixed Task:**
```
📞 Call Grandma
📅 Jan 11
🕐 3:00 PM (10:00 AM EST)
🌍 Fixed timezone
```

## Testing Strategy

### Unit Tests

1. **Test timezone value object**
   - UTC conversion
   - Local conversion
   - DST handling

2. **Test floating time tasks**
   - Create task in one timezone
   - Display in different timezone
   - Verify time stays same

3. **Test fixed time tasks**
   - Create task with specific timezone
   - Display in different timezone
   - Verify time converts correctly

### Integration Tests

4. **Test recurrence with floating time**
   - Create daily recurring task
   - User travels to different timezone
   - Verify tasks still appear at same local time

5. **Test recurrence with fixed time**
   - Create weekly meeting (fixed time)
   - User travels
   - Verify time converts but date might shift

### E2E Tests

6. **Test user journey**
   - User in NZ creates tasks
   - User travels to USA
   - Verify floating tasks update
   - Verify fixed tasks show correct conversion

## Backwards Compatibility

### Reading Old Data

```python
def get_display_date(task: Task) -> str:
    # New format
    if task.scheduled_date and not isinstance(task.scheduled_date, datetime):
        return task.scheduled_date

    # Old format (datetime)
    if task.scheduled_date and isinstance(task.scheduled_date, datetime):
        return utc_to_local_date(task.scheduled_date)

    return ""
```

### Writing New Data

All new tasks use new format:
- `scheduled_date: "2026-01-11"`
- `scheduled_time: "15:00"`
- `is_floating_time: True`

## Rollout Plan

### Phase 1: Backend Only (Can Deploy Independently)
- Update models (with defaults)
- Update services to handle both formats
- Deploy backend

### Phase 2: Frontend (Requires Phase 1)
- Update types
- Update utils
- Update components
- Deploy frontend

### Phase 3: Migration (After Testing)
- Run migration script or empty collections
- Verify with sample data

### Phase 4: Documentation
- Update user docs
- Update developer docs
- Create timezone guide for users

## Open Questions

1. **Default for existing users?**
   - Proposal: Default to floating time for all existing tasks
   - Reasoning: Most personal tasks are location-dependent

2. **UI for timezone selection?**
   - Proposal: Autocomplete dropdown with common timezones
   - Grouped by region (Americas, Europe, Asia-Pacific, etc.)

3. **Mobile app support?**
   - Proposal: Automatically detect device timezone
   - Allow manual override in settings

4. **Recurring tasks crossing DST boundary?**
   - Floating: No issue (always same local time)
   - Fixed: Handled by zoneinfo library automatically

## Success Criteria

- [ ] User can create floating time tasks (default)
- [ ] User can create fixed time tasks (opt-in)
- [ ] Floating tasks display correctly after timezone change
- [ ] Fixed tasks show correct conversion with timezone indicator
- [ ] Recurring tasks generate correctly in both modes
- [ ] All existing functionality preserved
- [ ] Migration script runs successfully
- [ ] Documentation updated

## Timeline Estimate

- Backend models & services: 2-3 hours
- Frontend types & utils: 1-2 hours
- Frontend UI components: 2-3 hours
- Testing & debugging: 2-3 hours
- Migration & documentation: 1 hour

**Total: 8-12 hours**

## References

- Industry strategy: `docs/architecture/timezone-strategy.md`
- Architecture patterns: `.claude/skills/architecture-patterns.md`
- Current timezone fixes: Commit 1e24ed2
