# Task Management Design Refinements

**Version**: 2.1
**Date**: 2025-11-10
**Status**: Refinements based on discussion

## 1. Enhanced Recurrence Patterns (Industry Standard)

### Simplified RRULE for Stage 1 MVP

Following industry best practices (iCalendar RFC 5545), but simplified for MVP:

```python
class RecurrencePattern(BaseModel):
    """Simplified recurrence following iCalendar RRULE concepts"""

    frequency: Frequency  # DAILY | WEEKLY | MONTHLY | YEARLY
    interval: int = 1     # Every N days/weeks/months/years

    # For WEEKLY frequency
    by_weekday: Optional[List[Weekday]] = None  # [MON, WED, FRI]

    # For MONTHLY frequency (choose one approach)
    by_month_day: Optional[List[int]] = None  # [1, 15] = 1st and 15th of month
    by_set_pos: Optional[List[int]] = None    # [1, 3] = 1st and 3rd occurrence
    by_day: Optional[List[Weekday]] = None    # Used with by_set_pos: [MON] = Mondays

    # For YEARLY frequency
    by_month: Optional[List[int]] = None      # [1, 6] = January and June

    # Common fields
    start_date: date
    end_date: Optional[date] = None  # Or use count
    count: Optional[int] = None      # Stop after N occurrences
    skip_dates: List[date] = []      # Manually skip specific dates

class Frequency(str, Enum):
    DAILY = "DAILY"
    WEEKLY = "WEEKLY"
    MONTHLY = "MONTHLY"
    YEARLY = "YEARLY"  # Stage 2+

class Weekday(str, Enum):
    MON = "MON"
    TUE = "TUE"
    WED = "WED"
    THU = "THU"
    FRI = "FRI"
    SAT = "SAT"
    SUN = "SUN"
```

### Pattern Examples

#### Fixed Interval

```python
# Every 2 days
{
  "frequency": "DAILY",
  "interval": 2,
  "start_date": "2025-01-01"
}

# Every Monday
{
  "frequency": "WEEKLY",
  "interval": 1,
  "by_weekday": ["MON"]
}

# Every other week on Tuesday and Thursday
{
  "frequency": "WEEKLY",
  "interval": 2,
  "by_weekday": ["TUE", "THU"]
}
```

#### Non-Fixed Interval (Monthly patterns)

```python
# 1st and 15th of every month
{
  "frequency": "MONTHLY",
  "interval": 1,
  "by_month_day": [1, 15]
}

# Last day of every month
{
  "frequency": "MONTHLY",
  "interval": 1,
  "by_month_day": [-1]  # Negative = from end
}

# First Monday of every month
{
  "frequency": "MONTHLY",
  "interval": 1,
  "by_set_pos": [1],  # 1st occurrence
  "by_day": ["MON"]
}

# First and third Monday of every month
{
  "frequency": "MONTHLY",
  "interval": 1,
  "by_set_pos": [1, 3],  # 1st and 3rd occurrence
  "by_day": ["MON"]
}

# Last Friday of every month
{
  "frequency": "MONTHLY",
  "interval": 1,
  "by_set_pos": [-1],  # Last occurrence
  "by_day": ["FRI"]
}
```

#### Yearly Patterns (Stage 2+)

```python
# Every January 1st
{
  "frequency": "YEARLY",
  "interval": 1,
  "by_month": [1],
  "by_month_day": [1]
}

# First Monday of January and July
{
  "frequency": "YEARLY",
  "interval": 1,
  "by_month": [1, 7],
  "by_set_pos": [1],
  "by_day": ["MON"]
}
```

### Calculation Logic

```python
def calculate_next_occurrence(pattern: RecurrencePattern, after_date: date) -> Optional[date]:
    """
    Calculate next occurrence date after given date.
    Returns None if no more occurrences (past end_date or count reached).
    """

    if pattern.frequency == Frequency.DAILY:
        return after_date + timedelta(days=pattern.interval)

    elif pattern.frequency == Frequency.WEEKLY:
        # Find next occurrence of specified weekdays
        current = after_date + timedelta(days=1)
        while True:
            if current.isoweekday() in [weekday_to_int(d) for d in pattern.by_weekday]:
                # Check if this is the Nth week
                weeks_since_start = (current - pattern.start_date).days // 7
                if weeks_since_start % pattern.interval == 0:
                    return current
            current += timedelta(days=1)

    elif pattern.frequency == Frequency.MONTHLY:
        if pattern.by_month_day:
            # Simple: 1st, 15th, etc.
            return calculate_monthly_by_day(after_date, pattern)
        elif pattern.by_set_pos and pattern.by_day:
            # Complex: 1st Monday, 3rd Friday, etc.
            return calculate_monthly_by_position(after_date, pattern)

    # For Stage 2: Use python-dateutil.rrule for full support
    # from dateutil.rrule import rrule, DAILY, WEEKLY, MONTHLY
    # rule = rrule(WEEKLY, interval=pattern.interval, byweekday=pattern.by_weekday, ...)
    # return rule.after(after_date)

def weekday_to_int(weekday: Weekday) -> int:
    """Convert Weekday enum to isoweekday (1=Mon, 7=Sun)"""
    return ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].index(weekday.value) + 1
```

### Stage 2 Migration Path

**Stage 2**: Replace custom logic with `python-dateutil`:

```python
from dateutil.rrule import rrule, DAILY, WEEKLY, MONTHLY, MO, TU, WE, TH, FR, SA, SU

def pattern_to_rrule(pattern: RecurrencePattern) -> rrule:
    """Convert RecurrencePattern to dateutil rrule"""
    freq_map = {
        Frequency.DAILY: DAILY,
        Frequency.WEEKLY: WEEKLY,
        Frequency.MONTHLY: MONTHLY,
    }

    weekday_map = {
        Weekday.MON: MO, Weekday.TUE: TU, Weekday.WED: WE,
        Weekday.THU: TH, Weekday.FRI: FR, Weekday.SAT: SA, Weekday.SUN: SU
    }

    kwargs = {
        "freq": freq_map[pattern.frequency],
        "interval": pattern.interval,
        "dtstart": pattern.start_date,
    }

    if pattern.by_weekday:
        kwargs["byweekday"] = [weekday_map[d] for d in pattern.by_weekday]

    if pattern.by_month_day:
        kwargs["bymonthday"] = pattern.by_month_day

    if pattern.by_set_pos:
        kwargs["bysetpos"] = pattern.by_set_pos

    if pattern.end_date:
        kwargs["until"] = pattern.end_date
    elif pattern.count:
        kwargs["count"] = pattern.count

    return rrule(**kwargs)

# Usage
rule = pattern_to_rrule(routine.recurrence_pattern)
next_occurrence = rule.after(datetime.now())
```

---

## 2. Flexible Scheduling Priority System

### Priority Calculation

When AI schedules FLEXIBLE tasks, priority is multi-factor:

```python
class Task(BaseModel):
    # ... existing fields ...

    # Scheduling preferences (for FLEXIBLE tasks)
    preferred_time_slot: Optional[TimeSlot] = None  # Soft constraint
    priority_boost: int = 0  # -5 to +5, manual parent adjustment

    @property
    def scheduling_priority(self) -> float:
        """
        Calculate scheduling priority for AI.
        Higher number = schedule earlier, protect more.
        """
        score = 0.0

        # Factor 1: Obligation level (biggest weight)
        if self.obligation_level == ObligationLevel.MUST_DO:
            score += 100
        elif self.obligation_level == ObligationLevel.SHOULD_DO:
            score += 50
        # OPTIONAL = 0

        # Factor 2: Has preferred time (YOUR REQUIREMENT)
        if self.preferred_time_slot:
            score += 30  # Boost significantly

        # Factor 3: Deadline urgency
        if self.must_complete_by:
            hours_until = (self.must_complete_by - datetime.now()).total_seconds() / 3600
            if hours_until < 24:
                score += 40  # Very urgent
            elif hours_until < 48:
                score += 20
            elif hours_until < 72:
                score += 10

        # Factor 4: Rollover penalty (discourage procrastination)
        score -= (self.rollover_count * 10)

        # Factor 5: Manual parent boost
        score += (self.priority_boost * 5)

        # Factor 6: Duration (shorter = slightly easier to fit)
        if self.estimated_duration_minutes and self.estimated_duration_minutes <= 15:
            score += 5

        # Factor 7: Delayed tasks (already rescheduled)
        if self.is_delayed:
            score += 15  # Try to do delayed tasks sooner

        return score
```

### Scheduling Algorithm

```python
def schedule_flexible_tasks(child_id: str, date: date) -> List[Tuple[Task, TimeSlot]]:
    """
    Assign time slots to FLEXIBLE tasks.

    Priority order:
    1. Tasks with preferred_time_slot (honor preferences first)
    2. Then by scheduling_priority score
    """

    # Get available slots
    time_blocks = TimeBlockService.get_blocks_for_date(child_id, date)
    available_slots = calculate_available_time_slots(date, time_blocks)

    # Get flexible tasks
    tasks = TaskService.get_tasks(
        child_id=child_id,
        scheduled_date=date,
        scheduling_type=SchedulingType.FLEXIBLE,
        status="PENDING"
    )

    # Sort by priority (high to low)
    tasks.sort(key=lambda t: t.scheduling_priority, reverse=True)

    scheduled: List[Tuple[Task, TimeSlot]] = []

    # PHASE 1: Honor preferred time slots first
    for task in tasks:
        if not task.preferred_time_slot:
            continue

        # Try to find slot overlapping with preference
        slot = find_slot_near_preference(
            available_slots,
            task.preferred_time_slot,
            task.estimated_duration_minutes
        )

        if slot:
            scheduled.append((task, slot))
            available_slots.remove(slot)
            tasks.remove(task)

    # PHASE 2: Schedule remaining tasks by priority
    for task in tasks:
        slot = find_best_slot(available_slots, task.estimated_duration_minutes)

        if slot:
            scheduled.append((task, slot))
            available_slots.remove(slot)
        else:
            # Cannot fit - notify parent
            log_scheduling_conflict(task, date)

    return scheduled

def find_slot_near_preference(
    available: List[TimeSlot],
    preferred: TimeSlot,
    duration: int
) -> Optional[TimeSlot]:
    """
    Find available slot that best matches preferred time.
    Returns slot with maximum overlap.
    """
    best_slot = None
    best_overlap = 0

    for slot in available:
        if slot.duration_minutes >= duration:
            overlap = calculate_overlap(slot, preferred)
            if overlap > best_overlap:
                best_overlap = overlap
                best_slot = slot

    return best_slot
```

### UI for Time Preferences

**Creating FLEXIBLE task**:
```
┌─────────────────────────────────────┐
│ Task: Memorize 10 words             │
│ Duration: 20 minutes                 │
│                                      │
│ Scheduling:                          │
│ ● Flexible - AI schedules            │
│ ○ Fixed time - specific slot        │
│                                      │
│ ─────────────────────────────────── │
│ Time Preference (optional):          │
│                                      │
│ ☐ I prefer this task to be done     │
│   around: [14:00] to [15:00]        │
│                                      │
│ ℹ️ AI will try to schedule during   │
│   this time, but may adjust if      │
│   needed to fit everything.         │
│                                      │
│ ─────────────────────────────────── │
│ Priority Adjustment:                 │
│                                      │
│ Lower ◄─────●─────► Higher          │
│  -5        0        +5              │
│                                      │
│ Current: Normal (0)                  │
│                                      │
│ ℹ️ Boost priority if this task is   │
│   more important than others.       │
└─────────────────────────────────────┘
```

**Visual indicator on calendar**:
- Tasks with preferred time: Show soft green background in preferred slot
- Actual scheduled time: Bold border
- If couldn't honor preference: Yellow warning icon with tooltip

---

## 3. TaskSource Distinction (ONE_TIME vs ACTIVITY)

### Enhanced Model with Metadata

```python
class Task(BaseModel):
    # ... existing fields ...

    # Source tracking
    task_source: TaskSource
    source_id: Optional[ObjectId] = None  # routine_id or activity_id
    source_metadata: Optional[TaskSourceMetadata] = None

class TaskSource(str, Enum):
    ONE_TIME = "ONE_TIME"      # Parent created directly
    ROUTINE = "ROUTINE"        # Auto-generated from recurring pattern
    ACTIVITY = "ACTIVITY"      # Converted from activity pool

class TaskSourceMetadata(BaseModel):
    """
    Additional context about task origin.
    Makes the distinction between sources clear.
    """

    # Common
    source_title: Optional[str] = None  # Original routine/activity title

    # For ONE_TIME
    creation_context: Optional[str] = None  # "homework", "makeup_work", "special_request"
    parent_note: Optional[str] = None  # Why parent created this

    # For ROUTINE
    occurrence_number: Optional[int] = None  # 15th occurrence of this routine
    routine_is_active: Optional[bool] = None  # Still generating tasks?
    next_occurrence_date: Optional[date] = None

    # For ACTIVITY
    activity_type: Optional[ActivityType] = None
    times_done_today: Optional[int] = None  # Already did this activity N times today
    times_done_this_week: Optional[int] = None
    can_do_again: Optional[bool] = None  # Based on activity rules
    remaining_daily_minutes: Optional[int] = None  # If activity has time limits
```

### Practical Differences

#### ONE_TIME Task
```python
# Parent creates homework task directly
task = Task(
    title="Math homework Chapter 5",
    description="Problems 1-20",
    task_source=TaskSource.ONE_TIME,
    source_id=None,  # No source
    source_metadata=TaskSourceMetadata(
        creation_context="homework",
        parent_note="Test on Friday, must finish by Thursday"
    ),
    obligation_level=ObligationLevel.MUST_DO,
    scheduling_type=SchedulingType.FLEXIBLE
)
```

#### ACTIVITY Task
```python
# Child or parent converts activity to scheduled task
activity = Activity(
    id="act-123",
    title="Video games",
    rules=ActivityRules(max_times_per_day=2, max_duration_minutes=30)
)

# Check if can do again
usage_today = ActivityUsageService.get_usage_count(child_id, activity.id, today())

task = Task(
    title="Video games",
    description="30 minutes of approved games",
    task_source=TaskSource.ACTIVITY,
    source_id=activity.id,  # Links back to activity
    source_metadata=TaskSourceMetadata(
        source_title="Video games",
        activity_type=ActivityType.ENTERTAINMENT,
        times_done_today=usage_today,  # Already did once today
        can_do_again=usage_today < 2,  # Max 2 times per day
        remaining_daily_minutes=30  # 30 min left today
    ),
    obligation_level=ObligationLevel.OPTIONAL,
    scheduling_type=SchedulingType.FLEXIBLE,
    estimated_duration_minutes=30
)
```

#### ROUTINE Task
```python
# Auto-generated from routine
routine = Routine(
    id="routine-5",
    title="Memorize 10 words",
    recurrence_pattern={...}
)

task = Task(
    title="Memorize 10 words",
    task_source=TaskSource.ROUTINE,
    source_id=routine.id,
    source_metadata=TaskSourceMetadata(
        source_title="Memorize 10 words",
        occurrence_number=15,  # 15th time this routine generated task
        routine_is_active=True,
        next_occurrence_date=date(2025, 11, 11)
    ),
    obligation_level=ObligationLevel.MUST_DO
)
```

### Why Maintain Distinction?

**Analytics & Insights**:
```python
# Parent dashboard stats
stats = {
    "one_time_completed": 25,      # Custom tasks
    "routine_completed": 150,      # From routines
    "activity_completed": 40,      # From activity pool
    "completion_rate_by_source": {
        "ONE_TIME": 0.85,   # 85% completion rate
        "ROUTINE": 0.92,    # 92% - routines more consistent
        "ACTIVITY": 1.0     # 100% - only scheduled when wanted
    }
}
```

**Activity Rule Enforcement**:
```python
def convert_activity_to_task(activity_id: str, scheduled_date: date) -> Task:
    """
    Convert activity to task, enforcing rules.
    """
    activity = ActivityService.get_activity(activity_id)

    # Check rules
    if activity.rules:
        usage = ActivityUsageService.get_usage_stats(activity.child_id, activity_id, scheduled_date)

        if activity.rules.max_times_per_day:
            if usage.times_today >= activity.rules.max_times_per_day:
                raise ValueError(f"Already did '{activity.title}' {usage.times_today} times today (max: {activity.rules.max_times_per_day})")

        if activity.rules.max_total_minutes_per_day:
            if usage.minutes_today + activity.task_template.estimated_duration_minutes > activity.rules.max_total_minutes_per_day:
                raise ValueError(f"Would exceed daily time limit for '{activity.title}'")

    # Create task with source tracking
    task = Task(
        title=activity.title,
        task_source=TaskSource.ACTIVITY,
        source_id=activity.id,
        source_metadata=TaskSourceMetadata(
            activity_type=activity.activity_type,
            times_done_today=usage.times_today,
            can_do_again=True  # Just checked
        ),
        **activity.task_template.dict()
    )

    return task
```

**UI Display**:
```python
# Task list with icons
📝 Math homework (ONE_TIME)
�� Memorize 10 words (ROUTINE - 15th occurrence)
🎯 Video games (ACTIVITY - 1/2 times today)
```

### Alternative: Two-Source Model

If three sources feels like overkill, simplify to:

```python
class TaskSource(str, Enum):
    CREATED = "CREATED"      # Parent created (one-time or from activity)
    GENERATED = "GENERATED"  # Auto-generated from routine

class Task(BaseModel):
    task_source: TaskSource
    source_id: Optional[ObjectId] = None  # routine_id if GENERATED

    # If CREATED from activity
    activity_source: Optional[ObjectId] = None  # activity_id if from pool
```

**My Recommendation**: Keep three sources with metadata. It provides valuable context without significant complexity.

---

## Summary of Refinements

### 1. Recurrence Patterns ✅
- **Stage 1 MVP**: Simplified RRULE subset (DAILY, WEEKLY, MONTHLY with basic patterns)
- **Stage 2+**: Migrate to full RRULE using `python-dateutil`
- **Supports**: Fixed interval (every 2 days, every Monday) AND non-fixed (1st & 15th of month, 2nd Tuesday)

### 2. Flexible Scheduling Priority ✅
- Multi-factor priority: obligation level + preferred time + deadline + rollover + manual boost + duration
- **Tasks with `preferred_time_slot` get +30 priority boost** → scheduled first in preferred range
- Two-phase algorithm: honor preferences first, then fill remaining by priority

### 3. TaskSource Distinction ✅
- Keep three sources (ONE_TIME, ROUTINE, ACTIVITY)
- Add `source_metadata` for rich context
- Enables: analytics, rule enforcement, UI differentiation, regeneration capability

---

## Next Steps

1. ✅ Design refinements documented
2. **Update main design doc** with these sections
3. **Implement recurrence calculation** logic
4. **Implement priority-based scheduling** algorithm
5. **Add source metadata** to Task model
6. **Create UI components** for time preferences and priority boost

Ready to proceed with implementation? 🚀
