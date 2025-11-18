# Context: Enhanced Task Management System

**Version**: 7.0
**Date**: 2025-11-16
**Status**: Phase 1 Complete - Basic Task Management UI ✅
**Replaces**: Version 6.0

## Current State

### ✅ COMPLETE - All Phases Done

**✅ Phase 1A - Base Models**:
- Task model with rich fields (subtasks, metrics, quality aspects, tools)
- TaskCollection model (groups tasks for a child)
- TaskMetadata models (TaskTypeDefinition, MetricTypeDefinition)
- Seed scripts for system task types and metrics
- Auto-create default TaskCollection on child creation

**✅ Phase 1B - Enhanced Backend**:
- Routine model (RRULE-based recurrence)
- Activity model (pool with usage rules)
- TimeBlock & DayType models (calendar management)
- Tool model (pluggable tool system)
- All services (routine, activity, schedule, tool, time_block)
- All routes (32 new endpoints)
- Cron jobs (daily generation at 00:00, rollover at 23:00)
- Database indexes for performance

**✅ Phase 2 - AI Integration**:
- Direct Gemini API integration
- AI task recommendation system
- "What should I do now?" endpoint
- Daily schedule planning
- Dynamic replanning
- 4 AI routes

**✅ Phase 3 - Frontend API Hooks**:
- AI hooks (3 files: recommendations, explanations)
- Routine hooks (2 files: queries + mutations)
- Activity hooks (2 files: queries + mutations)
- Time Block hooks (2 files: queries + mutations)
- Schedule hooks (1 file: queries)
- Tool hooks (2 files: queries + mutations)
- TypeScript types (2 files: ai.ts, enhanced-tasks.ts)

**✅ Phase 4 - Frontend UI (COMPLETED 2025-11-15)**:
- ✅ Routines management page with full CRUD modal
- ✅ Activities pool management page
- ✅ Time Blocks calendar page (week/month view)
- ✅ Full routing and navigation integration
- ✅ Full i18n support (English + Chinese)
- ✅ Mobile-responsive design

**✅ Phase 5 - Basic Task Management UI (COMPLETED 2025-11-16)**:
- ✅ Task list page with multi-level filters (date, source, status)
- ✅ Task create modal for one-off tasks
- ✅ Task lifecycle actions (Start, Pause, Resume, Complete)
- ✅ Source badges (Routine, Activity, One-off)
- ✅ Enhanced Task types with all fields (task_source, scheduling_type, priority_boost, etc.)
- ✅ Full i18n support (English + Chinese)
- ✅ Mobile-first responsive design
- ✅ Comprehensive i18n (English + Chinese)
- ✅ Mobile-responsive design
- ✅ Auto-create default task collection
- ✅ RemoveScroll for modals
- ✅ All backend TypeError fixes

**❌ NOT Yet Implemented**:
- Comprehensive testing (Phase 5 - optional)
- Schedule view page (advanced features)
- Tools management page (advanced features)

### Backend Files Created (Phase 1)

**Models**:
```
backend/models/
  routine.py          # Recurring task templates with RRULE ✅
  activity.py         # Activity pool with usage rules ✅
  time_block.py       # Calendar blocks & day types ✅
  tool.py             # Tool registry ✅
```

**Services**:
```
backend/services/
  routine_service.py      # Routine CRUD + task generation ✅
  activity_service.py     # Activity pool + usage tracking ✅
  schedule_service.py     # Schedule generation + conflicts ✅
  tool_service.py         # Tool registry + applicability ✅
  time_block_service.py   # Time blocks + day types ✅
```

**Routes** (32 endpoints):
```
backend/routes/
  routine_routes.py       # 8 endpoints ✅
  activity_routes.py      # 7 endpoints ✅
  schedule_routes.py      # 4 endpoints ✅
  tool_routes.py          # 6 endpoints ✅
  time_block_routes.py    # 7 endpoints ✅
```

**Cron Jobs**:
```
backend/jobs/
  __init__.py                 # Scheduler initialization ✅
  daily_task_generator.py     # Runs at 00:00 ✅
  task_rollover_job.py        # Runs at 23:00 ✅
```

### Frontend Files Created (Phase 4)

**Pages**:
```
frontend/src/pages/parent-portal/children/[id]/
  routines.tsx                # Routines management page ✅
  activities.tsx              # Activities pool page ✅
  time-blocks.tsx             # Time blocks calendar page ✅
  components/
    RoutineModal.tsx          # Create/edit routine modal ✅
```

**API Integration**:
```
frontend/src/api/
  queries/
    useRoutines.ts            # Routine queries ✅
    useActivities.ts          # Activity queries ✅
    useTimeBlocks.ts          # Time block queries ✅
    useSchedule.ts            # Schedule queries ✅
    useTools.ts               # Tool queries ✅
    useAIRecommendations.ts   # AI recommendation queries ✅
  mutations/
    useRoutineMutations.ts    # Routine CRUD + generate ✅
    useActivityMutations.ts   # Activity CRUD ✅
    useTimeBlockMutations.ts  # Time block CRUD ✅
    useToolMutations.ts       # Tool CRUD ✅
```

**Types**:
```
frontend/src/types/
  enhanced-tasks.ts           # All enhanced task types ✅
  ai.ts                       # AI-related types ✅
```

**i18n**:
```
frontend/src/i18n/locales/
  en/
    tasks.json                # Enhanced with routine/activity/time_block ✅
    common.json               # Enhanced with calendar controls ✅
  zh/
    tasks.json                # Full Chinese translations ✅
    common.json               # Full Chinese translations ✅
```

**Scripts**:
```
backend/scripts/
  seed_system_tools.py    # Seed built-in tools ✅
```

### AI Files Created (Phase 2)

**AI Module**:
```
backend/ai/
  gemini_client.py        # Google Gemini API wrapper ✅
  prompts.py              # Prompt templates ✅
  context_builder.py      # Context gathering from services ✅
  task_recommender.py     # Main AI recommendation engine ✅
```

**AI Routes** (4 endpoints):
```
backend/routes/
  ai_routes.py            # 4 AI endpoints ✅
    - POST /api/ai/schedule/recommend      # "What should I do now?"
    - POST /api/ai/schedule/plan-day       # Full day planning
    - POST /api/ai/schedule/replan         # Dynamic replanning
    - GET /api/ai/schedule/explanation     # Task explanations
```

### Frontend Files Created (Phase 3)

**Types**:
```
frontend/src/types/
  ai.ts                   # AI types (54 lines) ✅
    - TaskRecommendation, DailyPlan, ScheduleItem
    - Request types for all AI endpoints

  enhanced-tasks.ts       # Task management types (230 lines) ✅
    - Routine: RecurrencePattern, Frequency, Weekday
    - Activity: UsageRule, UsageDays, UsageFrequency
    - TimeBlock: DayType, TimeSlot
    - Schedule: DailySchedule, ScheduleConflict
    - Tool: ToolCreate, ToolUpdate
```

**Query Hooks**:
```
frontend/src/api/queries/
  useAIRecommendations.ts     # ❌ (mutations only)
  useTaskExplanation.ts       # AI explanation query ✅
  useRoutines.ts              # 3 routine queries ✅
  useActivities.ts            # 3 activity queries ✅
  useTimeBlocks.ts            # 3 time block queries ✅
  useSchedule.ts              # 2 schedule queries ✅
  useTools.ts                 # 2 tool queries ✅
```

**Mutation Hooks**:
```
frontend/src/api/mutations/
  useAIRecommendations.ts     # 3 AI mutations ✅
    - useRecommendNow(), usePlanDay(), useReplanSchedule()

  useRoutineMutations.ts      # 5 routine mutations ✅
    - useCreateRoutine(), useUpdateRoutine(), useDeleteRoutine()
    - useGenerateRoutineTask(), useCancelRoutine()

  useActivityMutations.ts     # 3 activity mutations ✅
    - useCreateActivity(), useUpdateActivity(), useDeleteActivity()

  useTimeBlockMutations.ts    # 3 time block mutations ✅
    - useCreateTimeBlock(), useUpdateTimeBlock(), useDeleteTimeBlock()

  useToolMutations.ts         # 3 tool mutations ✅
    - useCreateTool(), useUpdateTool(), useDeleteTool()
```

## Available Resources

### Reusable Components
From authentication/device features:
- UI primitives: Button, Input, Card, Modal, Badge
- Form patterns: React Hook Form with validation
- Loading/Error states: Skeleton, ErrorMessage components
- Authentication middleware: `get_current_user()` dependency

### Existing APIs (Reference Patterns)
- `POST /api/auth/register` - Complex create operation
- `GET /api/devices` - List with filters
- `PUT /api/devices/{id}` - Update with validation
- All use FastAPI with Pydantic models

### Shared Types (From Phase 1A)
```python
# Already defined in backend/models/task.py
class TaskStatus(str, Enum):
    DRAFT, SCHEDULED, IN_PROGRESS, PAUSED, COMPLETED, CANCELLED, ARCHIVED

class QuantifiableMetric(BaseModel):
    metric_type_code: str
    target_value: float
    actual_value: Optional[float]

class Subtask(BaseModel):
    title: str
    completed: bool
    completed_at: Optional[datetime]
    order: int

class ToolUsage(BaseModel):
    tool_code: str
    enabled: bool
    config: Optional[dict]
```

### External Dependencies
```python
# requirements.txt (need to add)
python-dateutil>=2.8.2  # RRULE recurrence support
apscheduler>=3.10.4     # Cron jobs

# Already have
fastapi>=0.104.1
motor>=3.3.2           # MongoDB async
google-generativeai>=0.3.0  # AI recommendations
```

### Test Infrastructure
- Backend: `pytest`, `pytest-asyncio`, `httpx.AsyncClient`
- Frontend: Vitest, MSW, React Testing Library
- Fixtures: `backend/routes/__tests__/conftest.py`
- Virtual env: `backend/.venv`

## Related Features

### Dependencies
1. **Authentication** ✅ Complete - Required for parent/child access
2. **Child Profile** ⚠️ Partial - Model exists, needs testing
3. **Device Management** ✅ Complete - For trusted device workflows

### Will Enable
1. **Points System** (Stage 1) - Uses `Task.points_earned`
2. **Writing Tool** (Stage 1) - Specific task type with AI eval
3. **AI Planning** (Stage 2) - Uses routine + activity data
4. **Rewards** (Stage 3) - Requires points from completed tasks

## Key Design Decisions

### 1. RRULE for Recurrence
**Decision**: Use `python-dateutil.rrule` (iCalendar RFC 5545 standard)
**Rationale**: Industry standard, handles edge cases, easy migration
```python
# Store as: "FREQ=WEEKLY;BYDAY=MO,WE,FR"
# Calculate with: rrule.after(date), rrule.between(start, end)
```

### 2. AI Agent > Priority System
**Decision**: AI-driven "What should I do now?" with parent constraints
**Rationale**: Core value is real-time guidance, not just scheduling
- Parents set priorities, deadlines, preferences
- AI considers child state (energy, focus, mood)
- Adapts to context ("I'm tired", "I'm stuck")

### 3. Pluggable Tool System
**Decision**: Build tool registry from Day 1
**Rationale**: Tools are core to task experience, enables extensibility
- Built-in: Timer, Calculator, Dictionary, AI assistants
- Pluggable: Can add custom tools later
- Task-specific vs global tools

### 4. Three Core Concepts
**Decision**: Task (instance) + Routine (template) + Activity (pool)
**Rationale**: Clear separation of one-time, recurring, and flexible work
```python
class TaskSource(str, Enum):
    ONE_TIME = "ONE_TIME"      # Parent created directly
    ROUTINE = "ROUTINE"        # Auto-generated from recurring pattern
    ACTIVITY = "ACTIVITY"      # Converted from activity pool
```

### 5. Concurrent Tasks Support
**Decision**: Add `concurrent_allowed` flag for multi-tasking
**Rationale**: Real-world scenario - audiobook while cleaning
```python
task.concurrent_allowed = True
task.concurrent_compatible_with = ["chore", "passive_learning"]
```

### 6. Special Events as Tasks or Blocks
**Decision**: Parent chooses block-only vs trackable task
**Rationale**: Flexibility - hiking can be just unavailable time OR task with subtasks/media
```python
time_block.as_fixed_task = True  # Create FIXED_TIME task
task.fixed_time_slot = TimeSlot(start="14:00", end="17:00")
```

## Technical Context

### MongoDB Indexes (Need to Add)
```python
# task collection
db.tasks.create_index([("child_id", 1), ("scheduled_date", -1)])
db.tasks.create_index([("child_id", 1), ("status", 1)])
db.tasks.create_index([("source_id", 1)])

# routines collection
db.routines.create_index([("child_id", 1), ("is_active", 1)])

# activities collection
db.activities.create_index([("child_id", 1), ("is_active", 1)])
```

### Cron Job Setup (APScheduler)
```python
# backend/main.py
from apscheduler.schedulers.asyncio import AsyncIOScheduler

scheduler = AsyncIOScheduler()
scheduler.add_job(generate_daily_tasks, 'cron', hour=0, minute=0)
scheduler.add_job(rollover_incomplete_tasks, 'cron', hour=23, minute=0)
scheduler.start()
```

### AI Integration
```python
# Use Gemini 1.5 Flash for "What should I do now?"
# Prompt includes: child state, task list, available time
# Returns: recommended task ID + reasoning
```

## Known Issues/Limitations

### From Phase 1A
- ❌ No concurrent task prevention implemented
- ❌ No rollover logic
- ❌ No cron jobs
- ❌ No AI recommendations
- ❌ Tools defined in model but not usable

### Considerations
- **Large datasets**: Paginate task lists (>100 tasks)
- **Timezone handling**: Store UTC, display local
- **Cache invalidation**: Invalidate tasks on routine/activity changes
- **RRULE edge cases**: Leap years, DST transitions (library handles it)

## Scenarios Verified ✅

### Scenario 1: Special Event + Routine Work
**Use Case**: Hiking (special event) but want to skip rope during break
```python
# Event as task with subtasks
hiking_task = Task(
    title="Family Hiking",
    scheduling_type=SchedulingType.FIXED_TIME,
    fixed_time_slot=TimeSlot(start="14:00", end="17:00"),
    subtasks=[]  # Child can add "Skip rope 10 min" as subtask
)

# OR: Retroactively mark routine as complete
routine_task = get_task(routine_id="skip_rope", date=today)
complete_task(routine_task.id, tracked=False)  # Retroactive completion
```
**Supported**: ✅ Via subtasks OR retroactive completion

### Scenario 2: Two Tasks Simultaneously
**Use Case**: Listen to audiobook WHILE tidying room
```python
# Both tasks as IN_PROGRESS
audiobook_task.concurrent_allowed = True
audiobook_task.concurrent_compatible_with = ["chore"]
tidy_task.concurrent_allowed = True

# OR: Create combo task
combo_task = Task(
    title="Tidy room + audiobook",
    subtasks=[
        Subtask(title="Tidy room"),
        Subtask(title="Listen to Chapter 3")
    ]
)
```
**Supported**: ✅ With `concurrent_allowed` flag

## References

### External Documentation
- [iCalendar RFC 5545](https://tools.ietf.org/html/rfc5545) - RRULE standard
- [python-dateutil](https://dateutil.readthedocs.io/) - RRULE implementation
- [Google Gemini API](https://ai.google.dev/docs) - AI agent
- [APScheduler](https://apscheduler.readthedocs.io/) - Cron jobs

### Internal Documentation
- [business-logic-design-v2.md](./business-logic-design-v2.md) - Complete system design
- [design-refinements.md](./design-refinements.md) - RRULE, priority, tools
- [testing.md](./testing.md) - Test plan
- [plan.md](./plan.md) - Implementation plan
- [tasks.md](./tasks.md) - Task tracker

### Related Features
- [Authentication](../authentication/) - Parent/child accounts
- [Child Profile](../child-profile/) - Child management
- [Device Management](../device-management/) - Trusted devices

## Migration from Phase 1A

### Task Model Updates (Backward Compatible)
Add new fields with defaults - no breaking changes:
```python
# New fields to add
task_source: TaskSource = TaskSource.ONE_TIME
source_id: Optional[ObjectId] = None
source_metadata: Optional[TaskSourceMetadata] = None
scheduling_type: SchedulingType = SchedulingType.FLEXIBLE
scheduled_date: date  # NOW REQUIRED
fixed_time_slot: Optional[TimeSlot] = None
original_date: Optional[date] = None
rollover_count: int = 0
is_in_backlog: bool = False
is_delayed: bool = False
concurrent_allowed: bool = False
concurrent_compatible_with: List[str] = []
preferred_time_slot: Optional[TimeSlot] = None
priority_boost: int = 0
completion_type: Optional[CompletionType] = None
completed_by: Optional[CompletedBy] = None
```

---

**Status**: Ready for plan.md and tasks.md creation
**Next**: Create implementation plan and task breakdown
