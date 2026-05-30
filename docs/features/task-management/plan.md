# Enhanced Task Management - Implementation Plan

## Goal
Implement comprehensive task management system with routines, activities, AI-driven recommendations, tool plugins, and calendar views for both parent and child portals.

## Requirements
- [ ] RRULE-based recurrence patterns (python-dateutil)
- [ ] Three core concepts: Task, Routine, Activity
- [ ] AI Schedule Agent for "What should I do now?" recommendations
- [ ] Pluggable tool system (timer, calculator, AI assistant, etc.)
- [ ] Daily task generation from routines
- [ ] Rollover system with 3-rollover backlog limit
- [ ] TimeBlock and DayType management
- [ ] Concurrent task support
- [ ] Flexible and retroactive completion tracking
- [ ] Calendar views (parent: full management, child: read-only)
- [ ] Special event support with subtasks
- [ ] Activity pool with usage rules

## Technical Approach

### Backend
**Models** (backend/models/):
- Update `task.py` - Add task_source, scheduling_type, rollover fields, concurrent fields
- Create `routine.py` - Recurring task templates with RRULE patterns
- Create `activity.py` - Optional activity pool with usage rules
- Create `time_block.py` - Calendar time blocks and day types
- Create `tool.py` - Tool registry and configuration

**Services** (backend/services/):
- Update `task_service.py` - Add rollover logic, concurrent validation
- Create `routine_service.py` - RRULE generation, instance creation
- Create `activity_service.py` - Usage tracking, rule enforcement
- Create `schedule_service.py` - Daily generation, time conflict detection
- Create `tool_service.py` - Tool registry, availability checks

**Workflows** (backend/workflows/):
- Create `ai_schedule_agent.py` - Context-aware recommendations using Gemini 1.5 Flash
- Assess child state (energy, focus, mood)
- Multi-factor priority calculation
- Real-time adaptation

**Routes** (backend/routes/):
- Update `task_routes.py` - Add rollover, concurrent endpoints
- Create `routine_routes.py` - CRUD + generate instances
- Create `activity_routes.py` - CRUD + usage tracking
- Create `schedule_routes.py` - Daily schedule, AI recommendations
- Create `tool_routes.py` - Tool registry, applicability checks

**Cron Jobs** (backend/jobs/):
- Create `daily_task_generator.py` - Runs at 00:00, generates tasks from routines
- Create `task_rollover_job.py` - Runs at 23:00, rolls over incomplete must-do tasks
- Uses APScheduler

### Frontend
**API Hooks** (frontend/src/api/):
- Update `taskApi.ts` - Add rollover, concurrent endpoints
- Create `routineApi.ts` - TanStack Query hooks
- Create `activityApi.ts` - TanStack Query hooks
- Create `scheduleApi.ts` - AI recommendation hooks
- Create `toolApi.ts` - Tool availability hooks

**Components** (frontend/src/components/):
- Update `TaskCard.tsx` - Show source badges, concurrent indicators
- Create `RoutineForm.tsx` - RRULE builder UI
- Create `ActivityPoolCard.tsx` - Usage rules display
- Create `CalendarView.tsx` - Month/week/day views
- Create `TimeBlockEditor.tsx` - Day type management
- Create `ToolWidget.tsx` - Pluggable tool container
- Create `AIRecommendationButton.tsx` - "What should I do now?" button

**Pages**:
- Parent Portal: `/parent-portal/tasks/{child_id}/calendar`
- Child Portal: `/child-portal/schedule`, `/child-portal/calendar`

### Database
**New Collections**:
- `routines` - Recurring task templates
- `activities` - Activity pool items
- `time_blocks` - Calendar blocks and day types
- `tools` - Tool registry
- `activity_usage` - Usage tracking for daily limits

**Indexes**:
- `routines`: child_id + is_active
- `activities`: child_id + activity_type
- `time_blocks`: child_id + date
- Tasks: Add index on task_source + source_id

## Architecture Decisions

1. **RRULE Standard**: Use python-dateutil.rrule for industry-standard recurrence
2. **AI-Driven Scheduling**: AI Agent > Priority System for real-time guidance
3. **Three Core Concepts**: Task (instance) + Routine (template) + Activity (pool)
4. **Tool System**: Pluggable architecture from Day 1
5. **Concurrent Tasks**: Supported with `concurrent_allowed` flag
6. **Calendar Placement**: Both parent (edit) and child (read-only) portals

## Dependencies

**Backend**:
- `python-dateutil>=2.8.2` - RRULE recurrence
- `apscheduler>=3.10.0` - Cron jobs
- Existing: motor, fastapi, langchain-google-genai

**Frontend**:
- Existing: @tanstack/react-query, react-hook-form, @tabler/icons-react

## Testing Strategy

**Backend**:
- Unit tests for all services (pytest, pytest-asyncio)
- Route tests with authenticated_client fixture
- RRULE generation edge cases (leap years, DST)
- Rollover logic tests (3-rollover limit)
- Concurrent task validation tests

**Frontend**:
- Component tests (Vitest, React Testing Library)
- API hook tests with MSW mocking
- Calendar interaction tests
- Tool widget rendering tests

**Integration**:
- End-to-end task generation flow
- AI recommendation flow
- Tool integration flow

## Timeline Estimate

**Phase 1: Backend Foundation** (2 weeks)
- Models: Routine, Activity, TimeBlock, Tool
- Services: Routine, Activity, Schedule, Tool
- Routes: Basic CRUD
- Cron jobs: Daily generation, rollover

**Phase 2: AI & Logic** (1.5 weeks)
- AI Schedule Agent workflow
- Multi-factor priority calculation
- RRULE edge case handling
- Concurrent task validation

**Phase 3: Frontend Components** (2 weeks)
- Calendar views (month/week/day)
- Routine/Activity forms with RRULE builder
- Tool widgets
- AI recommendation button

**Phase 4: Integration & Testing** (1 week)
- Backend integration tests
- Frontend component tests
- E2E flows
- Bug fixes

**Phase 5: Documentation & Polish** (0.5 weeks)
- API documentation
- User guides
- Code cleanup

**Total: 7 weeks**

## Migration from Phase 1A

Backward compatible additions to existing `Task` model:
- Add optional fields: task_source, scheduling_type, rollover fields
- Default values: task_source=ONE_TIME, scheduling_type=FLEXIBLE
- Existing tasks continue working without changes
