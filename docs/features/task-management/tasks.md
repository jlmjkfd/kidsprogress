# Enhanced Task Management - Implementation Tasks

## Phase 1: Backend Foundation (2 weeks)

### Models
- [ ] Update `backend/models/task.py`
  - [ ] Add `task_source: TaskSource` enum field
  - [ ] Add `source_id: Optional[ObjectId]` field
  - [ ] Add `source_metadata: Optional[TaskSourceMetadata]` field
  - [ ] Add `scheduling_type: SchedulingType` enum field
  - [ ] Add `fixed_time_slot: Optional[TimeSlot]` field
  - [ ] Add `preferred_time_slot: Optional[TimeSlot]` field
  - [ ] Add `original_date: Optional[date]` field
  - [ ] Add `rollover_count: int` field (default 0)
  - [ ] Add `is_in_backlog: bool` field (default False)
  - [ ] Add `is_delayed: bool` field (default False)
  - [ ] Add `concurrent_allowed: bool` field (default False)
  - [ ] Add `concurrent_compatible_with: List[str]` field
  - [ ] Add `priority_boost: int` field (range -5 to +5)
  - [ ] Add `obligation_level: ObligationLevel` enum field

- [ ] Create `backend/models/routine.py`
  - [ ] `Routine` model with RRULE pattern
  - [ ] `RecurrencePattern` model (frequency, interval, by_weekday, by_month_day, etc.)
  - [ ] `TimeSlot` model (start, end times)
  - [ ] Validation for RRULE consistency

- [ ] Create `backend/models/activity.py`
  - [ ] `Activity` model with usage rules
  - [ ] `UsageRule` model (max_times_per_day, max_duration_minutes, allowed_days)
  - [ ] `ActivityUsage` model for tracking

- [ ] Create `backend/models/time_block.py`
  - [ ] `TimeBlock` model (blocks time, optional task creation)
  - [ ] `DayType` model (school_day, weekend, holiday, special)
  - [ ] Date range validation

- [ ] Create `backend/models/tool.py`
  - [ ] `Tool` model with registry fields
  - [ ] `ToolCategory`, `ToolScope`, `DisplayMode`, `IntegrationType` enums
  - [ ] Tool configuration schema

### Services
- [ ] Update `backend/services/task_service.py`
  - [ ] `rollover_task()` - Move incomplete task to next day
  - [ ] `move_to_backlog()` - Move task after 3 rollovers
  - [ ] `validate_concurrent_tasks()` - Check concurrent rules
  - [ ] `calculate_scheduling_priority()` - Multi-factor priority

- [ ] Create `backend/services/routine_service.py`
  - [ ] `create_routine()` - CRUD operations
  - [ ] `generate_tasks_for_date()` - Create task instances from routine
  - [ ] `get_next_occurrence()` - Calculate next RRULE date
  - [ ] `cancel_routine_instance()` - Skip specific date
  - [ ] RRULE edge case handling (leap years, DST)

- [ ] Create `backend/services/activity_service.py`
  - [ ] `create_activity()` - CRUD operations
  - [ ] `check_usage_rules()` - Validate against limits
  - [ ] `track_usage()` - Record activity completion
  - [ ] `get_available_activities()` - Filter by rules

- [ ] Create `backend/services/schedule_service.py`
  - [ ] `generate_daily_schedule()` - Combine routines + activities
  - [ ] `detect_time_conflicts()` - Check overlapping tasks
  - [ ] `get_tasks_for_date()` - Retrieve day's tasks
  - [ ] `get_available_time_slots()` - Find free time

- [ ] Create `backend/services/tool_service.py`
  - [ ] `register_tool()` - Add to registry
  - [ ] `get_applicable_tools()` - Filter by task type
  - [ ] `check_tool_availability()` - Validate scope/permissions

### Routes
- [ ] Update `backend/routes/task_routes.py`
  - [ ] `POST /tasks/{task_id}/rollover` - Manual rollover
  - [ ] `POST /tasks/{task_id}/backlog` - Move to backlog
  - [ ] `GET /tasks?source={source}&source_id={id}` - Filter by source
  - [ ] Update existing endpoints for new fields

- [ ] Create `backend/routes/routine_routes.py`
  - [ ] `POST /routines` - Create routine
  - [ ] `GET /routines?child_id={id}` - List routines
  - [ ] `PUT /routines/{routine_id}` - Update routine
  - [ ] `DELETE /routines/{routine_id}` - Delete routine
  - [ ] `POST /routines/{routine_id}/generate` - Generate task instances
  - [ ] `POST /routines/{routine_id}/cancel` - Cancel specific date

- [ ] Create `backend/routes/activity_routes.py`
  - [ ] `POST /activities` - Create activity
  - [ ] `GET /activities?child_id={id}` - List activities
  - [ ] `PUT /activities/{activity_id}` - Update activity
  - [ ] `DELETE /activities/{activity_id}` - Delete activity
  - [ ] `GET /activities/available?child_id={id}&date={date}` - Get available

- [ ] Create `backend/routes/schedule_routes.py`
  - [ ] `GET /schedule/daily?child_id={id}&date={date}` - Get day schedule
  - [ ] `POST /schedule/ai-recommend` - AI "What should I do now?"
  - [ ] `GET /schedule/conflicts?child_id={id}&date={date}` - Detect conflicts

- [ ] Create `backend/routes/tool_routes.py`
  - [ ] `GET /tools` - List all tools
  - [ ] `GET /tools/applicable?task_id={id}` - Get applicable tools
  - [ ] `POST /tools` - Register new tool (admin)

### Cron Jobs
- [ ] Create `backend/jobs/daily_task_generator.py`
  - [ ] Schedule at 00:00 daily (APScheduler)
  - [ ] Fetch all active routines
  - [ ] Generate tasks for today using RRULE
  - [ ] Handle timezone conversion (UTC → local)

- [ ] Create `backend/jobs/task_rollover_job.py`
  - [ ] Schedule at 23:00 daily
  - [ ] Find incomplete MUST_DO tasks
  - [ ] Increment rollover_count
  - [ ] Move to backlog if rollover_count >= 3
  - [ ] Notify parent if moved to backlog

- [ ] Create `backend/jobs/__init__.py`
  - [ ] Initialize APScheduler
  - [ ] Register all cron jobs
  - [ ] Start scheduler on app startup

### Database
- [ ] Create indexes
  - [ ] `routines`: child_id + is_active
  - [ ] `activities`: child_id + activity_type
  - [ ] `time_blocks`: child_id + date
  - [ ] `tasks`: task_source + source_id

- [ ] Migration script
  - [ ] Add default values to existing tasks (task_source=ONE_TIME, scheduling_type=FLEXIBLE)

## Phase 2: AI & Logic (1.5 weeks)

### Workflows
- [ ] Create `backend/workflows/ai_schedule_agent.py`
  - [ ] `assess_child_state()` - Infer energy, focus, mood
  - [ ] `calculate_task_priority()` - Multi-factor scoring
  - [ ] `recommend_next_task()` - Context-aware recommendation
  - [ ] `detect_schedule_overload()` - Warn parent if too many tasks
  - [ ] Integrate Gemini 1.5 Flash
  - [ ] Handle API failures gracefully

### Business Logic
- [ ] Implement RRULE edge cases
  - [ ] Test leap year handling
  - [ ] Test DST transitions
  - [ ] Test end_date boundary
  - [ ] Test skip_dates exclusion

- [ ] Implement concurrent task validation
  - [ ] Check `concurrent_allowed` flag
  - [ ] Validate `concurrent_compatible_with` list
  - [ ] Return warnings to UI

- [ ] Implement rollover limits
  - [ ] Count consecutive rollovers
  - [ ] Move to backlog after 3 rollovers
  - [ ] Send notification to parent

## Phase 3: Frontend Components (2 weeks)

### API Hooks
- [ ] Update `frontend/src/api/taskApi.ts`
  - [ ] `useRolloverTask()` mutation
  - [ ] `useMoveToBacklog()` mutation
  - [ ] Update `useUpdateTask()` for new fields

- [ ] Create `frontend/src/api/routineApi.ts`
  - [ ] `useRoutines(childId)` query
  - [ ] `useCreateRoutine()` mutation
  - [ ] `useUpdateRoutine()` mutation
  - [ ] `useDeleteRoutine()` mutation
  - [ ] `useGenerateRoutineTasks()` mutation
  - [ ] `useCancelRoutineInstance()` mutation

- [ ] Create `frontend/src/api/activityApi.ts`
  - [ ] `useActivities(childId)` query
  - [ ] `useAvailableActivities(childId, date)` query
  - [ ] `useCreateActivity()` mutation
  - [ ] `useUpdateActivity()` mutation
  - [ ] `useDeleteActivity()` mutation

- [ ] Create `frontend/src/api/scheduleApi.ts`
  - [ ] `useDailySchedule(childId, date)` query
  - [ ] `useAIRecommendation(childId)` query
  - [ ] `useScheduleConflicts(childId, date)` query

- [ ] Create `frontend/src/api/toolApi.ts`
  - [ ] `useTools()` query
  - [ ] `useApplicableTools(taskId)` query

### Components - Task Display
- [ ] Update `frontend/src/components/TaskCard.tsx`
  - [ ] Show source badge (routine icon, activity icon, one-time icon)
  - [ ] Show rollover indicator (badge: "Rolled over 2x")
  - [ ] Show concurrent indicator (icon if concurrent_allowed)
  - [ ] Show scheduling type (FIXED vs FLEXIBLE badge)

- [ ] Create `frontend/src/components/RolloverBadge.tsx`
  - [ ] Display rollover count
  - [ ] Warning color if count >= 2

### Components - Routine Management
- [ ] Create `frontend/src/components/RoutineForm.tsx`
  - [ ] React Hook Form integration
  - [ ] RRULE builder UI (frequency, interval, weekdays, month days)
  - [ ] Time slot picker (fixed vs preferred)
  - [ ] Obligation level selector
  - [ ] Preview next 5 occurrences

- [ ] Create `frontend/src/components/RRuleBuilder.tsx`
  - [ ] Visual RRULE pattern builder
  - [ ] Frequency selector (daily, weekly, monthly)
  - [ ] Interval input (every N days)
  - [ ] Weekday multi-select (for weekly)
  - [ ] Month day multi-select (for monthly)
  - [ ] Human-readable preview

- [ ] Create `frontend/src/components/RoutineCard.tsx`
  - [ ] Display routine summary
  - [ ] Show recurrence pattern in human-readable form
  - [ ] Edit/Delete buttons
  - [ ] "Cancel instance" button with date picker

### Components - Activity Pool
- [ ] Create `frontend/src/components/ActivityPoolCard.tsx`
  - [ ] Display activity details
  - [ ] Show usage rules (max times/day, duration limits)
  - [ ] Show usage today (2/5 times used)
  - [ ] "Create task from activity" button

- [ ] Create `frontend/src/components/ActivityForm.tsx`
  - [ ] Activity type selector
  - [ ] Usage rule inputs (max times, duration)
  - [ ] Allowed days multi-select

### Components - Calendar
- [ ] Create `frontend/src/components/CalendarView.tsx`
  - [ ] Month view (day cells with task count)
  - [ ] Week view (7-day grid with time slots)
  - [ ] Day view (timeline with tasks)
  - [ ] View switcher (month/week/day)

- [ ] Create `frontend/src/components/TimeBlockEditor.tsx`
  - [ ] Create time block form
  - [ ] Day type selector
  - [ ] "Block time only" vs "Create fixed task" toggle
  - [ ] Time range picker

- [ ] Create `frontend/src/components/DayTypeSelector.tsx`
  - [ ] Radio buttons: School Day | Weekend | Holiday | Special Event
  - [ ] Icon for each type

### Components - Tools
- [ ] Create `frontend/src/components/ToolWidget.tsx`
  - [ ] Container for tool display
  - [ ] Support display modes (modal, sidebar, overlay, embedded)
  - [ ] Load tool by integration type (built-in, iframe, external API)

- [ ] Create `frontend/src/components/ToolsPanel.tsx`
  - [ ] List applicable tools for task
  - [ ] Tool icon + name buttons
  - [ ] Launch tool in appropriate display mode

- [ ] Create `frontend/src/components/tools/TimerTool.tsx`
  - [ ] Built-in countdown timer
  - [ ] Start/Pause/Reset buttons
  - [ ] Sound notification on completion

- [ ] Create `frontend/src/components/tools/CalculatorTool.tsx`
  - [ ] Simple calculator UI
  - [ ] Basic operations

### Components - AI Recommendation
- [ ] Create `frontend/src/components/AIRecommendationButton.tsx`
  - [ ] "What should I do now?" button
  - [ ] Loading state
  - [ ] Display recommended task
  - [ ] Explanation of recommendation

- [ ] Create `frontend/src/components/ScheduleOverloadWarning.tsx`
  - [ ] Alert if too many tasks scheduled
  - [ ] AI-generated suggestions to reduce overload

### Pages - Parent Portal
- [ ] Update `frontend/src/pages/ParentPortal/TaskManagement.tsx`
  - [ ] Add tabs: Tasks | Routines | Activities | Calendar
  - [ ] Integrate RoutineForm, ActivityForm

- [ ] Create `frontend/src/pages/ParentPortal/TaskCalendar.tsx`
  - [ ] Route: `/parent-portal/tasks/{child_id}/calendar`
  - [ ] Full calendar with edit capabilities
  - [ ] Time block creation
  - [ ] Day type management
  - [ ] Conflict warnings

### Pages - Child Portal
- [ ] Create `frontend/src/pages/ChildPortal/Schedule.tsx`
  - [ ] Route: `/child-portal/schedule`
  - [ ] Today's timeline view (read-only)
  - [ ] "What should I do now?" button prominently placed
  - [ ] Current task indicator

- [ ] Create `frontend/src/pages/ChildPortal/Calendar.tsx`
  - [ ] Route: `/child-portal/calendar`
  - [ ] Week preview (read-only)
  - [ ] Simple day view

## Phase 4: Integration & Testing (1 week)

### Backend Tests
- [ ] `backend/routes/__tests__/test_task_routes.py`
  - [ ] Test rollover endpoint
  - [ ] Test backlog endpoint
  - [ ] Test filtering by source

- [ ] `backend/routes/__tests__/test_routine_routes.py`
  - [ ] Test create routine
  - [ ] Test generate tasks from routine
  - [ ] Test cancel instance
  - [ ] Test RRULE validation

- [ ] `backend/routes/__tests__/test_activity_routes.py`
  - [ ] Test create activity
  - [ ] Test usage rule enforcement
  - [ ] Test available activities filtering

- [ ] `backend/routes/__tests__/test_schedule_routes.py`
  - [ ] Test daily schedule generation
  - [ ] Test AI recommendation
  - [ ] Test conflict detection

- [ ] `backend/services/__tests__/test_routine_service.py`
  - [ ] Test RRULE generation edge cases
  - [ ] Test leap year handling
  - [ ] Test DST transitions
  - [ ] Test skip_dates exclusion

- [ ] `backend/services/__tests__/test_task_service.py`
  - [ ] Test rollover logic
  - [ ] Test 3-rollover backlog limit
  - [ ] Test concurrent validation

- [ ] `backend/workflows/__tests__/test_ai_schedule_agent.py`
  - [ ] Test priority calculation
  - [ ] Test recommendation logic
  - [ ] Test overload detection

### Frontend Tests
- [ ] `frontend/src/components/__tests__/RoutineForm.test.tsx`
  - [ ] Test RRULE builder interaction
  - [ ] Test form validation

- [ ] `frontend/src/components/__tests__/CalendarView.test.tsx`
  - [ ] Test view switching
  - [ ] Test task display

- [ ] `frontend/src/components/__tests__/AIRecommendationButton.test.tsx`
  - [ ] Test loading state
  - [ ] Test recommendation display

- [ ] `frontend/src/api/__tests__/routineApi.test.ts`
  - [ ] Test TanStack Query hooks with MSW

### Integration Tests
- [ ] End-to-end task generation flow
  - [ ] Create routine → wait for cron → verify task created
- [ ] End-to-end rollover flow
  - [ ] Create task → don't complete → wait for rollover → verify rolled over
- [ ] End-to-end AI recommendation flow
  - [ ] Click button → receive recommendation → start task

## Phase 5: Documentation & Polish (0.5 weeks)

### Documentation
- [ ] Update `docs/api-registry.md`
  - [ ] Add all new endpoints (routines, activities, schedule, tools)

- [ ] Update `docs/component-map.md`
  - [ ] Add all new reusable components

- [ ] Update `docs/roadmap/README.md`
  - [ ] Mark Enhanced Task Management complete

- [ ] Create `docs/features/task-management/user-guide.md`
  - [ ] How to create routines
  - [ ] How to use activity pool
  - [ ] How to interpret AI recommendations

### Code Cleanup
- [ ] Remove debug logs
- [ ] Add type hints to all functions
- [ ] Format code (black, prettier)
- [ ] Remove unused imports

### Final Testing
- [ ] Manual testing of all flows
- [ ] Cross-browser testing (Chrome, Firefox, Safari)
- [ ] Mobile responsive testing
