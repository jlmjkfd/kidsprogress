# Unified Task Model Testing

## Overview
Testing plan for the unified task model that replaced separate Routines, Activities, and Time Blocks with a single flexible Task model.

## Test Coverage Summary

### Backend Tests
**Status**: ❌ No tests created yet

**Files to create**:
- `backend/services/__tests__/test_task_service.py`
- `backend/routes/__tests__/test_task_routes.py`
- `backend/workflows/__tests__/test_task_generator.py` (for recurring tasks)

### Frontend Tests
**Status**: ❌ No tests created yet

**Files to create**:
- Component tests for UnifiedTaskModal, RecurrencePicker, TaskCalendar
- API hook tests for task mutations and queries

## Backend Service Tests

### TaskService (backend/services/task_service.py)
**File**: `backend/services/__tests__/test_task_service.py`

#### Task Creation
- [ ] `create_task()` - Creates basic task with required fields
- [ ] `create_task()` - Creates flexible scheduling task
- [ ] `create_task()` - Creates fixed time task
- [ ] `create_task()` - Creates time window task
- [ ] `create_task()` - Creates deadline task
- [ ] `create_task()` - Creates pool task
- [ ] `create_task()` - Creates recurring task with RRULE
- [ ] `create_task()` - Validates parent owns child
- [ ] `create_task()` - Sets default values (status, created_at)
- [ ] `create_task()` - Validates required fields based on scheduling_type

#### Task Retrieval
- [ ] `get_tasks_by_child()` - Returns all tasks for child
- [ ] `get_tasks_by_child()` - Filters by date range
- [ ] `get_tasks_by_child()` - Filters by status
- [ ] `get_tasks_by_child()` - Filters by scheduling_type
- [ ] `get_tasks_by_child()` - Filters pool tasks (is_in_pool=true)
- [ ] `get_task_by_id()` - Returns single task
- [ ] `get_task_by_id()` - Validates parent owns child
- [ ] `get_task_by_id()` - Returns None for non-existent task

#### Task Updates
- [ ] `update_task()` - Updates task fields
- [ ] `update_task()` - Updates recurrence pattern
- [ ] `update_task()` - Updates scheduling constraints
- [ ] `update_task()` - Validates parent owns child
- [ ] `update_task()` - Cannot change child_id
- [ ] `update_task()` - Cannot update completed task

#### Task State Transitions
- [ ] `start_task()` - Changes status to 'in_progress'
- [ ] `start_task()` - Records actual_start_time
- [ ] `pause_task()` - Changes status to 'paused'
- [ ] `pause_task()` - Can only pause 'in_progress' task
- [ ] `resume_task()` - Changes status back to 'in_progress'
- [ ] `resume_task()` - Can only resume 'paused' task
- [ ] `complete_task()` - Changes status to 'completed'
- [ ] `complete_task()` - Records actual_end_time
- [ ] `complete_task()` - Calculates actual_duration

#### Task Deletion
- [ ] `delete_task()` - Hard deletes task
- [ ] `delete_task()` - Validates parent owns child
- [ ] `delete_task()` - Returns 404 for non-existent task

#### Recurring Task Generation
- [ ] `generate_instances()` - Generates task instances from RRULE
- [ ] `generate_instances()` - Respects recurrence frequency (daily, weekly, etc.)
- [ ] `generate_instances()` - Handles end date (until)
- [ ] `generate_instances()` - Handles count limit
- [ ] `generate_instances()` - Links instances to parent task

#### Pool Task Logic
- [ ] `get_pool_tasks()` - Returns tasks with is_in_pool=true
- [ ] `validate_pool_usage()` - Checks max_uses_per_day
- [ ] `validate_pool_usage()` - Checks cooldown_minutes
- [ ] `validate_pool_usage()` - Checks requires_adult_permission

### AI Scheduling Service Tests
**File**: `backend/services/__tests__/test_ai_scheduling.py`

#### Recommendation Engine
- [ ] `get_recommendation()` - Returns next best task for child
- [ ] `get_recommendation()` - Considers time of day
- [ ] `get_recommendation()` - Prioritizes must-do tasks
- [ ] `get_recommendation()` - Respects time windows
- [ ] `get_recommendation()` - Avoids blocked time slots
- [ ] `get_recommendation()` - Returns None if no suitable tasks

#### Conflict Detection
- [ ] `check_conflicts()` - Detects overlapping fixed time tasks
- [ ] `check_conflicts()` - Detects deadline conflicts
- [ ] `check_conflicts()` - Returns conflict details

#### Replanning
- [ ] `replan_schedule()` - Adjusts schedule after task completion
- [ ] `replan_schedule()` - Adjusts schedule after task deletion
- [ ] `replan_schedule()` - Respects constraints (time windows, deadlines)

## Backend Route Tests

### Task Routes (backend/routes/task_routes.py)
**File**: `backend/routes/__tests__/test_task_routes.py`

#### List Tasks Endpoint
- [ ] GET /api/tasks?child_id={id} - Returns tasks for child (200)
- [ ] GET /api/tasks - Requires child_id query param (400)
- [ ] GET /api/tasks - Requires authentication (403)
- [ ] GET /api/tasks - Validates parent owns child (403)
- [ ] GET /api/tasks - Supports date filtering
- [ ] GET /api/tasks - Supports status filtering

#### Get Single Task Endpoint
- [ ] GET /api/tasks/{task_id} - Returns task (200)
- [ ] GET /api/tasks/{task_id} - Returns 404 for non-existent task
- [ ] GET /api/tasks/{task_id} - Requires authentication (403)
- [ ] GET /api/tasks/{task_id} - Validates parent owns child (403)

#### Create Task Endpoint
- [ ] POST /api/tasks - Creates task (201)
- [ ] POST /api/tasks - Returns created task with ID
- [ ] POST /api/tasks - Requires authentication (403)
- [ ] POST /api/tasks - Validates parent owns child (403)
- [ ] POST /api/tasks - Validates required fields (400)
- [ ] POST /api/tasks - Validates scheduling_type-specific fields

#### Update Task Endpoint
- [ ] PUT /api/tasks/{task_id} - Updates task (200)
- [ ] PUT /api/tasks/{task_id} - Returns updated task
- [ ] PUT /api/tasks/{task_id} - Requires authentication (403)
- [ ] PUT /api/tasks/{task_id} - Validates parent owns child (403)
- [ ] PUT /api/tasks/{task_id} - Returns 404 for non-existent task

#### Delete Task Endpoint
- [ ] DELETE /api/tasks/{task_id} - Deletes task (204)
- [ ] DELETE /api/tasks/{task_id} - Requires authentication (403)
- [ ] DELETE /api/tasks/{task_id} - Validates parent owns child (403)
- [ ] DELETE /api/tasks/{task_id} - Returns 404 for non-existent task

#### Task Action Endpoints
- [ ] POST /api/tasks/{task_id}/start - Starts task (200)
- [ ] POST /api/tasks/{task_id}/pause - Pauses task (200)
- [ ] POST /api/tasks/{task_id}/resume - Resumes task (200)
- [ ] POST /api/tasks/{task_id}/complete - Completes task (200)
- [ ] All actions validate parent owns child (403)
- [ ] All actions return updated task

#### AI Endpoints
- [ ] GET /api/ai/schedule/recommend?child_id={id} - Returns recommendation (200)
- [ ] GET /api/ai/schedule/recommend - Requires child_id (400)
- [ ] GET /api/ai/schedule/conflicts?child_id={id} - Returns conflicts (200)
- [ ] POST /api/ai/schedule/replan - Replans schedule (200)

## Frontend Component Tests

### UnifiedTaskModal Component
**File**: `frontend/src/pages/parent-portal/children/[id]/components/__tests__/UnifiedTaskModal.test.tsx`

#### Rendering
- [ ] Not render when isOpen is false
- [ ] Render form when isOpen is true
- [ ] Renders all basic fields (title, description, duration)
- [ ] Renders scheduling type selector
- [ ] Renders obligation level selector
- [ ] Renders recurrence picker when is_recurring=true

#### Scheduling Type Selection
- [ ] Shows flexible scheduling options
- [ ] Shows fixed time options (start_time, end_time)
- [ ] Shows time window options (window_start, window_end)
- [ ] Shows deadline options (deadline, is_hard_deadline)
- [ ] Shows pool options (pool usage rules)
- [ ] Conditional fields appear based on scheduling_type

#### Recurrence Pattern
- [ ] Recurrence toggle shows/hides RecurrencePicker
- [ ] RecurrencePicker updates recurrence_pattern (RRULE)
- [ ] Recurrence end date/count options work

#### Validation
- [ ] Title is required
- [ ] Duration is required
- [ ] scheduling_type is required
- [ ] Fixed time requires start_time and end_time
- [ ] Time window requires window_start and window_end
- [ ] Deadline requires deadline datetime
- [ ] Submit button disabled when validation fails

#### Form Submission
- [ ] Creates new task with correct data
- [ ] Updates existing task when editing
- [ ] Shows loading state during submission
- [ ] Closes modal on success
- [ ] Shows error on failure

#### i18n
- [ ] All labels translate correctly (en/zh)
- [ ] Field descriptions translate correctly

### RecurrencePicker Component
**File**: `frontend/src/components/__tests__/RecurrencePicker.test.tsx`

#### Rendering
- [ ] Renders frequency selector (daily, weekly, monthly)
- [ ] Renders interval input
- [ ] Renders weekday selector for weekly
- [ ] Renders end condition options (never, on date, after count)

#### RRULE Generation
- [ ] Generates correct daily RRULE
- [ ] Generates correct weekly RRULE with weekdays
- [ ] Generates correct monthly RRULE
- [ ] Includes UNTIL when end date set
- [ ] Includes COUNT when count set
- [ ] Calls onChange with valid RRULE string

#### User Interactions
- [ ] Changing frequency updates RRULE
- [ ] Changing interval updates RRULE
- [ ] Selecting weekdays updates RRULE
- [ ] Setting end date updates RRULE
- [ ] Setting count updates RRULE

### TaskCalendar Component
**File**: `frontend/src/components/__tests__/TaskCalendar.test.tsx`

#### Rendering
- [ ] Renders month calendar view
- [ ] Renders all days of month
- [ ] Highlights current day
- [ ] Month navigation buttons work

#### Task Display
- [ ] Shows tasks on correct dates
- [ ] Color codes tasks by obligation level (must-do red, should-do orange, optional gray)
- [ ] Shows task title
- [ ] Shows task time (if fixed time)
- [ ] Limits tasks shown per day (with overflow indicator)

#### Interactions
- [ ] Clicking task opens task details
- [ ] Clicking date shows all tasks for that day
- [ ] Month navigation loads new tasks

## Frontend API Hook Tests

### Task Mutations
**File**: `frontend/src/api/mutations/__tests__/useTasks.test.tsx`

- [ ] useCreateTask - Creates task successfully
- [ ] useUpdateTask - Updates task successfully
- [ ] useDeleteTask - Deletes task successfully
- [ ] useStartTask - Starts task successfully
- [ ] usePauseTask - Pauses task successfully
- [ ] useResumeTask - Resumes task successfully
- [ ] useCompleteTask - Completes task successfully
- [ ] All mutations invalidate task queries on success

### Task Queries
**File**: `frontend/src/api/queries/__tests__/useTasks.test.tsx`

- [ ] useTasks - Fetches tasks for child
- [ ] useTasks - Supports filtering (date, status, type)
- [ ] useTask - Fetches single task by ID
- [ ] Queries use correct query keys
- [ ] Queries cache results properly

### AI Queries
**File**: `frontend/src/api/queries/__tests__/useAIScheduling.test.tsx`

- [ ] useAIRecommendation - Fetches recommendation
- [ ] useAIConflicts - Fetches conflicts
- [ ] useAIReplan - Triggers replanning

## Integration Test Scenarios

### Create Recurring Task
- [ ] Parent opens UnifiedTaskModal
- [ ] Parent fills in basic info (title, duration)
- [ ] Parent selects "Fixed Time" scheduling
- [ ] Parent sets start/end time
- [ ] Parent enables recurrence
- [ ] Parent sets weekly recurrence (Mon, Wed, Fri)
- [ ] Task created successfully
- [ ] Multiple task instances generated for next month

### Task Lifecycle
- [ ] Parent creates task
- [ ] Child starts task → status becomes 'in_progress'
- [ ] Child pauses task → status becomes 'paused'
- [ ] Child resumes task → status becomes 'in_progress'
- [ ] Child completes task → status becomes 'completed'
- [ ] Completed task no longer appears in "To Do" list

### Calendar View
- [ ] Parent opens task list
- [ ] Parent switches to calendar view
- [ ] Calendar shows tasks on correct dates
- [ ] Parent clicks a date
- [ ] All tasks for that date shown
- [ ] Parent clicks a task → task details modal opens

### AI Recommendation
- [ ] Child in child portal
- [ ] Child clicks "What should I do now?" button
- [ ] AI analyzes current time and schedule
- [ ] AI recommends highest priority available task
- [ ] Child accepts recommendation and starts task

## E2E Test Scenarios

### Complete Task Management Flow
- [ ] Parent creates child
- [ ] Parent creates recurring morning routine task (7-8 AM daily)
- [ ] Parent creates deadline task (homework due Friday)
- [ ] Parent creates pool activity (reading, 30 min)
- [ ] Parent views calendar → sees all tasks
- [ ] Child selects themselves in child portal
- [ ] Child sees "What should I do now?" recommendation
- [ ] Child starts recommended task
- [ ] Child completes task
- [ ] Task marked complete in parent portal

## Test Execution Commands

### Backend Tests
```bash
# Run all task tests
./backend/.venv/Scripts/python.exe -m pytest backend/services/__tests__/test_task_service.py backend/routes/__tests__/test_task_routes.py -v

# Run service tests only
./backend/.venv/Scripts/python.exe -m pytest backend/services/__tests__/test_task_service.py -v

# Run route tests only
./backend/.venv/Scripts/python.exe -m pytest backend/routes/__tests__/test_task_routes.py -v
```

### Frontend Tests
```bash
# Run all task component tests
npm test -- src/components/__tests__/RecurrencePicker.test.tsx \
  src/components/__tests__/TaskCalendar.test.tsx \
  src/pages/parent-portal/children/[id]/components/__tests__/UnifiedTaskModal.test.tsx

# Run API hook tests
npm test -- src/api/mutations/__tests__/useTasks.test.tsx \
  src/api/queries/__tests__/useTasks.test.tsx \
  src/api/queries/__tests__/useAIScheduling.test.tsx
```

## Priority Tests to Write First

### Critical Backend Tests (High Priority)
1. Task creation with different scheduling types
2. Task state transitions (start, pause, resume, complete)
3. Recurring task instance generation
4. Task retrieval and filtering

### Critical Frontend Tests (High Priority)
1. RecurrencePicker RRULE generation
2. UnifiedTaskModal form validation
3. Task list with status grouping
4. Calendar view task display

### Medium Priority
- AI recommendation logic
- Pool task validation
- Conflict detection
- Task calendar navigation

### Low Priority (Nice to Have)
- Edge cases (very long task lists, complex recurrence patterns)
- Performance tests (large date ranges)
- Visual regression tests

## Related Documentation
- [Unified Task Model Context](./context.md)
- [Task Management Testing](../task-management/testing.md)
- [API Registry](../../api-registry.md)
