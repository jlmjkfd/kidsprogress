# Task Management Business Logic Design v2

**Version**: 2.0 (Refined based on requirements feedback)
**Date**: 2025-11-10
**Status**: Final Design for Implementation

## Executive Summary

**Core Concepts**: Everything is either a **Task** (scheduled work) or an **Activity** (pool item).
- Tasks can be one-time or generated from Routines
- Activities are flexible, optional items that can become Tasks when scheduled
- Both support rich rules, time constraints, and AI recommendations

**Key Features**:
- ✅ Flexible recurrence (daily, every N days, specific weekdays)
- ✅ Smart rollover with backlog management
- ✅ Partial-day events (not just full-day)
- ✅ Fixed-time vs flexible tasks
- ✅ AI-driven schedule recommendations
- ✅ Rich activity rules (duration limits, sequential rules, etc.)

---

## Part 1: Core Concepts

### 1.1 Task (Work Item)

A Task represents specific work to be done. Tasks can be:
- **One-time**: Created directly by parent
- **From Routine**: Auto-generated instance from recurring pattern
- **From Activity**: Activity converted to scheduled task

**Key Properties**:
```python
{
  # Identity
  "id": "task-123",
  "title": "Memorize 10 words",
  "description": "Focus on vocabulary from Chapter 3",

  # Ownership
  "child_id": "child-1",
  "parent_id": "parent-1",
  "collection_id": "collection-1",

  # Task Nature
  "task_source": "ONE_TIME" | "ROUTINE" | "ACTIVITY",
  "source_id": "routine-5",  # routine_id or activity_id if applicable
  "obligation_level": "MUST_DO" | "SHOULD_DO" | "OPTIONAL",

  # Scheduling (NEW APPROACH)
  "scheduling_type": "FLEXIBLE" | "FIXED_TIME",  # Can AI move it or is it locked?
  "scheduled_date": "2025-11-10",
  "fixed_time_slot": {  # Only if scheduling_type = FIXED_TIME
    "start_time": "14:00",
    "end_time": "15:30"
  },

  # Rollover Tracking
  "original_date": "2025-11-09",  # if rolled over
  "rollover_count": 0,
  "is_in_backlog": false,  # true if rolled over 3+ times
  "is_delayed": false,  # true if scheduled after original date

  # Status & Completion
  "status": "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "SKIPPED",
  "started_at": null,  # optional time tracking
  "completed_at": null,
  "actual_duration_minutes": null,
  "completed_by": null,  # "CHILD" or "PARENT"
  "completion_type": null,  # "TRACKED" or "RETROACTIVE"

  # Time Constraints
  "estimated_duration_minutes": 30,
  "must_complete_by": "2025-11-10T23:59:59Z",

  # Rich Content (unchanged)
  "task_type_code": "academic",
  "metrics": [...],
  "quality_aspects": [...],
  "subtasks": [...],
  "tools": [...],
  "attachments": [...]
}
```

**Scheduling Types Explained**:
- **FLEXIBLE**: AI can move this task to any available time slot
- **FIXED_TIME**: Task must occur at specific time (e.g., "Family Hiking 2-5pm")

### 1.2 Routine (Recurring Template)

A Routine is a template that auto-generates Task instances.

```python
{
  # Identity
  "id": "routine-5",
  "title": "Memorize 10 words",
  "child_id": "child-1",
  "parent_id": "parent-1",
  "collection_id": "collection-1",

  # Recurrence Pattern (ENHANCED)
  "recurrence_pattern": {
    "type": "INTERVAL_DAYS" | "WEEKLY" | "CUSTOM",
    "interval_days": 4,  # Every 4 days (for type=INTERVAL_DAYS)
    "days_of_week": [1, 2, 3, 4, 5],  # Mon-Fri (for type=WEEKLY)
    "start_date": "2025-01-01",
    "end_date": null,  # null = indefinite
    "skip_dates": ["2025-12-25", "2025-01-01"]  # Manually skip specific dates
  },

  # Day Type Filter (optional, can be empty)
  "applicable_day_types": ["SCHOOL_DAY", "WEEKEND"],  # Generate only on these types

  # Rollover Behavior
  "rollover_enabled": true,
  "rollover_limit": 3,  # After 3 rollovers → backlog

  # Task Generation Template
  "task_template": {
    "description": "Focus on vocabulary from current chapter",
    "obligation_level": "MUST_DO",
    "scheduling_type": "FLEXIBLE",  # or FIXED_TIME
    "estimated_duration_minutes": 20,
    "task_type_code": "academic",
    "metrics": [...],
    "subtasks": [...]
  },

  # Status
  "is_active": true,
  "paused_until": null,  # Temporarily pause
  "created_at": "...",
  "updated_at": "..."
}
```

**Recurrence Examples**:
```python
# Every day
{"type": "INTERVAL_DAYS", "interval_days": 1}

# Every 4 days
{"type": "INTERVAL_DAYS", "interval_days": 4}

# Weekdays only
{"type": "WEEKLY", "days_of_week": [1, 2, 3, 4, 5]}

# Monday, Wednesday, Friday
{"type": "WEEKLY", "days_of_week": [1, 3, 5]}
```

### 1.3 Activity (Pool Item)

Activities are optional, flexible items that can be recommended by AI or converted to Tasks.

```python
{
  # Identity
  "id": "activity-10",
  "title": "Video games",
  "description": "Relaxation and hand-eye coordination",
  "child_id": "child-1",
  "parent_id": "parent-1",

  # Classification
  "activity_type": "ENTERTAINMENT" | "BREAK" | "ENRICHMENT" | "EXERCISE" | "LEARNING",
  "obligation_level": "OPTIONAL",  # Activities are always optional

  # Availability Rules (ALL OPTIONAL)
  "rules": {
    # Frequency Limits
    "max_times_per_day": 2,  # Can do up to 2 times per day
    "max_times_per_week": 5,  # Can do up to 5 times per week

    # Duration Limits
    "min_duration_minutes": 5,  # Minimum time (e.g., break must be at least 5 min)
    "max_duration_minutes": 30,  # Maximum per session
    "max_total_minutes_per_day": 60,  # Total across all sessions today

    # Timing Rules
    "allowed_day_types": ["WEEKEND", "HOLIDAY"],  # Only on these day types
    "allowed_time_of_day": ["AFTERNOON", "EVENING"],  # Only during these times
    "not_before_time": "14:00",  # Cannot do before 2pm
    "not_after_time": "20:00",  # Cannot do after 8pm

    # Sequential Rules
    "can_be_sequential": false,  # Can do this activity back-to-back?
    "min_gap_minutes": 60,  # Must wait 60 min before doing again

    # Dependencies
    "requires_completion_of": ["homework"],  # Must finish homework first
    "incompatible_with": ["screen_time"],  # Cannot do if already did screen_time today
  },

  # AI Recommendation
  "recommendation_priority": 3,  # 1-5, higher = suggest more often
  "recommendation_contexts": ["FREE_TIME", "BREAK_TIME", "AFTER_HOMEWORK"],

  # Status
  "is_active": true,

  # Template for conversion to Task
  "task_template": {
    "task_type_code": "entertainment",
    "scheduling_type": "FLEXIBLE",
    "estimated_duration_minutes": 30
  }
}
```

**Default Activities for New Child**:
```python
[
  {"title": "Take a 5-min break", "type": "BREAK", "min_duration": 5, "max_duration": 10},
  {"title": "Stretch legs", "type": "EXERCISE", "min_duration": 2, "max_duration": 5},
  {"title": "Have a sip of water", "type": "BREAK", "min_duration": 1, "max_duration": 2},
  {"title": "Look outside the window", "type": "BREAK", "min_duration": 3, "max_duration": 5},
  {"title": "Free reading", "type": "ENRICHMENT", "min_duration": 10},
  {"title": "Draw or doodle", "type": "ENRICHMENT", "min_duration": 10}
]
```

### 1.4 Time Block (Unavailable Time)

Used for school, sleep, special events, or any unavailable period.

```python
{
  "id": "block-123",
  "child_id": "child-1",
  "date": "2025-11-10",  # null = recurring

  # Time Range
  "start_time": "08:00",
  "end_time": "15:00",

  # Type
  "block_type": "SCHOOL" | "SLEEP" | "MEAL" | "SPECIAL_EVENT" | "UNAVAILABLE",
  "title": "School",  # or "Family Hiking"
  "description": "Math test today",

  # Recurrence (for recurring blocks like school)
  "is_recurring": true,
  "recurrence_days": [1, 2, 3, 4, 5],  # Mon-Fri

  # Special Event as Task Option
  "as_fixed_task": false,  # If true, create FIXED_TIME task instead of just blocking time
  "fixed_task_data": {  # Only if as_fixed_task = true
    "title": "Family Hiking",
    "description": "Visit Pine Mountain trail",
    "can_have_subtasks": true,  # Allow child to add learning moments
    "tools": ["media_record"],  # Can take photos
  }
}
```

**Use Cases**:
1. **Regular unavailable time** (school, sleep):
   - `is_recurring = true`
   - `block_type = "SCHOOL"`
   - No task created, just blocks scheduling

2. **Special event as unavailable** (partial day):
   - `is_recurring = false`
   - `start_time = "14:00"`, `end_time = "17:00"`
   - Just blocks time, no task

3. **Special event as fixed task** (can track, add subtasks):
   - `as_fixed_task = true`
   - Creates FIXED_TIME task with this time slot
   - Task can have subtasks, media attachments, etc.

### 1.5 Day Type System (Simplified)

Day types are just labels that help filter routines and activities.

```python
# DayTypeAssignment (per child)
{
  "child_id": "child-1",
  "date": "2025-11-10",
  "day_types": ["SCHOOL_DAY", "SPECIAL_EVENT"],  # Can have multiple

  # Quick computed field (not stored)
  "computed_day_type": "SCHOOL_DAY"  # Primary type for UI display
}

# Common day types
SCHOOL_DAY  # Normal school day
WEEKEND     # Saturday/Sunday
HOLIDAY     # School holiday (winter break, Thanksgiving, etc.)
SUMMER      # Summer vacation
SPECIAL_EVENT  # Has special event (but can still be SCHOOL_DAY + SPECIAL_EVENT)
```

**How it works**:
- Parent sets recurring pattern: Mon-Fri = SCHOOL_DAY, Sat-Sun = WEEKEND
- Parent overrides specific dates: "2025-12-25" = HOLIDAY
- Routines with `applicable_day_types = ["SCHOOL_DAY"]` only generate on school days
- Activities with `allowed_day_types = ["WEEKEND"]` only available on weekends

---

## Part 2: Business Logic Flows

### 2.1 Daily Task Generation (Cron Job at 00:00)

**Purpose**: Generate today's task instances from routines.

```python
def generate_daily_tasks(child_id: str, date: date):
    """
    Main cron job to generate tasks for the day.
    Runs at 00:00 local time for each child.
    """

    # 1. Get child's active routines
    routines = RoutineService.get_active_routines(child_id)

    # 2. Get today's day types
    day_types = CalendarService.get_day_types(child_id, date)

    # 3. For each routine, check if should generate today
    for routine in routines:
        # Check recurrence pattern
        if not matches_recurrence_pattern(routine, date):
            continue

        # Check day type filter
        if routine.applicable_day_types:
            if not any(dt in day_types for dt in routine.applicable_day_types):
                continue

        # Check if manually skipped
        if date in routine.recurrence_pattern.skip_dates:
            continue

        # Generate task instance
        task = create_task_from_routine(routine, date)
        TaskService.create_task(task)

        log(f"Generated task '{task.title}' for {date}")
```

### 2.2 Rollover Logic (Cron Job at 23:00)

**Purpose**: Handle incomplete must-do tasks before day ends.

```python
def rollover_incomplete_tasks(child_id: str, date: date):
    """
    Runs at 23:00 to roll over incomplete tasks.
    """

    # 1. Find incomplete must-do tasks for today
    incomplete = TaskService.get_tasks_by_child(
        child_id,
        scheduled_date=date,
        obligation_level="MUST_DO",
        status__in=["PENDING", "IN_PROGRESS"]
    )

    # 2. For each incomplete task
    for task in incomplete:
        # Skip if not from routine or routine doesn't allow rollover
        if not task.source_id or task.task_source != "ROUTINE":
            continue

        routine = RoutineService.get_routine(task.source_id)
        if not routine.rollover_enabled:
            continue

        # Check rollover limit
        if task.rollover_count >= routine.rollover_limit:
            # Move to backlog
            TaskService.move_to_backlog(task.id)
            NotificationService.notify_parent(
                parent_id=task.parent_id,
                message=f"Task '{task.title}' moved to backlog after {routine.rollover_limit} rollovers"
            )
            continue

        # Create rollover task for tomorrow
        rollover_task = task.copy()
        rollover_task.scheduled_date = date + timedelta(days=1)
        rollover_task.original_date = task.original_date or date
        rollover_task.rollover_count = task.rollover_count + 1
        rollover_task.is_delayed = True
        rollover_task.status = "PENDING"

        TaskService.create_task(rollover_task)

        log(f"Rolled over task '{task.title}' to {rollover_task.scheduled_date} (count={rollover_task.rollover_count})")
```

### 2.3 AI Schedule Recommendation

**Purpose**: When available time is insufficient, recommend what to do/defer.

```python
def recommend_schedule_adjustments(child_id: str, date: date):
    """
    Called when:
    1. Parent adds time blocks that reduce available time
    2. New tasks added that exceed available time
    3. Child requests "What should I do today?"
    """

    # 1. Calculate available time
    time_blocks = TimeBlockService.get_blocks_for_date(child_id, date)
    total_minutes = 24 * 60
    unavailable_minutes = sum(block.duration_minutes for block in time_blocks)
    available_minutes = total_minutes - unavailable_minutes

    # 2. Get scheduled tasks (both flexible and fixed)
    tasks = TaskService.get_tasks_by_child(child_id, scheduled_date=date, status="PENDING")

    fixed_tasks = [t for t in tasks if t.scheduling_type == "FIXED_TIME"]
    flexible_tasks = [t for t in tasks if t.scheduling_type == "FLEXIBLE"]

    # 3. Calculate required time
    fixed_time = sum(t.estimated_duration_minutes for t in fixed_tasks)
    flexible_time = sum(t.estimated_duration_minutes for t in flexible_tasks)
    total_required = fixed_time + flexible_time

    # 4. Check if time sufficient
    if total_required <= available_minutes:
        return {"status": "OK", "message": "Schedule fits!"}

    # 5. Time insufficient - recommend adjustments
    deficit = total_required - available_minutes

    # Prioritize tasks
    must_do = [t for t in flexible_tasks if t.obligation_level == "MUST_DO"]
    should_do = [t for t in flexible_tasks if t.obligation_level == "SHOULD_DO"]
    optional = [t for t in flexible_tasks if t.obligation_level == "OPTIONAL"]

    # Recommend deferring optional first, then should_do
    to_defer = []
    remaining_deficit = deficit

    for task in optional + should_do:
        if remaining_deficit <= 0:
            break
        to_defer.append(task)
        remaining_deficit -= task.estimated_duration_minutes

    # 6. If still not enough, recommend parent review
    if remaining_deficit > 0:
        return {
            "status": "OVERLOADED",
            "message": f"Even after deferring {len(to_defer)} tasks, still need {remaining_deficit} more minutes.",
            "recommendation": "Parent should cancel some must-do tasks or adjust routines.",
            "to_defer": to_defer,
            "must_do_at_risk": must_do
        }

    # 7. Return recommendation
    return {
        "status": "ADJUSTABLE",
        "message": f"Can fit by deferring {len(to_defer)} tasks to tomorrow.",
        "to_defer": to_defer,
        "keep_today": must_do + should_do[:-len([t for t in to_defer if t.obligation_level == "SHOULD_DO"])]
    }
```

### 2.4 Activity Recommendation

**Purpose**: AI suggests activities from pool when child has free time.

```python
def recommend_activities(child_id: str, current_time: datetime, context: str = "FREE_TIME"):
    """
    Recommend activities based on current context and rules.

    Args:
        child_id: Child ID
        current_time: Current time (for time-of-day checks)
        context: FREE_TIME | BREAK_TIME | AFTER_HOMEWORK
    """

    # 1. Get all active activities for child
    activities = ActivityService.get_activities_by_child(child_id, is_active=True)

    # 2. Filter by context
    activities = [a for a in activities if context in a.recommendation_contexts]

    # 3. Apply rule filters
    available = []
    today = current_time.date()

    for activity in activities:
        rules = activity.rules or {}

        # Check day type
        day_types = CalendarService.get_day_types(child_id, today)
        if rules.get("allowed_day_types"):
            if not any(dt in day_types for dt in rules["allowed_day_types"]):
                continue

        # Check time of day
        current_hour = current_time.hour
        if rules.get("not_before_time"):
            if current_hour < parse_time(rules["not_before_time"]).hour:
                continue
        if rules.get("not_after_time"):
            if current_hour > parse_time(rules["not_after_time"]).hour:
                continue

        # Check frequency limits (how many times already done today/week)
        usage_today = ActivityUsageService.get_usage_count(child_id, activity.id, today)
        if rules.get("max_times_per_day"):
            if usage_today >= rules["max_times_per_day"]:
                continue

        usage_this_week = ActivityUsageService.get_usage_count(child_id, activity.id, week_of(today))
        if rules.get("max_times_per_week"):
            if usage_this_week >= rules["max_times_per_week"]:
                continue

        # Check duration limits (total minutes today)
        minutes_today = ActivityUsageService.get_total_minutes(child_id, activity.id, today)
        if rules.get("max_total_minutes_per_day"):
            if minutes_today >= rules["max_total_minutes_per_day"]:
                continue

        # Check sequential rule
        last_activity = ActivityUsageService.get_last_activity(child_id)
        if last_activity and last_activity.activity_id == activity.id:
            if not rules.get("can_be_sequential", True):
                # Check if enough time passed
                if rules.get("min_gap_minutes"):
                    time_since = (current_time - last_activity.ended_at).total_seconds() / 60
                    if time_since < rules["min_gap_minutes"]:
                        continue

        # Check dependencies
        if rules.get("requires_completion_of"):
            for required_type in rules["requires_completion_of"]:
                if not has_completed_today(child_id, required_type, today):
                    continue

        # Passed all filters
        available.append(activity)

    # 4. Sort by recommendation_priority
    available.sort(key=lambda a: a.recommendation_priority, reverse=True)

    # 5. Return top 3
    return available[:3]
```

### 2.5 Task Completion (Flexible Modes)

```python
def complete_task(
    task_id: str,
    completed_by: Literal["CHILD", "PARENT"],
    tracked: bool = True,
    completion_note: Optional[str] = None
):
    """
    Complete task with flexible tracking.

    Args:
        task_id: Task ID
        completed_by: Who completed it
        tracked: False if retroactive (no start time)
        completion_note: Optional note from parent
    """

    task = TaskService.get_task(task_id)

    if tracked and task.started_at:
        # Mode 1: Tracked completion (started earlier)
        task.status = "COMPLETED"
        task.completed_at = datetime.now()
        task.actual_duration_minutes = (task.completed_at - task.started_at).total_seconds() / 60
        task.completed_by = completed_by
        task.completion_type = "TRACKED"
    else:
        # Mode 2 or 3: Retroactive completion (no start or skipped tracking)
        task.status = "COMPLETED"
        task.completed_at = datetime.now()
        task.started_at = None
        task.actual_duration_minutes = None
        task.completed_by = completed_by
        task.completion_type = "RETROACTIVE"

    if completion_note:
        task.completion_note = completion_note

    TaskService.update_task(task)

    # Calculate points
    points = PointsService.calculate_task_points(task)
    PointsService.award_points(task.child_id, points, reason=f"Completed: {task.title}")
```

---

## Part 3: Data Models (Complete Schemas)

### 3.1 Task Model (Updated)

```python
class Task(BaseModel):
    id: ObjectId = Field(default_factory=ObjectId)

    # Ownership
    child_id: ObjectId
    parent_id: ObjectId
    collection_id: ObjectId

    # Basic Info
    title: str
    description: Optional[str] = None

    # Source & Nature
    task_source: TaskSource  # ONE_TIME | ROUTINE | ACTIVITY
    source_id: Optional[ObjectId] = None  # routine_id or activity_id
    obligation_level: ObligationLevel  # MUST_DO | SHOULD_DO | OPTIONAL

    # Scheduling
    scheduling_type: SchedulingType  # FLEXIBLE | FIXED_TIME
    scheduled_date: date
    fixed_time_slot: Optional[TimeSlot] = None  # Only if FIXED_TIME

    # Rollover & Delay Tracking
    original_date: Optional[date] = None
    rollover_count: int = 0
    is_in_backlog: bool = False
    is_delayed: bool = False

    # Status
    status: TaskStatus  # PENDING | IN_PROGRESS | COMPLETED | CANCELLED | SKIPPED

    # Time Tracking (all optional)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    actual_duration_minutes: Optional[int] = None
    estimated_duration_minutes: Optional[int] = None

    # Completion
    completed_by: Optional[CompletedBy] = None  # CHILD | PARENT
    completion_type: Optional[CompletionType] = None  # TRACKED | RETROACTIVE
    completion_note: Optional[str] = None

    # Constraints
    must_complete_by: Optional[datetime] = None

    # Rich Content (from Phase 1A models)
    task_type_code: Optional[str] = None
    metrics: List[QuantifiableMetric] = []
    quality_aspects: List[QualityAspect] = []
    subtasks: List[Subtask] = []
    tools: List[ToolUsage] = []
    attachments: List[MediaAttachment] = []
    pause_history: List[TaskPauseRecord] = []
    ai_generated: Optional[AIGeneratedAttributes] = None

    # Audit
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    points_earned: Optional[int] = None

class TimeSlot(BaseModel):
    start_time: time  # e.g., 14:00
    end_time: time    # e.g., 15:30

class TaskSource(str, Enum):
    ONE_TIME = "ONE_TIME"      # Created directly by parent
    ROUTINE = "ROUTINE"        # Generated from routine
    ACTIVITY = "ACTIVITY"      # Converted from activity

class SchedulingType(str, Enum):
    FLEXIBLE = "FLEXIBLE"      # AI can move to any time
    FIXED_TIME = "FIXED_TIME"  # Must occur at specific time

class ObligationLevel(str, Enum):
    MUST_DO = "MUST_DO"
    SHOULD_DO = "SHOULD_DO"
    OPTIONAL = "OPTIONAL"
```

### 3.2 Routine Model (Updated)

```python
class Routine(BaseModel):
    id: ObjectId = Field(default_factory=ObjectId)

    # Ownership
    child_id: ObjectId
    parent_id: ObjectId
    collection_id: ObjectId

    # Basic Info
    title: str
    description: Optional[str] = None

    # Recurrence Pattern
    recurrence_pattern: RecurrencePattern

    # Filters (optional)
    applicable_day_types: List[DayType] = []  # Empty = all days

    # Rollover Settings
    rollover_enabled: bool = True
    rollover_limit: int = 3

    # Task Generation Template
    task_template: TaskTemplate

    # Status
    is_active: bool = True
    paused_until: Optional[date] = None

    # Audit
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

class RecurrencePattern(BaseModel):
    type: RecurrenceType  # INTERVAL_DAYS | WEEKLY | CUSTOM
    interval_days: Optional[int] = None  # For INTERVAL_DAYS: every N days
    days_of_week: Optional[List[int]] = None  # For WEEKLY: [1-7] (1=Mon)
    start_date: date
    end_date: Optional[date] = None  # null = indefinite
    skip_dates: List[date] = []  # Manually skip specific dates

class RecurrenceType(str, Enum):
    INTERVAL_DAYS = "INTERVAL_DAYS"  # Every N days
    WEEKLY = "WEEKLY"                # Specific days of week
    CUSTOM = "CUSTOM"                # Complex pattern (future)

class TaskTemplate(BaseModel):
    """Template for generating tasks from routine"""
    description: Optional[str] = None
    obligation_level: ObligationLevel
    scheduling_type: SchedulingType
    estimated_duration_minutes: Optional[int] = None
    task_type_code: Optional[str] = None
    metrics: List[QuantifiableMetric] = []
    quality_aspects: List[QualityAspect] = []
    subtasks: List[Subtask] = []
    tools: List[ToolUsage] = []
```

### 3.3 Activity Model (Updated)

```python
class Activity(BaseModel):
    id: ObjectId = Field(default_factory=ObjectId)

    # Ownership
    child_id: ObjectId
    parent_id: ObjectId

    # Basic Info
    title: str
    description: Optional[str] = None

    # Classification
    activity_type: ActivityType
    obligation_level: ObligationLevel = ObligationLevel.OPTIONAL  # Always optional

    # Rules (ALL OPTIONAL)
    rules: Optional[ActivityRules] = None

    # AI Recommendation
    recommendation_priority: int = 3  # 1-5
    recommendation_contexts: List[str] = ["FREE_TIME"]

    # Status
    is_active: bool = True

    # Template for conversion to Task
    task_template: TaskTemplate

    # Audit
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

class ActivityRules(BaseModel):
    """All fields optional"""
    # Frequency Limits
    max_times_per_day: Optional[int] = None
    max_times_per_week: Optional[int] = None

    # Duration Limits
    min_duration_minutes: Optional[int] = None
    max_duration_minutes: Optional[int] = None
    max_total_minutes_per_day: Optional[int] = None

    # Timing Rules
    allowed_day_types: Optional[List[DayType]] = None
    allowed_time_of_day: Optional[List[TimeOfDay]] = None
    not_before_time: Optional[time] = None
    not_after_time: Optional[time] = None

    # Sequential Rules
    can_be_sequential: bool = True
    min_gap_minutes: Optional[int] = None

    # Dependencies
    requires_completion_of: Optional[List[str]] = None  # Task type codes
    incompatible_with: Optional[List[str]] = None  # Activity IDs

class ActivityType(str, Enum):
    ENTERTAINMENT = "ENTERTAINMENT"
    BREAK = "BREAK"
    ENRICHMENT = "ENRICHMENT"
    EXERCISE = "EXERCISE"
    LEARNING = "LEARNING"

class TimeOfDay(str, Enum):
    MORNING = "MORNING"      # 6am-12pm
    AFTERNOON = "AFTERNOON"  # 12pm-6pm
    EVENING = "EVENING"      # 6pm-9pm
    NIGHT = "NIGHT"          # 9pm-12am
```

### 3.4 TimeBlock Model (New)

```python
class TimeBlock(BaseModel):
    id: ObjectId = Field(default_factory=ObjectId)

    # Ownership
    child_id: ObjectId
    parent_id: ObjectId

    # Time Range
    date: Optional[date] = None  # null = recurring
    start_time: time
    end_time: time

    # Type & Info
    block_type: BlockType
    title: str
    description: Optional[str] = None

    # Recurrence (for recurring blocks)
    is_recurring: bool = False
    recurrence_days: Optional[List[int]] = None  # [1-7] for days of week

    # Special Event as Task Option
    as_fixed_task: bool = False  # Create FIXED_TIME task?
    fixed_task_data: Optional[FixedTaskData] = None

    # Audit
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

class BlockType(str, Enum):
    SCHOOL = "SCHOOL"
    SLEEP = "SLEEP"
    MEAL = "MEAL"
    SPECIAL_EVENT = "SPECIAL_EVENT"
    UNAVAILABLE = "UNAVAILABLE"

class FixedTaskData(BaseModel):
    """Data for creating fixed-time task from block"""
    title: str
    description: Optional[str] = None
    can_have_subtasks: bool = True
    tools: List[str] = []  # Tool codes
    task_type_code: Optional[str] = None
```

### 3.5 ActivityUsage Model (New - for tracking)

```python
class ActivityUsage(BaseModel):
    """Track when activities are done (for rule enforcement)"""
    id: ObjectId = Field(default_factory=ObjectId)

    child_id: ObjectId
    activity_id: ObjectId

    started_at: datetime
    ended_at: datetime
    duration_minutes: int

    date: date  # For quick daily queries
    week_number: int  # For weekly queries
```

### 3.6 DayTypeAssignment Model (Simplified)

```python
class DayTypeAssignment(BaseModel):
    """Assign day types to specific dates"""
    id: ObjectId = Field(default_factory=ObjectId)

    child_id: ObjectId
    date: date
    day_types: List[DayType]  # Can have multiple

    # Computed field (not stored)
    @property
    def primary_day_type(self) -> DayType:
        """Return most specific type for UI"""
        if DayType.SPECIAL_EVENT in self.day_types:
            return DayType.SPECIAL_EVENT
        if DayType.HOLIDAY in self.day_types:
            return DayType.HOLIDAY
        if DayType.WEEKEND in self.day_types:
            return DayType.WEEKEND
        return DayType.SCHOOL_DAY

class DayType(str, Enum):
    SCHOOL_DAY = "SCHOOL_DAY"
    WEEKEND = "WEEKEND"
    HOLIDAY = "HOLIDAY"
    SUMMER = "SUMMER"
    SPECIAL_EVENT = "SPECIAL_EVENT"
```

---

## Part 4: UI Terminology & Parent-Facing Language

**Challenge**: How to explain Task vs Activity vs Routine clearly?

### Recommended UI Terms:

#### 1. For Parent Dashboard Sections:

```
📋 Tasks           → One-time work (homework, projects)
🔄 Routines        → Repeating work (daily reading, weekly piano)
🎯 Activity Pool   → Optional activities (breaks, enrichment, fun)
📅 Calendar        → Schedule view with day types
```

#### 2. Tooltips & Help Text:

**Tasks Tab**:
> "Tasks are one-time work items. Create a task for homework, projects, or anything that needs to be done once."

**Routines Tab**:
> "Routines repeat automatically. Create a routine for daily reading, weekly chores, or any activity that happens regularly. We'll generate tasks for you each day."

**Activity Pool Tab**:
> "Activities are optional, flexible items your child can do anytime. Add breaks, enrichment activities, or fun rewards. AI can suggest these when there's free time."

**Calendar Tab**:
> "Set your child's schedule, mark special events, and see what's planned each day. We'll help you fit everything in."

#### 3. Task Creation Flow:

When parent clicks "Add Task", show options:
```
┌─────────────────────────────────────┐
│ What would you like to add?         │
├─────────────────────────────────────┤
│ 📝 One-time Task                    │
│    Homework, project, or one-off    │
│    work                              │
│                                      │
│ 🔄 Repeating Routine                │
│    Daily reading, weekly practice   │
│    Generates tasks automatically    │
│                                      │
│ 🎯 Activity (Optional)              │
│    Breaks, enrichment, fun time     │
│    AI can suggest when available    │
└─────────────────────────────────────┘
```

#### 4. Special Event Creation:

When adding calendar event:
```
┌─────────────────────────────────────┐
│ Add Event: Nov 10, 2-5pm            │
├─────────────────────────────────────┤
│ Event Type:                          │
│ ○ Just block time (unavailable)     │
│ ● Create task (trackable)           │
│                                      │
│ [✓] Allow subtasks                  │
│ [✓] Can attach photos/recordings    │
│                                      │
│ Example: "Family Hiking" can have   │
│ subtasks like "Learn about wildlife"│
└─────────────────────────────────────┘
```

---

## Part 5: Answers to Your Questions

### Q1: Special events (partial day) ✅ SOLVED
**Solution**: TimeBlock with flexible duration
- Can be 1 hour or entire day
- Parent chooses: just block time OR create fixed-time task
- If task: can have subtasks, media recording, etc.

### Q2: Activity rules (all optional) ✅ SOLVED
**Solution**: ActivityRules model with all optional fields
- Duration limits: min/max per session, max per day
- Frequency: max times per day/week
- Sequential: can_be_sequential, min_gap_minutes
- Dependencies: requires_completion_of, incompatible_with

### Q3: Rollover limit (backlog + notify) ✅ SOLVED
**Solution**: After 3 rollovers → set is_in_backlog = true, notify parent
- Parent can cancel any backlog task
- Parent can pause/deactivate routine

### Q4: Everything can be task or activity ✅ SOLVED
**Solution**: Unified approach
- Default activities created for new child (breaks, water, stretching)
- UI clearly separates: Tasks (work) vs Activities (optional, flexible)

### Q5: AI recommendations for insufficient time ✅ SOLVED
**Solution**: `recommend_schedule_adjustments()` function
- Calculates available time
- Prioritizes must-do > should-do > optional
- Recommends what to defer
- Notifies parent if even must-do tasks won't fit

### Q6: Points for rolled tasks ✅ SOLVED
**Solution**: Same points (can be adjusted later with configuration)

### Q7: Hiking as task with subtasks ✅ SOLVED
**Solution**: Special events can be either:
- Just time block (unavailable)
- Fixed-time task (can have subtasks, tools, media)

### Q8: Other improvements?

**I recommend these enhancements**:

1. **Task Priority Boost** (new field):
   ```python
   priority_boost: int = 0  # -5 to +5, affects AI scheduling
   ```
   - Parent can boost important tasks ("+3" = schedule earlier)
   - Parent can lower priority ("-2" = schedule later if time tight)

2. **Routine Suggestions** (for new parents):
   - Provide routine templates: "Daily Reading 20min", "Homework Review", "Bedtime Routine"
   - Parent can enable with one click

3. **Break Reminders** (auto-activity):
   - If child works >45min without break, AI suggests break activity
   - Respects activity rules (min 5min break)

4. **Backlog View** (for parent):
   - Dedicated tab showing all rolled-over tasks
   - One-click actions: "Cancel", "Do Tomorrow", "Change to Optional"

5. **Time Pressure Indicator** (UI):
   - Red/yellow/green indicator on calendar
   - Red = overloaded, Yellow = tight, Green = comfortable

Would you like me to proceed with implementation, or do you have more feedback?

---

**Next Steps**:
1. ✅ Design approved?
2. Create/update backend models
3. Implement services (Routine, Activity, TimeBlock, Calendar)
4. Add API endpoints
5. Update frontend types
6. Build UI components

Ready to code when you are! 🚀
