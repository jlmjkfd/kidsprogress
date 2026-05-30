# Kids Create Tasks Feature

**Status**: ✅ Implemented (Backend + Frontend hooks)
**Date**: 2025-12-08

## Overview

Unified feature allowing kids to create their own tasks - both planning ahead and quick capture ("What I'm Doing Now").

## Use Cases

1. **Plan Ahead**: "Tomorrow I want to practice guitar" → Creates PENDING task for tomorrow
2. **Quick Capture**: "I'm reading a book right now" → Creates IN_PROGRESS task immediately

## Business Rules

### Kids CAN
- Create one-off tasks (no recurrence)
- Assign to themselves only
- Set title, description, time, duration
- Start immediately (quick_capture mode)

### Kids CANNOT
- Create recurring tasks (future feature)
- Set obligation_level (auto-set to OPTIONAL)
- Assign to siblings
- Delete parent-created tasks

### Parents CAN
- View all kid-created tasks (filter: `created_by === "CHILD"`)
- Edit any field (convert to MUST_DO, add recurrence, etc.)
- Delete kid-created tasks
- No approval needed (trust model)

## Schema

### Task Model Fields
```python
created_by: str = "PARENT"  # or "CHILD"
quick_capture: bool = False  # True if "What I'm Doing Now"
```

### ChildTaskCreate Request
```typescript
{
  title: string;
  description?: string;
  scheduled_date?: string;  // ISO datetime
  scheduled_time?: string;  // HH:MM format
  estimated_duration_minutes?: number;
  quick_capture: boolean;
}
```

## APIs

### Backend Endpoint
- `POST /api/tasks/child/{child_id}/create` - Create task as child

### Auto-Set Defaults
- `obligation_level` = OPTIONAL
- `created_by` = CHILD
- `task_source` = ONE_TIME
- `scheduling_type` = FLEXIBLE
- `status` = IN_PROGRESS (if quick_capture) or PENDING
- `started_at` = now (if quick_capture) or null

### Frontend Hook
- `useCreateTaskAsChild()` - Mutation hook for kids to create tasks

## Files Modified/Created

### Backend
- `backend/models/task.py:261-263` - Added created_by, quick_capture fields
- `backend/models/task.py:455-462` - Added ChildTaskCreate model
- `backend/routes/tasks.py:110-125` - Added POST /api/tasks/child/{child_id}/create
- `backend/services/task_service/crud.py:144-240` - Added create_task_as_child method
- `backend/services/task_service/__init__.py:75-91` - Added facade method

### Frontend - API/Types
- `frontend/src/types/task.ts:334-336` - Added created_by, quick_capture to Task
- `frontend/src/types/task.ts:484-491` - Added ChildTaskCreate interface
- `frontend/src/api/mutations/useTaskMutations.ts:31-48` - Added useCreateTaskAsChild hook

### Frontend - UI Components (NEW)
- `frontend/src/components/QuickCaptureModal.tsx` - Quick capture modal component
- `frontend/src/components/PlanAheadModal.tsx` - Plan ahead modal component
- `frontend/src/pages/child-portal/tasks/index.tsx` - Added create task buttons + modals

### Frontend - i18n
- `frontend/src/i18n/locales/en/tasks.json:556-570` - English translations
- `frontend/src/i18n/locales/zh/tasks.json:557-571` - Chinese translations

## UI Implementation Status

### ✅ Completed
1. Quick Capture modal ("What I'm Doing Now" button) - Green gradient button
2. Plan Ahead form (kids create future tasks) - Blue gradient button
3. Mobile-first responsive design (1 col mobile, 2 cols tablet+)

### 🔲 Still Needed
1. Parent view filter (show kid-created vs parent-created tasks)
2. Visual indicator for kid-created tasks (e.g., badge)

## Technical Notes

- Auto-creates default "My Tasks" collection if doesn't exist
- Gets parent_id from child document (authorization)
- Collection lookup: `{"child_id": child_id_obj, "is_default": True}`
- Quick capture sets status=IN_PROGRESS and started_at=now
- All other fields set to safe defaults (no MUST_DO, no recurrence, etc.)
