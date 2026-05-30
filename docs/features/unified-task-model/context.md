# Unified Task Model - Context

> Last updated: 2025-11-17

## Overview
Unified task management system that replaces the previous separate Routines, Activities, and Time Blocks models with a single flexible Task model.

## Problem Statement
The original design had three separate models (Routines, Activities, Time Blocks), which led to:
- Complex UI with multiple tabs and forms
- Duplicate code patterns
- Inconsistent field names and behaviors
- User confusion about which type to use

## Solution
Single `Task` model with comprehensive fields covering all use cases:
- **Scheduling types**: Flexible, fixed time, time window, deadline, activity pool
- **Obligation levels**: Must do, should do, optional
- **Recurrence**: RRULE-based recurring tasks
- **Advanced options**: Blocking, interruption, splitting, pool usage rules

## API Endpoints

### Tasks
- `GET /api/tasks?child_id={id}` - List all tasks for child
- `GET /api/tasks/{task_id}` - Get single task
- `POST /api/tasks` - Create task
- `PUT /api/tasks/{task_id}` - Update task
- `DELETE /api/tasks/{task_id}` - Delete task
- `POST /api/tasks/{task_id}/start` - Start task
- `POST /api/tasks/{task_id}/pause` - Pause task
- `POST /api/tasks/{task_id}/resume` - Resume task
- `POST /api/tasks/{task_id}/complete` - Complete task

### AI Scheduling
- `GET /api/ai/schedule/recommend?child_id={id}` - Get AI task recommendation
- `GET /api/ai/schedule/conflicts?child_id={id}` - Check schedule conflicts
- `POST /api/ai/schedule/replan` - Replan schedule after changes

## Components

### Frontend Components
- **RecurrencePicker** (`frontend/src/components/RecurrencePicker.tsx`) - User-friendly recurrence pattern builder
- **TaskCalendar** (`frontend/src/components/TaskCalendar.tsx`) - Monthly calendar view for tasks
- **UnifiedTaskModal** (`frontend/src/pages/parent-portal/children/[id]/components/UnifiedTaskModal.tsx`) - Create/edit task modal
- **AIRecommendationButton** (`frontend/src/components/AIRecommendationButton.tsx`) - "What should I do now?" feature

### Pages
- **Parent Portal Tasks** (`frontend/src/pages/parent-portal/children/[id]/tasks.tsx`) - Task management with list/calendar view toggle
- **Child Portal Tasks** (`frontend/src/pages/child-portal/tasks/index.tsx`) - Kid-friendly task view with list/calendar toggle

## Backend Models
- **Task** (`backend/models/task.py`) - Main task model with all unified fields
- **TaskService** (`backend/services/task_service.py`) - Business logic for task operations
- **TaskRoutes** (`backend/routes/task_routes.py`) - API route handlers

## Key Technical Decisions

### RRULE for Recurrence
- Uses standard iCalendar recurrence format (RFC 5545)
- RecurrencePicker component converts user selections to RRULE
- Backend parses RRULE for task generation

### Scheduling Types
1. **Flexible** - AI schedules at optimal time
2. **Fixed Time** - Specific start/end time (e.g., school 8:00-15:00)
3. **Time Window** - Must complete within window (e.g., homework between 16:00-19:00)
4. **Deadline** - Must complete before deadline (soft or hard)
5. **Activity Pool** - Available for breaks/free time

### Obligation Levels
- **Must Do** - Required tasks (red badge)
- **Should Do** - Recommended tasks (orange badge)
- **Optional** - Nice-to-have tasks (gray badge)

### View Modes
- **List View** - Grouped by status (In Progress, Paused, To Do)
- **Calendar View** - Monthly calendar with color-coded tasks

## Files Modified

### Backend
- `backend/models/task.py` - Updated Task model schema
- `backend/services/task_service.py` - Added unified task operations
- `backend/routes/task_routes.py` - Task API endpoints
- `backend/main.py` - Commented out obsolete routes (routines, activities, time_blocks)

### Frontend
- `frontend/src/components/RecurrencePicker.tsx` - NEW (recurrence UI)
- `frontend/src/components/TaskCalendar.tsx` - NEW (calendar view)
- `frontend/src/pages/parent-portal/children/[id]/tasks.tsx` - Added view toggle
- `frontend/src/pages/parent-portal/children/[id]/components/UnifiedTaskModal.tsx` - Comprehensive task form
- `frontend/src/pages/parent-portal/children/[id]/layout.tsx` - Removed obsolete tabs
- `frontend/src/pages/child-portal/tasks/index.tsx` - Added view toggle
- `frontend/src/i18n/locales/en/tasks.json` - Added unified_model translations

### Documentation
- `docs/api-registry.md` - Marked obsolete endpoints, added unified task endpoints
- `docs/component-map.md` - Added RecurrencePicker, TaskCalendar components

## Migration Notes

### From Routines
- Set `is_recurring=true` and `recurrence_pattern` (RRULE format)
- Use `scheduling_type="fixed_time"` or `"flexible"`
- Set `obligation_level` based on importance

### From Activities
- Set `is_in_pool=true` for activity pool items
- Configure `pool_usage_rules` (max times/day, cooldown, etc.)
- Use `scheduling_type="pool"`

### From Time Blocks
- Set `blocks_other_tasks=true` for blocking events (e.g., school)
- Use `scheduling_type="fixed_time"`
- Set `can_be_interrupted=false` for strict blocks

## Known Issues

### Child Authentication (Pending)
- Child portal relies on `selectedChildId` from Redux state
- Currently null in child portal, causing 422 errors in AI recommendation
- Short-term fix: Validation in AIRecommendationButton shows warning
- Long-term fix: Implement proper child authentication that stores child_id in auth state

### Chinese Translations (Pending)
- English translations complete in `frontend/src/i18n/locales/en/tasks.json`
- Chinese translations needed in `frontend/src/i18n/locales/zh/tasks.json`

## Next Steps
1. Implement proper child authentication
2. Add Chinese translations
3. Create data migration script for existing routines/activities/time-blocks
4. Delete obsolete backend files after migration complete
