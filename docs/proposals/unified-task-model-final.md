# Unified Task Model - FINAL DESIGN

**Date**: 2025-11-17
**Status**: APPROVED FOR IMPLEMENTATION
**Version**: 3.0 (Final)

## Core Philosophy

**ONE Task Model** handles everything:
- Fixed time blocks (school, lessons)
- Must-do with windows (homework)
- Must-do with deadlines (bedtime)
- Flexible tasks (chores)
- Optional activities (games, crafts)
- One-off or recurring
- Day-type aware (school days vs holidays)

## Complete Data Model

```python
class Task(BaseModel):
    """Unified task model - handles ALL scenarios."""

    # ========== CORE ==========
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    collection_id: PyObjectId
    child_id: PyObjectId
    parent_id: PyObjectId

    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None
    task_type_code: str  # "homework", "chore", "exercise", etc.

    # ========== OBLIGATION & PRIORITY ==========
    obligation_level: ObligationLevel  # MUST_DO, SHOULD_DO, OPTIONAL
    priority_boost: int = Field(default=0, ge=-5, le=5)  # Fine-tuning

    # ========== SCHEDULING TYPE ==========
    scheduling_type: SchedulingType
    # Options:
    # - FIXED_TIME: Exact time, can't move (school 8:00-15:00)
    # - TIME_WINDOW: Suggested window (homework 15:30-17:30)
    # - DEADLINE: Must finish before (bedtime by 20:00)
    # - FLEXIBLE: Anytime today (clean room)
    # - POOL: No schedule, AI suggests (activities)

    # ========== TIME ATTRIBUTES ==========
    # For FIXED_TIME
    fixed_time_slot: Optional[TimeSlot] = None  # {start: "08:00", end: "15:00"}

    # For TIME_WINDOW
    preferred_time_window: Optional[TimeWindow] = None
    # {start: "15:30", end: "17:30", priority_in_window: 8}

    # For DEADLINE
    deadline: Optional[datetime] = None
    deadline_type: Optional[DeadlineType] = None  # HARD or SOFT

    # For all (except POOL)
    scheduled_date: Optional[datetime] = None
    estimated_duration_minutes: Optional[int] = None

    # ========== RECURRENCE (RRULE-based) ==========
    is_recurring: bool = False
    recurrence: Optional[RecurrencePattern] = None
    # Supports:
    # - Standard RRULE (FREQ, INTERVAL, BYDAY, UNTIL)
    # - Day-type filtering (school_day, weekend, holiday)
    # - Day-type specific overrides (different bedtime on weekends)

    # ========== BLOCKING & INTERRUPTION ==========
    blocks_other_tasks: bool = False  # True = time block (school, lessons)
    can_be_interrupted: bool = True   # False = critical, can't pause
    can_be_split: bool = False        # True = can do in multiple sessions
    min_session_duration: Optional[int] = None  # Minimum chunk (15min)

    # ========== POOL / ACTIVITY RULES ==========
    is_in_pool: bool = False
    pool_usage_rules: Optional[PoolUsageRules] = None
    # {
    #   max_times_per_day: 2,
    #   max_duration_per_day_minutes: 60,
    #   cooldown_minutes: 60,
    #   requires_completion_of: ["homework_id"]
    # }

    # ========== SOURCE TRACKING ==========
    task_source: TaskSource  # ONE_TIME, RECURRING_INSTANCE, POOL
    source_recurring_task_id: Optional[PyObjectId] = None  # Link to parent

    # ========== TOOLS & RESOURCES ==========
    tools: List[ToolUsage] = []
    # Parent can add when creating (simple list)
    # Full tool management in edit page

    # ========== TASK DETAILS ==========
    metrics: List[QuantifiableMetric] = []
    quality_aspects: List[QualityAspect] = []
    subtasks: List[Subtask] = []

    # ========== LIFECYCLE ==========
    status: TaskStatus = TaskStatus.DRAFT
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    # ... other existing fields ...


class SchedulingType(str, Enum):
    """How the task is scheduled."""
    FIXED_TIME = "fixed_time"       # School, piano - exact time, can't move
    TIME_WINDOW = "time_window"     # Homework - suggested window
    DEADLINE = "deadline"           # Bedtime, medicine - before time
    FLEXIBLE = "flexible"           # Clean room - anytime today
    POOL = "pool"                   # Activities - AI suggests when


class TimeWindow(BaseModel):
    """Suggested time window for task completion."""
    start: str  # "15:30"
    end: str    # "17:30"
    priority_in_window: int = Field(default=5, ge=0, le=10)
    # Higher = stronger recommendation during window


class DeadlineType(str, Enum):
    """Deadline strictness."""
    HARD = "hard"  # Must complete, no exceptions (medicine)
    SOFT = "soft"  # Should complete, minor flexibility okay (bedtime)


class PoolUsageRules(BaseModel):
    """Rules for pool/activity tasks."""
    max_times_per_day: Optional[int] = None
    max_duration_per_day_minutes: Optional[int] = None
    max_duration_per_session_minutes: Optional[int] = None
    cooldown_minutes: Optional[int] = None
    allowed_day_types: Optional[List[str]] = None  # ["weekend", "holiday"]
    requires_completion_of: Optional[List[str]] = None  # Task IDs must complete first


class RecurrencePattern(BaseModel):
    """RRULE-based recurrence with day-type support."""
    # Standard RRULE fields
    frequency: Frequency  # DAILY, WEEKLY, MONTHLY, YEARLY
    interval: int = 1
    by_weekday: Optional[List[Weekday]] = None  # [MO, WE, FR]
    by_month_day: Optional[List[int]] = None
    by_set_pos: Optional[List[int]] = None
    start_date: date
    end_date: Optional[date] = None

    # Day-type filtering
    apply_on_day_types: Optional[List[str]] = None  # Only generate on these types
    skip_on_day_types: Optional[List[str]] = None   # Don't generate on these types

    # Day-type specific overrides
    day_type_overrides: Optional[Dict[str, DayTypeOverride]] = None
    # Example: {
    #   "school_day": {"deadline": "20:00"},
    #   "weekend": {"deadline": "22:00"}
    # }

    skip_dates: List[date] = []  # Specific dates to skip


class DayTypeOverride(BaseModel):
    """Override task attributes for specific day types."""
    deadline: Optional[str] = None  # "20:00"
    time_window: Optional[TimeWindow] = None
    fixed_time_slot: Optional[TimeSlot] = None
    is_required: Optional[bool] = None
    estimated_duration_minutes: Optional[int] = None
```

## New Feature: Day Type Calendar

### DayTypeCalendar Model
```python
class DayTypeCalendar(BaseModel):
    """Calendar defining day types for a child."""
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    child_id: PyObjectId
    parent_id: PyObjectId

    # Default patterns
    default_school_days: List[Weekday] = [MO, TU, WE, TH, FR]
    default_weekend_days: List[Weekday] = [SA, SU]

    # Specific date overrides
    special_dates: Dict[str, DayType] = {}
    # {
    #   "2025-11-27": "holiday",      # Thanksgiving
    #   "2025-12-25": "holiday",      # Christmas
    #   "2025-11-15": "sick_day",     # Child was sick
    # }

    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class DayType(str, Enum):
    """Types of days."""
    SCHOOL_DAY = "school_day"
    WEEKEND = "weekend"
    HOLIDAY = "holiday"
    SICK_DAY = "sick_day"
    SPECIAL_EVENT = "special_event"
```

### Day Type Resolver
```python
def get_day_type(child_id: str, date: date) -> DayType:
    """Determine what type of day it is."""
    calendar = get_calendar(child_id)

    # 1. Check specific date overrides first
    date_str = date.isoformat()
    if date_str in calendar.special_dates:
        return calendar.special_dates[date_str]

    # 2. Check default patterns
    weekday = date.weekday()  # 0=Monday, 6=Sunday
    weekday_name = [MO, TU, WE, TH, FR, SA, SU][weekday]

    if weekday_name in calendar.default_school_days:
        return DayType.SCHOOL_DAY
    if weekday_name in calendar.default_weekend_days:
        return DayType.WEEKEND

    return DayType.SCHOOL_DAY  # Default
```

## Task Generation Logic

```python
def should_generate_task(task: Task, target_date: date) -> bool:
    """Check if task should be generated for this date."""
    if not task.is_recurring:
        return task.scheduled_date.date() == target_date

    recurrence = task.recurrence

    # 1. Check if date in RRULE range
    if target_date < recurrence.start_date:
        return False
    if recurrence.end_date and target_date > recurrence.end_date:
        return False

    # 2. Check skip dates
    if target_date in recurrence.skip_dates:
        return False

    # 3. Get day type for this date
    day_type = get_day_type(task.child_id, target_date)

    # 4. Check day type filters
    if recurrence.skip_on_day_types:
        if day_type in recurrence.skip_on_day_types:
            return False  # Skip this day type

    if recurrence.apply_on_day_types:
        if day_type not in recurrence.apply_on_day_types:
            return False  # Only apply on specific day types

    # 5. Check RRULE frequency/weekday
    if not matches_rrule(task, target_date):
        return False

    return True


def generate_task_instance(recurring_task: Task, target_date: date) -> Task:
    """Generate a task instance from recurring template."""
    day_type = get_day_type(recurring_task.child_id, target_date)

    # Start with copy of recurring task
    instance = recurring_task.copy()
    instance.id = PyObjectId()  # New ID
    instance.is_recurring = False
    instance.task_source = TaskSource.RECURRING_INSTANCE
    instance.source_recurring_task_id = recurring_task.id
    instance.scheduled_date = target_date
    instance.status = TaskStatus.SCHEDULED

    # Apply day-type overrides
    if recurring_task.recurrence.day_type_overrides:
        override = recurring_task.recurrence.day_type_overrides.get(day_type)
        if override:
            if override.deadline:
                instance.deadline = datetime.combine(target_date, time.fromisoformat(override.deadline))
            if override.time_window:
                instance.preferred_time_window = override.time_window
            if override.fixed_time_slot:
                instance.fixed_time_slot = override.fixed_time_slot
            # ... apply other overrides ...

    return instance
```

## Example: Bedtime with Day-Type Rules

```python
bedtime_task = Task(
    title="Go to Bed",
    task_type_code="sleep",
    scheduling_type=SchedulingType.DEADLINE,
    deadline_type=DeadlineType.SOFT,
    obligation_level=ObligationLevel.MUST_DO,
    estimated_duration_minutes=30,
    is_recurring=True,
    recurrence=RecurrencePattern(
        frequency=Frequency.DAILY,
        interval=1,
        start_date=date(2025, 11, 1),
        day_type_overrides={
            "school_day": DayTypeOverride(deadline="20:00"),
            "weekend": DayTypeOverride(deadline="22:00"),
            "holiday": DayTypeOverride(deadline="22:00"),
            "sick_day": DayTypeOverride(deadline="21:00"),
        }
    )
)

# On Monday Nov 18 (school_day):
# → Instance with deadline = 2025-11-18 20:00:00

# On Saturday Nov 23 (weekend):
# → Instance with deadline = 2025-11-23 22:00:00

# On Thursday Nov 27 (holiday - Thanksgiving):
# → Instance with deadline = 2025-11-27 22:00:00
```

## Task Type Definitions

### System Task Types
```python
SYSTEM_TASK_TYPES = [
    TaskTypeDefinition(
        code="homework",
        display_name="Homework",
        category="academic",
        concurrent_allowed=False,  # Can't do homework + games
        suggested_tools=["pencil", "notebook", "computer"],
    ),
    TaskTypeDefinition(
        code="chore",
        display_name="Chore",
        category="household",
        concurrent_allowed=True,  # Can do chores + music
        suggested_tools=["cleaning_supplies"],
    ),
    TaskTypeDefinition(
        code="exercise",
        display_name="Exercise",
        category="physical",
        concurrent_allowed=False,
        break_after=True,  # Suggest rest after
    ),
    TaskTypeDefinition(
        code="creative",
        display_name="Creative Activity",
        category="enrichment",
        concurrent_allowed=True,
        suggested_tools=["art_supplies", "building_blocks"],
    ),
    TaskTypeDefinition(
        code="reading",
        display_name="Reading",
        category="academic",
        concurrent_allowed=True,  # Can read + music
    ),
    TaskTypeDefinition(
        code="screen_time",
        display_name="Screen Time",
        category="recreation",
        concurrent_allowed=False,
        suggested_pool_rules=PoolUsageRules(
            max_times_per_day=2,
            max_duration_per_day_minutes=60
        )
    ),
    # ... more types ...
]
```

### Parent Can Create Custom Types
```python
custom_type = TaskTypeDefinition(
    code="math_practice",
    display_name="Math Practice",
    category="academic",
    parent_id=parent.id,
    is_system=False,
)
```

## UI Mockups

### 1. Create Task Modal (Full)

```
┌─────────────────────────────────────────────────────┐
│ Create Task                                    [×]  │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Title: [Finish Math Homework___________________]   │
│ Description: [Complete pages 25-30_____________]   │
│                                                     │
│ Type: [Homework ▼] (+Add custom type)              │
│                                                     │
│ ┌─────────────────────────────────────────────┐   │
│ │ 📌 IMPORTANCE                                │   │
│ │ ● Must do   ○ Should do   ○ Optional        │   │
│ │ Priority: [··|·······] (+2)                 │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ ┌─────────────────────────────────────────────┐   │
│ │ ⏰ WHEN TO DO                                │   │
│ │                                               │   │
│ │ Schedule:                                     │   │
│ │ ○ Exact time (can't be moved)                │   │
│ │   From [__:__] to [__:__]                    │   │
│ │   ☐ This blocks other tasks                  │   │
│ │                                               │   │
│ │ ● Suggested time window                      │   │
│ │   From [15:30] to [17:30]                    │   │
│ │   Duration: [30] minutes                     │   │
│ │   Priority in window: [●●●●●●●●○○]  (High)  │   │
│ │                                               │   │
│ │ ○ Must finish by (deadline)                  │   │
│ │   By [__:__] Type: ○ Hard ○ Soft            │   │
│ │                                               │   │
│ │ ○ Flexible - anytime today                   │   │
│ │   Duration: [___] minutes                    │   │
│ │                                               │   │
│ │ ○ Add to activity pool                       │   │
│ │   → Activity Settings                        │   │
│ │                                               │   │
│ │ Date: [Monday, Nov 18, 2025 ▼]              │   │
│ │                                               │   │
│ │ ☑ Repeat this task                           │   │
│ │   [Weekly ▼] Every [1] week(s)              │   │
│ │   On: ☑Mon ☑Tue ☑Wed ☑Thu ☑Fri □Sat □Sun   │   │
│ │   Ends: ● Never  ○ On [________]            │   │
│ │                                               │   │
│ │   ☐ Different settings for weekends/holidays │   │
│ │     [Configure ▼]                            │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ ☐ Advanced options ▼                               │
│   ☑ Can be split into multiple sessions            │
│     Minimum session: [15] minutes                  │
│   ☐ Cannot be interrupted                          │
│   Tools needed:                                    │
│   ☑ Pencil  ☑ Notebook  ☐ Calculator              │
│   (+Add tool)                                      │
│                                                     │
│ [Cancel]                         [Create Task]     │
└─────────────────────────────────────────────────────┘
```

### 2. Day Type Calendar (Parent Portal)

```
┌─────────────────────────────────────────────────────┐
│ Tommy's Calendar - Day Types              [+Event] │
├─────────────────────────────────────────────────────┤
│                                                     │
│           November 2025                             │
│   Mo  Tu  We  Th  Fr  Sa  Su                        │
│                        1   2   3                    │
│   📚 📚 📚 📚 📚  🏠  🏠   (Normal week)             │
│                                                     │
│    4   5   6   7   8   9  10                        │
│   📚 📚 📚 📚 📚  🏠  🏠                             │
│                                                     │
│   11  12  13  14  15  16  17                        │
│   📚 📚 📚 📚 📚  🏠  🏠                             │
│                                                     │
│   18 [19] 20  21  22  23  24                        │
│   📚 📚 📚 📚 📚  🏠  🏠   ← Selected: Tuesday       │
│                                                     │
│   25  26  27  28  29  30                            │
│   📚 📚 🎉  📚 📚  🏠                               │
│         Holiday                                     │
│                                                     │
│ Legend:                                             │
│ 📚 School Day  🏠 Weekend  🎉 Holiday               │
│ 🤒 Sick Day    🎪 Special Event                     │
│                                                     │
├─────────────────────────────────────────────────────┤
│ November 19, 2025 - Tuesday                         │
│ Day Type: ● School Day  ○ Weekend  ○ Holiday        │
│           ○ Sick Day     ○ Special Event            │
│                                                     │
│ Notes: [____________________________________]       │
│                                                     │
│ [Cancel]                                   [Save]   │
└─────────────────────────────────────────────────────┘
```

### 3. Daily Task View (Parent Portal)

```
┌─────────────────────────────────────────────────────┐
│ Tommy's Tasks - Monday, Nov 18                      │
│ ◀ Nov 17              [📅 Calendar]        Nov 19 ▶ │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Timeline View:                                      │
│ ┌───────────────────────────────────────────────┐ │
│ │ 08:00 ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ Go to School  │ │
│ │       [Blocking - Can't schedule other tasks] │ │
│ │ 15:00                                          │ │
│ │ 15:30 ░░░░░░░░░░░ Homework (Suggested)        │ │
│ │ 16:00 [High Priority Window]                  │ │
│ │ 16:00 ▓▓▓▓▓▓▓▓▓▓▓ Piano Lesson                │ │
│ │ 17:00 [Blocking]                              │ │
│ │ 17:00                                          │ │
│ │ 18:00 □ Dinner (Flexible - 30min)             │ │
│ │ 19:00 □ Clean Room (Flexible - 20min)         │ │
│ │ 20:00 ⏰ Bedtime (Deadline - Soft)            │ │
│ └───────────────────────────────────────────────┘ │
│                                                     │
│ Task List:                                          │
│ ┌───────────────────────────────────────────────┐ │
│ │ ✅ Go to School (08:00-15:00) [Completed]     │ │
│ │ 📚 Homework (15:30-16:00) [In Progress]       │ │
│ │    Started 15:35, 15min remaining              │ │
│ │ 🎹 Piano Lesson (16:00-17:00) [Upcoming]      │ │
│ │ 🍽️ Dinner (Flexible) [Pending]                │ │
│ │ 🧹 Clean Room (Flexible) [Pending]            │ │
│ │ 😴 Bedtime (by 20:00) [Pending]               │ │
│ └───────────────────────────────────────────────┘ │
│                                                     │
│ Summary: 6 tasks, 1 done, 1 in progress, 4 pending │
│ Estimated remaining time: 1h 20min                  │
│                                                     │
│ [+ Add Task for Today]                              │
└─────────────────────────────────────────────────────┘
```

### 4. Calendar Week View (Child Portal - Simplified)

```
┌─────────────────────────────────────────────────────┐
│ 🗓️ My Week                                          │
│ Nov 18 - Nov 24, 2025                               │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Mon  Tue  Wed  Thu  Fri  Sat  Sun                  │
│  [18] 19   20   21   22   23   24                   │
│                                                     │
│  ●●●  ●●○  ●●●  ●●○  ●●●  ○○   ○○                  │
│  3/3  2/3  3/3  2/3  3/3  0/0  0/0                  │
│                                                     │
│ ● = Done  ○ = To do                                 │
│                                                     │
│ ┌─────────────────────────────────────────────┐   │
│ │ Today - Monday                               │   │
│ │ ✅ School (Done!)                            │   │
│ │ 📚 Homework (Doing now...)                   │   │
│ │ 🎹 Piano Lesson (Soon - 4:00 PM)            │   │
│ │                                               │   │
│ │ [View All Tasks]                             │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ Quick Jump: [◀ Today ▶] [This Week] [Next Week]    │
└─────────────────────────────────────────────────────┘
```

## Implementation Plan

### Week 1: Backend Foundation
1. ✅ Add new fields to Task model
2. ✅ Create DayTypeCalendar model
3. ✅ Implement get_day_type() resolver
4. ✅ Update task generation logic
5. ✅ Update TaskCreate/TaskUpdate to accept new fields
6. ✅ Fix task_service.py to save all fields

### Week 2: API Endpoints
1. Day Type Calendar CRUD
2. Get tasks for date (with day-type resolution)
3. Get calendar view (week/month of tasks)
4. Batch generate tasks for date range

### Week 3: Frontend - Unified Task Modal
1. Create new TaskModal with all options
2. Conditional rendering based on scheduling_type
3. Day-type override configuration UI
4. Tool selection UI

### Week 4: Frontend - Calendar Views
1. Day Type Calendar (parent only)
2. Daily task view timeline
3. Week/month calendar view
4. Child portal simplified calendar

### Week 5: Migration & Testing
1. Migrate existing tasks/routines/activities
2. End-to-end testing
3. User acceptance testing
4. Performance optimization

## Migration Script

```python
async def migrate_to_unified_model():
    """Migrate existing routines/activities/timeblocks to unified task model."""

    # 1. Migrate Routines → Tasks with is_recurring=True
    routines = await db.routines.find().to_list(length=None)
    for routine in routines:
        task = Task(
            # ... copy all fields ...
            is_recurring=True,
            recurrence=routine.recurrence,
            task_source=TaskSource.ONE_TIME,  # Original template
            # Convert scheduling_type based on routine fields
        )
        await db.tasks.insert_one(task.model_dump(by_alias=True))

    # 2. Migrate Activities → Tasks with is_in_pool=True
    activities = await db.activities.find().to_list(length=None)
    for activity in activities:
        task = Task(
            # ... copy fields ...
            scheduling_type=SchedulingType.POOL,
            is_in_pool=True,
            pool_usage_rules=PoolUsageRules(
                # ... convert activity usage rules ...
            )
        )
        await db.tasks.insert_one(task.model_dump(by_alias=True))

    # 3. Migrate TimeBlocks → Tasks with blocks_other_tasks=True
    timeblocks = await db.time_blocks.find().to_list(length=None)
    for block in timeblocks:
        task = Task(
            # ... copy fields ...
            scheduling_type=SchedulingType.FIXED_TIME,
            fixed_time_slot=block.time_slot,
            blocks_other_tasks=True,
        )
        await db.tasks.insert_one(task.model_dump(by_alias=True))

    print("Migration complete!")
```

## Summary: What's Different?

### Old Way (Current)
- ❌ 3 separate models (Task, Routine, Activity)
- ❌ 3 separate modals (confusing for users)
- ❌ Time blocks separate from tasks
- ❌ No day-type awareness
- ❌ Inconsistent UI (slider vs number input)
- ❌ Can't have recurring pool activities

### New Way (Proposed)
- ✅ ONE task model for everything
- ✅ ONE create modal with smart options
- ✅ Time blocks ARE tasks (blocks_other_tasks=True)
- ✅ Full day-type support (school/weekend/holiday)
- ✅ Consistent UI everywhere
- ✅ Can combine features (recurring + pool, window + split, etc.)
- ✅ Calendar integration
- ✅ Simpler codebase

---

## Ready to Implement?

This design covers ALL your scenarios. What do you think? Any final changes before we start implementation?
