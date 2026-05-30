# Task Management Business Logic Design

## Overview
Comprehensive task management system that handles must-do tasks, optional activities, recurrence, rollover, and flexible completion tracking.

## Core Concepts

### 1. Task vs Activity vs Routine

We need THREE distinct but related concepts:

#### **Task** (One-time or Instance)
- Specific work to be done
- Has a target completion date
- Can be must-do or optional
- Examples: "Math homework Chapter 5", "Write essay about summer"

#### **Routine** (Recurring Template)
- A pattern that generates task instances
- Examples: "Memorize 10 words daily", "Practice piano 30 mins"
- Contains recurrence rules
- Generates individual task instances for each occurrence

#### **Activity** (Flexible Pool Item)
- Optional, unscheduled activities
- AI can recommend when time available
- Has availability rules
- Examples: "Video games 30 min", "Practice handwriting", "Free reading"

### 2. Task Properties

#### Core Fields
```python
{
  "id": "task-123",
  "title": "Memorize 10 words",
  "collection_id": "collection-1",
  "child_id": "child-1",
  "parent_id": "parent-1",

  # Task Type
  "task_nature": "TASK" | "ACTIVITY",  # TASK = scheduled work, ACTIVITY = pool item
  "obligation_level": "MUST_DO" | "SHOULD_DO" | "OPTIONAL",

  # Instance Info (if from routine)
  "routine_id": "routine-5",  # null if one-time task
  "scheduled_for": "2025-11-10",  # target date
  "original_date": "2025-11-09",  # if rolled over
  "rollover_count": 1,  # how many times rolled over

  # Status
  "status": "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "SKIPPED",

  # Time Tracking (all optional)
  "started_at": "2025-11-10T14:30:00Z",  # null if not tracked
  "completed_at": "2025-11-10T15:00:00Z",
  "actual_duration_minutes": 30,  # calculated or null

  # Completion
  "completed_by": "CHILD" | "PARENT",  # who marked complete
  "completion_type": "TRACKED" | "RETROACTIVE",  # with or without time tracking
  "completion_note": "Great job!",  # optional parent note

  # Constraints
  "estimated_duration_minutes": 30,
  "must_complete_by": "2025-11-10T23:59:59Z",  # deadline
  "day_types": ["SCHOOL_DAY", "WEEKEND"],  # when applicable

  # Other fields
  "description": "...",
  "task_type_code": "academic",
  "metrics": [...],
  "subtasks": [...]
}
```

### 3. Routine (Recurring Template)

```python
{
  "id": "routine-5",
  "title": "Memorize 10 words",
  "child_id": "child-1",
  "parent_id": "parent-1",
  "collection_id": "collection-1",

  # Recurrence
  "recurrence_pattern": {
    "frequency": "DAILY" | "WEEKLY" | "WEEKDAYS" | "CUSTOM",
    "interval": 1,  # every N days/weeks
    "days_of_week": [1, 2, 3, 4, 5],  # Monday-Friday (1=Mon, 7=Sun)
    "start_date": "2025-01-01",
    "end_date": null,  # null = indefinite
  },

  # Day Type Restrictions
  "applicable_day_types": ["SCHOOL_DAY", "WEEKEND"],  # when to generate instances

  # Rollover Behavior
  "rollover_enabled": true,  # if incomplete, roll to next day
  "rollover_limit": 3,  # max times to rollover before auto-cancel

  # Template for generated tasks
  "task_template": {
    "description": "...",
    "task_type_code": "academic",
    "obligation_level": "MUST_DO",
    "estimated_duration_minutes": 20,
    "metrics": [...],
    "subtasks": [...]
  },

  # Status
  "is_active": true,
  "paused_until": null,  # temporarily pause routine

  # Audit
  "created_at": "...",
  "updated_at": "..."
}
```

### 4. Activity (Pool Item)

```python
{
  "id": "activity-10",
  "title": "Video games",
  "child_id": "child-1",
  "parent_id": "parent-1",

  # Activity Properties
  "activity_type": "ENTERTAINMENT" | "BREAK" | "ENRICHMENT" | "EXERCISE",
  "estimated_duration_minutes": 30,

  # Availability Rules
  "rules": {
    "max_per_day": 1,
    "max_per_week": 5,
    "allowed_day_types": ["WEEKEND", "HOLIDAY"],  # exclude SCHOOL_DAY
    "time_of_day": ["AFTERNOON", "EVENING"],  # when can be done
    "requires_completion_of": ["homework"],  # must finish homework first
  },

  # AI Recommendation
  "recommendation_priority": 3,  # 1-5, how often to suggest
  "recommendation_context": ["FREE_TIME", "BREAK_TIME"],

  # Status
  "is_active": true,

  # Template for when converted to task
  "task_template": {
    "description": "...",
    "obligation_level": "OPTIONAL",
  }
}
```

### 5. Day Type System

```python
# CalendarDay model
{
  "id": "cal-2025-11-10",
  "child_id": "child-1",
  "date": "2025-11-10",

  # Day Classification
  "day_types": ["SCHOOL_DAY"],  # can have multiple types

  # Special Events
  "is_special_day": true,
  "special_event": "Family Hiking",
  "special_event_note": "Leave early, pack lunch",

  # Task Override
  "cancelled_routines": ["routine-5", "routine-8"],  # which routines to skip
  "added_tasks": ["task-special-1"],  # one-time tasks for this day

  # Default Schedule
  "unavailable_blocks": [
    {"start": "08:00", "end": "15:00", "reason": "School"}
  ]
}

# DayTypeDefinition (parent settings)
{
  "child_id": "child-1",
  "day_type": "SCHOOL_DAY",
  "default_schedule": {
    "unavailable_blocks": [...],
    "default_routines": ["routine-5", "routine-7"]
  }
}
```

## Business Logic Flows

### Flow 1: Routine Task Generation

**Trigger**: Daily cron job at 00:00 local time

**Process**:
1. For each active routine:
   - Check if today matches recurrence pattern
   - Check if today's day_type is in `applicable_day_types`
   - Check if today is in `cancelled_routines` for this child
   - If all pass: Generate task instance for today

2. For each task instance:
   - Copy from routine's `task_template`
   - Set `routine_id`, `scheduled_for`, `original_date`
   - Set status = "PENDING"
   - Save to database

**Example**:
```
Routine: "Memorize 10 words" (daily, school days only)
Nov 10 (SCHOOL_DAY): ✅ Generate task
Nov 11 (WEEKEND): ❌ Skip
Nov 12 (SCHOOL_DAY, Special Event): ❌ Skip (in cancelled_routines)
```

### Flow 2: Rollover Logic

**Trigger**: Daily cron job at 23:00 local time (before day ends)

**Process**:
1. Find all MUST_DO tasks for today with status = PENDING or IN_PROGRESS
2. For each incomplete task:
   - Check if task has `routine_id` (from routine)
   - Check if routine has `rollover_enabled = true`
   - Check if `rollover_count < rollover_limit`
   - If all pass: Create rolled-over task for tomorrow

3. For rolled-over task:
   - Copy original task
   - Set `scheduled_for = tomorrow`
   - Set `original_date = today`
   - Set `rollover_count += 1`
   - Add note: "Rolled over from {original_date}"
   - Keep original task status as is (for history)

**Example**:
```
Nov 10: Task "Memorize 10 words" (PENDING)
23:00 cron: Incomplete → Create rollover for Nov 11
Nov 11 tasks:
  - "Memorize 10 words" (today's instance)
  - "Memorize 10 words" (rolled over, rollover_count=1)
```

### Flow 3: Flexible Task Completion

**Three completion modes**:

#### Mode 1: Tracked (with start/finish)
```python
# Child clicks "Start"
task.status = "IN_PROGRESS"
task.started_at = now()

# Child clicks "Finish"
task.status = "COMPLETED"
task.completed_at = now()
task.actual_duration_minutes = calculate_duration()
task.completed_by = "CHILD"
task.completion_type = "TRACKED"
```

#### Mode 2: Retroactive (skip tracking)
```python
# Child/Parent clicks "Mark as Done" (no start button clicked)
task.status = "COMPLETED"
task.completed_at = now()
task.started_at = null  # not tracked
task.actual_duration_minutes = null
task.completed_by = "CHILD" or "PARENT"
task.completion_type = "RETROACTIVE"
```

#### Mode 3: Parent Override
```python
# Parent can complete on behalf of child
task.status = "COMPLETED"
task.completed_at = now()
task.completed_by = "PARENT"
task.completion_type = "RETROACTIVE"
task.completion_note = "Did this at school"
```

### Flow 4: Activity Recommendation (AI)

**Trigger**: Child requests "What should I do?" or auto-suggest during free time

**Process**:
1. Get current context:
   - Current time of day
   - Today's day_type
   - Completed activities today/this week
   - Remaining must-do tasks

2. Filter available activities:
   - Check `allowed_day_types` includes today
   - Check `time_of_day` includes current time
   - Check `max_per_day` not exceeded
   - Check `requires_completion_of` (e.g., homework done)

3. Rank by `recommendation_priority`

4. Return top 3 suggestions with reasoning

**Example AI Response**:
```
🎮 Video games (30 min)
   ✓ Homework done
   ✓ Only 0/1 used today

✍️ Practice handwriting (20 min)
   ✓ Good for fine motor skills

📖 Free reading (flexible)
   ✓ Always available
```

### Flow 5: Day Type & Calendar Management

**Parent Actions**:
1. **Set recurring day types**:
   - Monday-Friday = SCHOOL_DAY
   - Saturday-Sunday = WEEKEND

2. **Mark special days**:
   - Nov 15 = HOLIDAY (Thanksgiving)
   - Automatically cancels routines not applicable to HOLIDAY

3. **Override specific day**:
   - Nov 10 = Special Event "Family Hiking"
   - Manually cancel routines: ["memorize_words", "piano_practice"]
   - Can still keep: ["brush_teeth", "read_before_bed"]

### Flow 6: Task Cancellation

**Three cancellation scenarios**:

#### Scenario 1: Single Task Cancel
```python
# Parent cancels task manually
task.status = "CANCELLED"
task.cancelled_at = now()
task.cancelled_by = "PARENT"
task.cancellation_reason = "Child is sick"
```

#### Scenario 2: Routine Pause
```python
# Pause routine temporarily (e.g., summer break)
routine.paused_until = "2025-09-01"
# No new tasks generated until that date
```

#### Scenario 3: Day Override
```python
# Cancel routine instances for specific day
calendar_day.cancelled_routines = ["routine-5"]
# That day's generation skips this routine
```

## Data Models Updates

### Task Model Changes
```python
# New fields to add:
task_nature: Enum["TASK", "ACTIVITY"]
obligation_level: Enum["MUST_DO", "SHOULD_DO", "OPTIONAL"]
routine_id: Optional[ObjectId]
original_date: Optional[date]
rollover_count: int = 0
completion_type: Enum["TRACKED", "RETROACTIVE"]
completed_by: Enum["CHILD", "PARENT"]
completion_note: Optional[str]
day_types: List[str]
```

### New Models to Create
```python
# Routine model (replaces simple recurrence)
class Routine:
    id: ObjectId
    title: str
    child_id: ObjectId
    parent_id: ObjectId
    collection_id: ObjectId
    recurrence_pattern: RecurrencePattern
    applicable_day_types: List[DayType]
    rollover_enabled: bool
    rollover_limit: int
    task_template: dict
    is_active: bool
    paused_until: Optional[datetime]

# Activity model (pool items)
class Activity:
    id: ObjectId
    title: str
    child_id: ObjectId
    parent_id: ObjectId
    activity_type: ActivityType
    estimated_duration_minutes: int
    rules: ActivityRules
    recommendation_priority: int
    recommendation_context: List[str]
    is_active: bool
    task_template: dict

# CalendarDay model
class CalendarDay:
    id: ObjectId
    child_id: ObjectId
    date: date
    day_types: List[DayType]
    is_special_day: bool
    special_event: Optional[str]
    cancelled_routines: List[ObjectId]
    added_tasks: List[ObjectId]
    unavailable_blocks: List[TimeBlock]

# Enums
class DayType(str, Enum):
    SCHOOL_DAY = "SCHOOL_DAY"
    WEEKEND = "WEEKEND"
    HOLIDAY = "HOLIDAY"
    SPECIAL_EVENT = "SPECIAL_EVENT"

class ObligationLevel(str, Enum):
    MUST_DO = "MUST_DO"
    SHOULD_DO = "SHOULD_DO"
    OPTIONAL = "OPTIONAL"
```

## Services Updates

### New Services Needed

#### RoutineService
```python
- create_routine(parent_id, child_id, routine_data)
- update_routine(routine_id, updates)
- pause_routine(routine_id, paused_until)
- delete_routine(routine_id)
- get_routines_by_child(child_id)
- generate_task_instances(routine_id, date)  # called by cron
```

#### ActivityService
```python
- create_activity(parent_id, child_id, activity_data)
- update_activity(activity_id, updates)
- delete_activity(activity_id)
- get_activities_by_child(child_id)
- get_available_activities(child_id, current_time, context)  # for AI
- convert_activity_to_task(activity_id, scheduled_for)
```

#### CalendarService
```python
- set_day_type(child_id, date, day_types)
- mark_special_day(child_id, date, event_name)
- cancel_routines_for_day(child_id, date, routine_ids)
- add_tasks_for_day(child_id, date, task_ids)
- get_calendar_month(child_id, year, month)
- get_day_schedule(child_id, date)
```

#### TaskGenerationService (new)
```python
- generate_daily_tasks(child_id, date)  # main cron job
- rollover_incomplete_tasks(child_id, date)  # evening cron
- apply_day_overrides(child_id, date)
```

### Updated TaskService Methods

```python
# Enhanced completion
def complete_task(task_id, completed_by, tracked=True, note=None):
    """
    Complete task with flexible tracking.

    Args:
        task_id: Task ID
        completed_by: "CHILD" or "PARENT"
        tracked: False if retroactive completion
        note: Optional completion note
    """

# New cancellation
def cancel_task(task_id, cancelled_by, reason=None):
    """Cancel specific task instance"""

# Rollover
def create_rollover_task(original_task_id, new_date):
    """Create rolled-over instance for next day"""
```

## API Endpoints Updates

### New Endpoints

```
# Routines
POST   /api/routines                 # Create routine
GET    /api/routines?child_id={id}   # List routines
PUT    /api/routines/{id}             # Update routine
DELETE /api/routines/{id}             # Delete routine
POST   /api/routines/{id}/pause       # Pause temporarily

# Activities
POST   /api/activities                # Create activity
GET    /api/activities?child_id={id}  # List activities
PUT    /api/activities/{id}            # Update activity
DELETE /api/activities/{id}            # Delete activity
POST   /api/activities/{id}/convert   # Convert to task

# Calendar
GET    /api/calendar/{child_id}/{year}/{month}  # Month view
PUT    /api/calendar/{child_id}/{date}          # Set day properties
POST   /api/calendar/{child_id}/{date}/cancel-routines
POST   /api/calendar/{child_id}/{date}/add-tasks

# AI Recommendations
GET    /api/recommendations/activities?child_id={id}&time={time}
```

### Updated Endpoints

```
# Task completion with new parameters
POST /api/tasks/{id}/complete
Body: {
  "completed_by": "CHILD" | "PARENT",
  "tracked": true,  # false for retroactive
  "completion_note": "optional"
}

# Task cancellation
POST /api/tasks/{id}/cancel
Body: {
  "cancelled_by": "PARENT",
  "reason": "Child is sick"
}
```

## Migration Strategy

### Phase 1: Add New Models (Non-breaking)
- Add Routine, Activity, CalendarDay models
- Add new fields to Task (all optional)
- No changes to existing APIs

### Phase 2: Implement Core Services
- RoutineService, ActivityService, CalendarService
- TaskGenerationService (cron jobs)
- Test thoroughly in isolation

### Phase 3: Update APIs
- Add new endpoints
- Update task completion endpoint
- Maintain backward compatibility

### Phase 4: Frontend Updates
- Routine management UI
- Activity pool UI
- Calendar view
- Enhanced task completion UI

### Phase 5: Enable Features Gradually
- Start with simple routines (daily)
- Add rollover logic
- Enable activity recommendations
- Full calendar features

## Testing Strategy

### Unit Tests
- [ ] Routine generation logic
- [ ] Rollover calculation
- [ ] Day type filtering
- [ ] Activity rule validation
- [ ] Completion type handling

### Integration Tests
- [ ] Daily task generation cron
- [ ] Rollover cron
- [ ] Calendar override effects
- [ ] Activity recommendation filtering

### E2E Tests
- [ ] Create routine → tasks generated
- [ ] Incomplete task → rolls over
- [ ] Special day → routines cancelled
- [ ] Activity recommendation flow
- [ ] Retroactive completion

## Open Questions for Discussion

1. **Rollover limit behavior**: When rollover_limit reached, should task:
   - Auto-cancel with notification to parent?
   - Stay in backlog but not auto-rollover?
   - Ask parent for decision?

2. **Activity usage tracking**: Should we track:
   - How many times activity done per day/week?
   - Completion history for activities?
   - Or keep activities truly flexible with no history?

3. **Points calculation**: How to handle points for:
   - Rolled-over tasks (reduced points)?
   - Retroactive completions (different points)?
   - Activities vs tasks?

4. **Routine conflicts**: If two routines generate tasks that exceed available time:
   - Auto-prioritize by obligation_level?
   - Alert parent?
   - Let AI suggest rescheduling?

5. **Special day behavior**: When marking special event:
   - Cancel ALL routines by default, parent opts back in?
   - Keep ALL routines by default, parent opts out?
   - Preset templates (e.g., "Holiday" cancels homework)?

## Next Steps

1. **Review & Discuss**: Review this design with team/stakeholders
2. **Prioritize Features**: Decide MVP subset (maybe skip activities initially?)
3. **Create Models**: Implement Routine, Activity, CalendarDay
4. **Build Services**: Core business logic
5. **Add APIs**: Expose via REST
6. **Update Tests**: Comprehensive test coverage
7. **Frontend**: UI for new features

---

**Document Version**: 1.0
**Last Updated**: 2025-11-10
**Status**: Draft for Review
