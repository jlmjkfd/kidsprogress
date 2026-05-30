# Floating vs Fixed Time Implementation - Status

## ✅ COMPLETED (Backend + Frontend Core)

### Backend (100% Complete)
- ✅ TimezoneInfo value object
- ✅ Task model with floating/fixed time fields
- ✅ TaskCreate/TaskUpdate with validation
- ✅ Virtual instance service handles both formats
- ✅ Task CRUD sets created_timezone from request
- ✅ Recurrence rule service stores timezone
- ✅ Task sorting handles both formats
- ✅ Backwards compatibility with old datetime format

### Frontend Core (100% Complete)
- ✅ Task interface updated with new fields
- ✅ Timezone utils with helper functions:
  - `getTaskDisplayDate()` - handles floating/fixed
  - `getTaskDisplayTime()` - handles floating/fixed
  - `getTaskDisplayDateTime()` - full datetime
  - `isTaskToday()` - today check
- ✅ Child portal task pages updated (index.tsx, attempts/[taskId].tsx)
- ✅ Task display components updated:
  - ✅ OverdueTaskCard.tsx
  - ✅ WeekView.tsx
  - ✅ TaskCard.tsx (parent portal)

## 🚧 TODO (Frontend UI for Creating/Editing Tasks)

### 1. Update UnifiedTaskModal to support floating/fixed toggle
**File:** `frontend/src/pages/parent-portal/children/[id]/components/UnifiedTaskModal.tsx`

**Current status:** Needs UI toggle and form logic

**Add state:**
```typescript
const [isFloatingTime, setIsFloatingTime] = useState(true);
```

**Add UI section in SchedulingSection:**
```tsx
<div className="space-y-2">
  <label className="text-sm font-medium">Time Type</label>
  <div className="flex gap-4">
    <label className="flex items-center gap-2">
      <input
        type="radio"
        checked={isFloatingTime}
        onChange={() => setIsFloatingTime(true)}
      />
      <span>Floating Time (follows you)</span>
    </label>
    <label className="flex items-center gap-2">
      <input
        type="radio"
        checked={!isFloatingTime}
        onChange={() => setIsFloatingTime(false)}
      />
      <span>Fixed Time (specific timezone)</span>
    </label>
  </div>
  <p className="text-xs text-gray-500">
    {isFloatingTime
      ? "Task time stays the same wherever you are (e.g., 3 PM local)"
      : "Task time fixed to specific timezone (e.g., 3 PM EST)"
    }
  </p>
</div>

{isFloatingTime ? (
  // Existing date + time inputs
  <>
    <input type="date" value={scheduledDate} ... />
    <input type="time" value={scheduledTime} ... />
  </>
) : (
  // New: datetime + timezone selector
  <>
    <input type="datetime-local" value={scheduledDateTime} ... />
    <select value={timezone}>
      <option value="Pacific/Auckland">Pacific/Auckland (NZDT)</option>
      <option value="America/New_York">America/New_York (EST)</option>
      <option value="Europe/London">Europe/London (GMT)</option>
      <!-- Add more timezones -->
    </select>
  </>
)}
```

**Update form submission:**
```typescript
const taskData = {
  ...formData,
  is_floating_time: isFloatingTime,

  // Floating time fields
  ...(isFloatingTime && {
    scheduled_date: scheduledDate,  // "2026-01-11"
    scheduled_time: scheduledTime,  // "15:00"
  }),

  // Fixed time fields
  ...(!isFloatingTime && {
    scheduled_datetime: new Date(scheduledDateTime).toISOString(),
    scheduled_timezone: timezone,
  }),
};
```

### 2. Update API mutations
**File:** `frontend/src/api/mutations/useTaskMutations.ts`

Ensure mutations send correct fields:
```typescript
{
  is_floating_time: true,
  scheduled_date: "2026-01-11",
  scheduled_time: "15:00",
  // OR
  is_floating_time: false,
  scheduled_datetime: "2026-01-11T15:00:00Z",
  scheduled_timezone: "America/New_York"
}
```

## 🧪 TESTING STEPS

### After completing UI changes:

1. **Empty database collections:**
   ```javascript
   use kidsprogress
   db.tasks.deleteMany({})
   db.recurrence_rules.deleteMany({})
   db.task_completions.deleteMany({})  // Note: collection is task_completions, not completions
   ```

2. **Restart backend:**
   ```bash
   cd backend
   python -m uvicorn main:app --reload
   ```

3. **Test floating time task:**
   - Create task for "tomorrow at 3 PM"
   - Verify stored as: `{scheduled_date: "2026-01-12", scheduled_time: "15:00"}`
   - Verify displays: "Jan 12, 2026 3:00 PM"

4. **Test fixed time task:**
   - Toggle to "Fixed Time"
   - Create task for "tomorrow at 3 PM EST"
   - Verify stored as: `{scheduled_datetime: "2026-01-12T20:00:00Z", scheduled_timezone: "America/New_York"}`
   - Verify displays: "Jan 13, 2026 9:00 AM (America/New_York)" (in NZ timezone)

5. **Test recurring task:**
   - Create daily recurring task
   - Verify virtual instances generate with correct dates
   - Verify recurrence rule has timezone

## 📊 PROGRESS

**Overall: 85% Complete**
- Backend: 100% ✅
- Frontend Core: 100% ✅
- Frontend UI (display): 100% ✅
- Frontend UI (create/edit): 0% 🚧
- Testing: 0% ⏸️

## 📝 NOTES

- All backend changes are backwards compatible
- Old tasks with datetime `scheduled_date` will still work
- Frontend helpers gracefully handle both old and new formats
- Default behavior: all tasks are floating time (unless explicitly set otherwise)
- **Important:** Collection name is `task_completions`, not `completions`

## 🔗 REFERENCES

- Plan: `docs/features/floating-fixed-time/plan.md`
- Migration: `docs/features/floating-fixed-time/MIGRATION_GUIDE.md`
- Timezone strategy: `docs/architecture/timezone-strategy.md`

## ⏭️ NEXT SESSION

1. Update UnifiedTaskModal with floating/fixed toggle
2. Update API mutations to send correct fields
3. Test end-to-end
4. Update documentation

## 📝 COMPLETED THIS SESSION

### Commits:
1. ✅ `feat: Update child portal task pages to use new timezone helpers`
   - Updated index.tsx and attempts/[taskId].tsx
   - Replaced utcToLocalDate() with getTaskDisplayDate()
   - Used isTaskToday() for filtering

2. ✅ `feat: Update task display components to use timezone helpers`
   - Updated OverdueTaskCard.tsx, WeekView.tsx, TaskCard.tsx
   - Replaced .split('T')[0] with getTaskDisplayDate()
   - Replaced toLocaleDateString() with formatLocalDate()

### Summary:
- All task display logic now uses centralized timezone helpers
- Frontend correctly handles both floating and fixed time tasks
- Remaining work: UI for creating/editing tasks with floating/fixed toggle
