# Cross-Night Task Handling - Revised Design

## The Core Problem

When a recurring task has saved progress from a previous day, we need to answer:
**"Should the child continue the old work, or start fresh for today?"**

---

## Key Insight: Task Instance Independence

### Principle
**Each scheduled instance of a recurring task is independent.**

Even if it's the "same" task (same title, same template), each day's instance should be treated as separate work.

---

## Revised Rules

### 1. Recurring Tasks = Separate Instances

```python
# Backend model
class Task:
    source_recurring_task_id: Optional[PyObjectId] = None  # Link to recurring parent
    scheduled_date: Optional[datetime] = None  # THIS instance is for this date
    is_recurring: bool = False  # Is this a recurring template?
```

**Key concept:**
- The **recurring task definition** (template) lives in one document
- Each **occurrence** (Mon, Tue, Wed) is a separate Task instance
- Each instance has its own `scheduled_date` and `progress_state`

### 2. Task Generation on Schedule

When a recurring task is created, instances are generated:

```
Recurring Task: "Daily Writing" (is_recurring=True, recurrence_pattern="FREQ=DAILY")
                        ↓
              Generates instances:
                        ↓
    ┌───────────────────┼───────────────────┐
    ↓                   ↓                   ↓
Monday Instance    Tuesday Instance    Wednesday Instance
(scheduled_date=   (scheduled_date=    (scheduled_date=
 2025-12-01)        2025-12-02)         2025-12-03)
```

Each instance is **independent** with its own:
- `_id` (different MongoDB document)
- `scheduled_date`
- `status`
- `progress_state`
- `completion_count`

### 3. Progress Never Crosses Dates

```
Monday's instance:
  - Kid starts writing about Monday
  - Saves progress: "Today I went to the park..."
  - Doesn't complete
  → This progress stays with Monday's instance
  → Monday's instance status = IN_PROGRESS

Tuesday (next day):
  - Tuesday's instance appears (SEPARATE document)
  - Fresh start, no progress
  - Kid writes about Tuesday
  → Two independent writings

Nightly Job (midnight):
  - Monday's instance: Check status
    → Still IN_PROGRESS with no completion
    → Mark as SKIPPED or keep for later review
```

---

## Revised Cross-Night Rules

### Scenario A: Recurring Task, In-Progress on Day 1

```
Monday Instance (_id: 123):
  scheduled_date: 2025-12-01
  status: IN_PROGRESS
  progress_state: { title: "My Day", content: "Today I went to..." }

Tuesday Instance (_id: 456):  ← DIFFERENT DOCUMENT
  scheduled_date: 2025-12-02
  status: PENDING
  progress_state: null
```

**Midnight Cleanup:**
```python
# Monday's instance
if monday_task.status == "in_progress" and monday_task.scheduled_date < today:
    # Option 1: Mark as incomplete (SKIPPED)
    monday_task.status = "skipped"

    # Option 2: Keep for review (let parent decide)
    monday_task.status = "needs_review"

    # Option 3: Auto-archive with partial work
    # (Store progress as draft completion)
```

**Tuesday's instance:**
```python
# Completely independent - fresh start
tuesday_task.status = "pending"
tuesday_task.progress_state = None
```

---

## Implementation Changes

### 1. Current Backend Issue

Let me check how recurring tasks are currently handled:

**Current (WRONG if using single document):**
```python
# If using single Task document with is_recurring=True
# Problem: Only one progress_state field
# Monday and Tuesday would share the same progress!
```

**Correct (Need to verify implementation):**
```python
# Each day gets a separate Task instance
# Generated from the recurring template
```

### 2. Task Generation Strategy

#### **Option A: Virtual Instances (Current?)**
- Recurring task stored once
- Instances generated on-the-fly when viewing calendar
- Problem: Hard to track per-day progress

#### **Option B: Materialized Instances (Recommended)**
- When recurring task is created, generate instances for next 30 days
- Each instance is a real MongoDB document
- Each has independent progress_state

**Recommended: Hybrid Approach**
```python
# Recurring task definition (template)
recurring_task = {
    "_id": ObjectId("parent_123"),
    "is_recurring": True,
    "recurrence_pattern": "FREQ=DAILY",
    "is_virtual": True,  # This is the template
}

# When child views task list for a specific date:
# 1. Check if instance exists for that date
monday_instance = await tasks_collection.find_one({
    "source_recurring_task_id": ObjectId("parent_123"),
    "scheduled_date": "2025-12-01"
})

# 2. If not found, materialize it
if not monday_instance:
    monday_instance = await materialize_recurring_task(
        recurring_task_id="parent_123",
        scheduled_date="2025-12-01"
    )
    # Creates NEW document with new _id
```

### 3. Child Portal View Logic

```tsx
// When child views task list for TODAY
const tasks = useTasksForDate(childId, today);

// Backend returns:
// - All one-time tasks scheduled for today
// - All materialized recurring instances for today
// Each has independent progress_state
```

---

## Edge Cases Handled

### Edge Case 1: Multi-Day Writing Project

**Question:** What if a task is SUPPOSED to continue across days?

**Answer:**
- Don't use daily recurrence
- Use a single task with a multi-day duration
- Or use a "Project" task type (future feature)

**Current Workaround:**
```python
# Don't set is_recurring=True
# Instead, use deadline or time window
task = {
    "title": "Write Essay (3 days)",
    "scheduled_date": "2025-12-01",
    "deadline": "2025-12-03",
    "is_recurring": False,  # Single task, not recurring
}

# This task persists across days until deadline
```

### Edge Case 2: Kid Wants to Finish Yesterday's Work

**Scenario:**
```
Monday: Kid writes half an essay, doesn't finish
Tuesday: Kid wants to finish Monday's essay (not start fresh)
```

**Solution: Manual Review Mode**

Add to parent portal:
```tsx
// Parent can see incomplete IN_PROGRESS tasks
<TaskCard
  task={mondayTask}
  status="In Progress (Unfinished)"
  actions={[
    "Mark as Complete (save draft)",
    "Extend to Today (let child finish)",
    "Mark as Skipped"
  ]}
/>

// If parent chooses "Extend to Today":
await extendTaskToToday(mondayTask._id);
// Changes scheduled_date to today
// Child can now continue working on it
```

### Edge Case 3: Template with Multi-Completion

**Scenario:**
```
Daily Math: max_completions=3 per day
Monday:
  - Attempt 1: COMPLETED
  - Attempt 2: IN_PROGRESS (5/10 questions)
Tuesday: New day, new instance
```

**Behavior:**
```python
# Monday instance
monday_task = {
    "_id": ObjectId("mon_123"),
    "scheduled_date": "2025-12-01",
    "max_completions_per_period": 3,
    "completion_count": 1,  # One completed
    "progress_state": { "answers": {...}, "current_attempt": 2 },
    "status": "in_progress"
}

# Tuesday instance (INDEPENDENT)
tuesday_task = {
    "_id": ObjectId("tue_456"),
    "scheduled_date": "2025-12-02",
    "max_completions_per_period": 3,
    "completion_count": 0,  # Fresh start
    "progress_state": null,
    "status": "pending"
}

# Nightly job:
# Monday instance had 1 completion → Mark as COMPLETED (partial success)
# Don't carry attempt 2 progress to Tuesday
```

---

## Revised Nightly Cleanup Logic

```python
async def reconcile_task_states():
    """Run at midnight to clean up previous day's tasks."""

    today = datetime.now().date()
    yesterday = today - timedelta(days=1)

    # Find tasks scheduled for yesterday
    yesterday_tasks = await tasks_collection.find({
        "scheduled_date": {
            "$gte": datetime.combine(yesterday, time.min),
            "$lt": datetime.combine(today, time.min)
        }
    })

    for task_doc in yesterday_tasks:
        task = Task(**task_doc)

        # Rule 1: Non-multi-completion task still IN_PROGRESS
        if task.max_completions_per_period is None:
            if task.status == "in_progress":
                # Option A: Auto-skip
                await mark_task_skipped(task.id)

                # Option B: Save as draft (if has progress)
                if task.progress_state:
                    await save_draft_completion(task.id, task.progress_state)
                await mark_task_skipped(task.id)

        # Rule 2: Multi-completion task
        else:
            completion_count = await get_completion_count(
                task.id,
                yesterday.isoformat()
            )

            if completion_count > 0:
                # Had at least one completion - success
                await mark_task_completed(task.id)
            else:
                # No completions - skip
                await mark_task_skipped(task.id)

            # Always clear progress_state (doesn't carry to next day)
            await clear_progress(task.id)

async def save_draft_completion(task_id, progress_state):
    """Save incomplete work as draft completion."""
    await completions_collection.insert_one({
        "task_id": task_id,
        "status": "draft",  # Special status for incomplete work
        "detailed_data": progress_state,
        "completed_at": utcnow(),
        "is_complete": False
    })
```

---

## UI Changes

### Child Portal

#### Monday Evening (11:50 PM):
```tsx
<TaskCard task={mondayTask}>
  <Title>Daily Writing</Title>
  <Status>In Progress</Status>
  <Progress>Draft saved (150 words)</Progress>
  <Buttons>
    <ContinueButton />  // Still can work on it
  </Buttons>
</TaskCard>
```

#### Tuesday Morning (8:00 AM):
```tsx
// Monday's task (yesterday)
<TaskCard task={mondayTask}>
  <Title>Daily Writing (Yesterday)</Title>
  <Status>Incomplete</Status>
  <Badge>Needs Review</Badge>
  <Buttons>
    <ViewDraftButton />  // See what was written
  </Buttons>
</TaskCard>

// Tuesday's task (today) - SEPARATE CARD
<TaskCard task={tuesdayTask}>
  <Title>Daily Writing</Title>
  <Status>Pending</Status>
  <Buttons>
    <StartButton />  // Fresh start for today
  </Buttons>
</TaskCard>
```

### Parent Portal

```tsx
<IncompleteTasksPanel>
  <TaskCard task={mondayTask}>
    <Title>Daily Writing - Monday</Title>
    <Status>Draft Saved</Status>
    <Preview>Kid wrote 150 words about the park...</Preview>
    <Actions>
      <SaveAsDraftButton />  // Keep as is
      <ExtendToTodayButton />  // Let child finish today
      <MarkSkippedButton />  // Discard
    </Actions>
  </TaskCard>
</IncompleteTasksPanel>
```

---

## Database Schema Validation

### Required Fields for Task Document

```python
class Task(BaseModel):
    # Instance identification
    _id: PyObjectId  # UNIQUE per instance
    scheduled_date: datetime  # UNIQUE per instance

    # Recurring task linkage
    is_recurring: bool = False  # Is this a recurring TEMPLATE?
    source_recurring_task_id: Optional[PyObjectId] = None  # Link to parent

    # Progress (UNIQUE per instance)
    status: TaskStatus
    progress_state: Optional[Dict[str, Any]] = None
    completion_count: int = 0

    # Multi-completion (RESET per instance)
    max_completions_per_period: Optional[int] = None
```

### Verify Current Implementation

Need to check:
1. Are recurring tasks generating separate instances?
2. Or is there one task document with recurrence_pattern?

**If current implementation uses single document:**
→ Need to migrate to instance-based approach

**If current implementation already uses instances:**
→ Just need to ensure nightly cleanup doesn't cross dates

---

## Migration Plan

### Step 1: Verify Current Behavior

```python
# Check how recurring tasks are stored
recurring_task = await tasks_collection.find_one({"is_recurring": True})

# Check if instances exist
instances = await tasks_collection.find({
    "source_recurring_task_id": recurring_task["_id"]
})

# Result:
# - If instances.count > 0: Already using instances ✅
# - If instances.count == 0: Need to implement instance generation ❌
```

### Step 2: Implement Instance Generation (if needed)

```python
async def materialize_recurring_instance(
    recurring_task_id: str,
    scheduled_date: date
) -> Task:
    """Create a concrete instance for a specific date."""

    # Get the recurring template
    template = await tasks_collection.find_one({"_id": ObjectId(recurring_task_id)})

    # Create new instance
    instance = {
        **template,
        "_id": ObjectId(),  # NEW ID
        "scheduled_date": datetime.combine(scheduled_date, time.min),
        "source_recurring_task_id": ObjectId(recurring_task_id),
        "is_recurring": False,  # This is an instance, not template
        "status": "pending",
        "progress_state": None,
        "completion_count": 0,
    }

    await tasks_collection.insert_one(instance)
    return Task(**instance)
```

### Step 3: Update Task List Query

```python
@router.get("/tasks/date/{date}")
async def get_tasks_for_date(date: str, child_id: str):
    """Get all tasks for a specific date."""

    target_date = datetime.fromisoformat(date)

    # Get one-time tasks
    one_time_tasks = await tasks_collection.find({
        "child_id": ObjectId(child_id),
        "scheduled_date": target_date,
        "is_recurring": False
    })

    # Get recurring task templates
    recurring_templates = await tasks_collection.find({
        "child_id": ObjectId(child_id),
        "is_recurring": True,
        # Check if recurrence pattern includes target_date
    })

    # For each recurring template, get or create instance
    instances = []
    for template in recurring_templates:
        instance = await get_or_create_instance(template["_id"], target_date)
        instances.append(instance)

    return one_time_tasks + instances
```

---

## Summary

### The Fix

**Problem:** My original design would force kids to continue yesterday's work or lose it.

**Solution:** Each scheduled instance is independent.
- Monday's writing stays with Monday's instance
- Tuesday's writing starts fresh on Tuesday's instance
- Incomplete Monday work is saved as "draft" for parent review

### Key Changes

1. **Instance Independence**
   - Each day = separate Task document
   - Each has own `_id`, `progress_state`, `status`

2. **Nightly Cleanup**
   - Mark incomplete tasks as SKIPPED or NEEDS_REVIEW
   - Save progress as draft completion
   - Don't carry progress to next day

3. **Parent Controls**
   - Can review incomplete drafts
   - Can extend task to today if appropriate
   - Can save as draft for future reference

### This Allows

✅ Kid writes about Monday on Monday
✅ Kid writes about Tuesday on Tuesday (fresh start)
✅ Parent can review incomplete Monday writing
✅ Each day's work is independent
✅ No confusion about which day's writing to continue

---

## Next Steps

1. **Verify** current recurring task implementation
2. **Implement** instance generation if needed
3. **Add** draft completion saving
4. **Build** parent review UI for incomplete tasks
