# Overdue Tasks Feature

**Status**: ✅ Implemented (Backend + Frontend UI)
**Date**: 2025-12-08

## Overview

Simplified overdue task system that replaces automatic rollover/carry-over logic with query-based approach.

## Key Decisions

1. **No automatic state changes** - Tasks naturally stay on their original scheduled date
2. **Query-based filtering** - Overdue = `scheduled_date < today && status not in [completed, skipped, archived]`
3. **MUST_DO highlighting** - Calendar and stats show MUST_DO overdue tasks prominently
4. **No nightly jobs** - Removed task_rollover_job.py and task_carryover_job.py

## APIs

### Backend Endpoints
- `GET /api/tasks/child/{child_id}/overdue` - Get overdue tasks (optional: must_do_only)
- `GET /api/tasks/child/{child_id}/overdue/stats` - Get statistics (total, must_do count, by_date)

### Frontend Hooks
- `useOverdueTasks(childId, mustDoOnly)` - Query hook for overdue tasks list
- `useOverdueStats(childId)` - Query hook for overdue statistics

## Files Modified/Created

### Backend
- `backend/models/task.py` - No new fields needed (uses existing scheduled_date)
- `backend/routes/tasks.py:72-107` - Added overdue endpoints
- `backend/services/task_service/crud.py:338-428` - Added get_overdue_tasks, get_overdue_stats
- `backend/services/task_service/__init__.py:108-135` - Added facade methods

### Frontend - API/Hooks
- `frontend/src/api/queries/useTasks.ts:60-87` - Added overdue hooks
- `frontend/src/types/task.ts` - No new types needed

### Frontend - UI Components
- `frontend/src/pages/child-portal/tasks/index.tsx` - Added overdue tab view
  - Lines 236-251: Overdue tab button with badge
  - Lines 269-358: Overdue view with stats summary and task list

### Frontend - i18n
- `frontend/src/i18n/locales/en/tasks.json:571-575` - English translations
- `frontend/src/i18n/locales/zh/tasks.json:572-576` - Chinese translations

### Removed
- `backend/jobs/task_rollover_job.py` - Deleted
- `backend/jobs/task_carryover_job.py` - Deleted
- `backend/services/task_service/rollover.py` - Removed rollover_task() method
- Carry-over fields from Task model (is_carried_over, carried_over_from, etc.)

## UI Implementation Status

### ✅ Completed
1. **Overdue tab** in child portal (3 tabs: Today | Overdue | Calendar)
2. **Stats display** - Shows total overdue count in badge, MUST_DO warning in stats summary
3. **Task list** - Shows scheduled date for each overdue task with MUST_DO badge
4. **Mobile-first responsive design** - Tab buttons scale on different screen sizes

### 🔲 Still Needed
1. **Calendar highlighting** - Highlight days with overdue MUST_DO tasks (requires TaskCalendar component modification)

## Technical Notes

- Simple date comparison: `datetime.combine(date.today(), datetime.min.time())`
- MongoDB query: `{"scheduled_date": {"$lt": today_start}, "status": {"$nin": ["completed", "skipped", "archived"]}}`
- Stats grouped by date using `defaultdict(int)`
