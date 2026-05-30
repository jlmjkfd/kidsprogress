# Cross-Night Task Handling - Final Design v3

## Executive Summary

**Key Changes from v2:**
1. ✅ Kids can continue yesterday's unfinished work **without** parent permission
2. ✅ Timeline shows tasks based on **original scheduled date** + **extended status**
3. ✅ Clear visual distinction between "today's tasks" and "yesterday's unfinished work"

---

## Core Principle: Child Autonomy

**Kids should have the freedom to:**
- Continue yesterday's work if they want
- Start fresh today if they prefer
- See both options clearly

**Parents are informed, but don't need to approve.**

---

## 1. Instance-Based Architecture (Same as v2)

Each day's recurring task = separate instance:

```
"Daily Writing" Recurring Template
        ↓
┌──────────────────┬──────────────────┬──────────────────┐
│  Monday Instance │ Tuesday Instance │Wednesday Instance│
│  _id: mon_123    │  _id: tue_456    │  _id: wed_789    │
│  scheduled: Mon  │  scheduled: Tue  │  scheduled: Wed  │
│  progress: {...} │  progress: null  │  progress: null  │
└──────────────────┴──────────────────┴──────────────────┘
```

---

## 2. Cross-Night Behavior: Keep Unfinished Tasks Available

### 2.1 Nightly Job - NO Auto-Skipping

**OLD (v2 approach - Too Aggressive):**
```python
# Midnight: Auto-skip incomplete tasks ❌
if task.status == "in_progress":
    task.status = "skipped"
```

**NEW (v3 approach - Child Decides):**
```python
# Midnight: Keep incomplete tasks available
if task.status == "in_progress":
    # Don't change status
    # Just flag it as "from yesterday"
    await tasks_collection.update_one(
        {"_id": task.id},
        {
            "$set": {
                "is_carried_over": True,
                "carried_over_from": task.scheduled_date
            }
        }
    )
```

### 2.2 Task States After Midnight

```
Monday Night (11:59 PM):
┌──────────────────────────────┐
│ Daily Writing (Monday)       │
│ Status: IN_PROGRESS          │
│ Progress: "I went to park"   │
│ scheduled_date: 2025-12-01   │
└──────────────────────────────┘

Tuesday Morning (00:01 AM):
┌──────────────────────────────┐
│ Daily Writing (Monday) ⏰    │  ← From yesterday
│ Status: IN_PROGRESS          │
│ Progress: "I went to park"   │
│ scheduled_date: 2025-12-01   │
│ is_carried_over: True        │
└──────────────────────────────┘

┌──────────────────────────────┐
│ Daily Writing (Tuesday) ✨   │  ← Today's fresh task
│ Status: PENDING              │
│ Progress: null               │
│ scheduled_date: 2025-12-02   │
└──────────────────────────────┘
```

---

## 3. Child Portal UI Design

### 3.1 Task List Sections

Show tasks in **3 sections** on Tuesday:

```tsx
<TaskList date="2025-12-02">
  {/* Section 1: Unfinished from Yesterday */}
  {carriedOverTasks.length > 0 && (
    <Section>
      <SectionHeader>
        <Icon>⏰</Icon>
        <Title>From Yesterday</Title>
        <Badge>{carriedOverTasks.length}</Badge>
      </SectionHeader>

      {carriedOverTasks.map(task => (
        <TaskCard
          task={task}
          variant="carried-over"
          showOriginalDate={true}
        >
          <DateBadge>Monday's task</DateBadge>
          <Title>Daily Writing</Title>
          <Progress>Draft saved: 150 words</Progress>
          <Actions>
            <ContinueButton>Continue Writing</ContinueButton>
            <ArchiveButton>Mark as Done</ArchiveButton>
          </Actions>
        </TaskCard>
      ))}
    </Section>
  )}

  {/* Section 2: Today's Tasks */}
  <Section>
    <SectionHeader>
      <Icon>✨</Icon>
      <Title>Today - Tuesday, December 2</Title>
    </SectionHeader>

    {todaysTasks.map(task => (
      <TaskCard task={task} variant="today">
        <Title>Daily Writing</Title>
        <Status>Pending</Status>
        <Actions>
          <StartButton>Start Writing</StartButton>
        </Actions>
      </TaskCard>
    ))}
  </Section>

  {/* Section 3: Completed Today */}
  <Section>
    <SectionHeader>
      <Icon>✅</Icon>
      <Title>Completed</Title>
    </SectionHeader>
    {/* ... */}
  </Section>
</TaskList>
```

### 3.2 Visual Design

```
┌─────────────────────────────────────────────┐
│ ⏰ From Yesterday                      (1)  │
├─────────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐     │
│ │ 📝 Daily Writing                    │     │
│ │ [Monday's task]                     │     │
│ │ ━━━━━━━━━ 60% complete             │     │
│ │ Draft: "I went to the park..."      │     │
│ │                                     │     │
│ │ [Continue Writing] [Mark as Done]   │     │
│ └─────────────────────────────────────┘     │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ ✨ Today - Tuesday, December 2              │
├─────────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐     │
│ │ 📝 Daily Writing                    │     │
│ │ Fresh start for today               │     │
│ │                                     │     │
│ │ [Start Writing]                     │     │
│ └─────────────────────────────────────┘     │
│                                             │
│ ┌─────────────────────────────────────┐     │
│ │ 🧮 Math Practice                    │     │
│ │ 0/3 attempts                        │     │
│ │                                     │     │
│ │ [Start Practice]                    │     │
│ └─────────────────────────────────────┘     │
└─────────────────────────────────────────────┘
```

---

## 4. Timeline Display

### 4.1 Timeline Principles

**Timeline shows tasks by their SCHEDULED date, not current status**

```
Timeline for Week:
┌────────┬────────┬────────┬────────┐
│  Mon   │  Tue   │  Wed   │  Thu   │
├────────┼────────┼────────┼────────┤
│ Writing│ Writing│ Writing│ Writing│
│ ✓ Done │ ⏰ From│ Pending│ Pending│
│        │   Mon  │        │        │
│        │--------|        │        │
│        │ Writing│        │        │
│        │ Pending│        │        │
└────────┴────────┴────────┴────────┘
```

### 4.2 Timeline Implementation

#### **Week View**

```tsx
<WeekTimeline>
  {daysOfWeek.map(day => (
    <DayColumn date={day}>
      <DayHeader>
        {formatDate(day)}
      </DayHeader>

      {/* Tasks SCHEDULED for this day */}
      {getTasksScheduledFor(day).map(task => (
        <TimelineTaskCard
          task={task}
          isCarriedOver={task.is_carried_over}
          isFromFuture={task.scheduled_date > today}
        >
          {/* Visual indicators */}
          {task.scheduled_date < today && task.status !== 'completed' && (
            <OverdueBadge>⏰ Unfinished</OverdueBadge>
          )}

          {task.scheduled_date === today && (
            <TodayBadge>✨ Today</TodayBadge>
          )}

          {task.status === 'completed' && (
            <CompletedBadge>✅ Done</CompletedBadge>
          )}
        </TimelineTaskCard>
      ))}
    </DayColumn>
  ))}
</WeekTimeline>
```

#### **Example: Tuesday's Timeline Column**

```
Tuesday, Dec 2
┌─────────────────────┐
│ 📝 Writing (Mon) ⏰ │  ← Originally scheduled Mon, now carried over
│ In Progress         │
│ Original: Monday    │
└─────────────────────┘

┌─────────────────────┐
│ 📝 Writing (Tue) ✨ │  ← Scheduled for Tuesday
│ Pending             │
│ Today's task        │
└─────────────────────┘

┌─────────────────────┐
│ 🧮 Math Practice ✨ │
│ 0/3 attempts        │
└─────────────────────┘
```

### 4.3 Timeline Query Logic

```python
@router.get("/timeline/{date}")
async def get_timeline_for_date(date: str, child_id: str):
    """Get timeline view for a specific date."""

    target_date = datetime.fromisoformat(date)

    # Tasks originally scheduled for this date
    scheduled_tasks = await tasks_collection.find({
        "child_id": ObjectId(child_id),
        "scheduled_date": target_date,
    })

    # Tasks carried over TO this date (originally from earlier)
    carried_over_tasks = await tasks_collection.find({
        "child_id": ObjectId(child_id),
        "scheduled_date": {"$lt": target_date},  # Original date is before
        "status": {"$in": ["in_progress", "paused"]},  # Still active
        "is_carried_over": True
    })

    return {
        "scheduled": scheduled_tasks,  # Show in timeline column for original date
        "active": scheduled_tasks + carried_over_tasks  # Show in "today's tasks"
    }
```

---

## 5. Auto-Archiving Rules

### 5.1 When to Auto-Archive Carried-Over Tasks

**Don't keep tasks forever.** Auto-archive after a reasonable period:

```python
# Nightly job
async def cleanup_stale_tasks():
    """Archive tasks that have been carried over too long."""

    # Rule 1: After 3 days, auto-archive incomplete tasks
    three_days_ago = datetime.now() - timedelta(days=3)

    stale_tasks = await tasks_collection.find({
        "status": {"$in": ["in_progress", "paused"]},
        "scheduled_date": {"$lt": three_days_ago},
        "is_carried_over": True
    })

    for task in stale_tasks:
        # Save progress as draft completion
        if task.progress_state:
            await save_as_draft(task._id, task.progress_state)

        # Archive the task
        await tasks_collection.update_one(
            {"_id": task._id},
            {
                "$set": {
                    "status": "archived",
                    "archived_reason": "auto_archived_after_3_days"
                }
            }
        )
```

### 5.2 Manual Archiving

Kid can manually archive:

```tsx
<TaskCard task={yesterdayTask}>
  <Title>Daily Writing (Monday)</Title>
  <Actions>
    <ContinueButton>Continue</ContinueButton>
    <ArchiveButton onClick={handleArchive}>
      Done with this
    </ArchiveButton>
  </Actions>
</TaskCard>

const handleArchive = async () => {
  // Save progress as draft
  await saveTaskAsDraft(task._id);

  // Mark as archived
  await archiveTask(task._id);

  // Remove from "From Yesterday" section
};
```

---

## 6. Parent Portal Visibility

### 6.1 Parent Dashboard

Parents see **aggregated view**:

```tsx
<ParentDashboard>
  <Section>
    <Title>Ongoing Tasks</Title>

    <TaskList>
      {/* Show carried-over tasks with age */}
      <TaskRow>
        <TaskName>Daily Writing</TaskName>
        <ScheduledDate>Mon, Dec 1</ScheduledDate>
        <Status>In Progress (1 day ago)</Status>
        <Progress>60% complete</Progress>
      </TaskRow>
    </TaskList>
  </Section>

  <Section>
    <Title>Completion Rate</Title>
    <WeeklyChart>
      {/* Shows completed vs incomplete */}
      Mon: 5/6 completed (1 carried over)
      Tue: 6/6 completed
      Wed: ...
    </WeeklyChart>
  </Section>
</ParentDashboard>
```

### 6.2 Notification Preferences

Parent can configure:

```tsx
<NotificationSettings>
  <Setting>
    <Label>Notify me when tasks are carried over for more than:</Label>
    <Select value={2}>
      <Option value={1}>1 day</Option>
      <Option value={2}>2 days</Option>
      <Option value={3}>3 days</Option>
      <Option value={7}>1 week</Option>
    </Select>
  </Setting>

  <Setting>
    <Checkbox checked={true}>
      Auto-archive tasks after 3 days of no progress
    </Checkbox>
  </Setting>
</NotificationSettings>
```

---

## 7. Complete Workflows

### 7.1 Scenario: Kid Continues Yesterday's Writing

```
Monday 8:00 PM:
- Kid starts "Daily Writing" for Monday
- Writes: "Today I went to the park with my friend..."
- Doesn't finish, closes app
- Status: IN_PROGRESS, progress saved

Midnight (00:00):
- Nightly job runs
- Detects Monday's writing is IN_PROGRESS
- Sets is_carried_over=True
- Keeps status=IN_PROGRESS

Tuesday 7:00 AM:
- Kid opens app
- Sees TWO writing tasks:

  [From Yesterday Section]
  📝 Daily Writing (Monday's task)
  Progress: 150 words
  [Continue Writing] [Mark as Done]

  [Today Section]
  📝 Daily Writing (Fresh start)
  [Start Writing]

- Kid clicks "Continue Writing" on Monday's task
- Opens execution page with Monday's content
- Adds: "...We played on the swings and had ice cream."
- Clicks Submit
- Status changes to COMPLETED
- Task moves to "Completed" section
```

### 7.2 Scenario: Kid Starts Fresh, Ignores Yesterday

```
Tuesday 7:00 AM:
- Kid sees both tasks
- Decides to start fresh (wants to write about Tuesday)
- Clicks "Start Writing" on Tuesday's task
- Writes new content about Tuesday
- Monday's task remains in "From Yesterday"

Wednesday 7:00 AM:
- Monday's task still there (2 days old)
- Kid clicks "Mark as Done"
- System saves Monday's draft
- Archives Monday's task
- Shows only Tuesday and Wednesday tasks
```

### 7.3 Scenario: Multi-Completion Task Carried Over

```
Monday:
- Math Practice (max 3 attempts)
- Attempt 1: COMPLETED ✓
- Attempt 2: IN_PROGRESS (5/10 questions)
- Status: IN_PROGRESS

Tuesday:
- Shows in "From Yesterday":
  🧮 Math Practice (Monday)
  1/3 completed, 1 in progress
  [Continue Attempt 2] [Start New Attempt] [Done]

- Shows in "Today":
  🧮 Math Practice (Tuesday - Fresh)
  0/3 attempts
  [Start Practice]

If kid continues Monday's Attempt 2:
- Completes it → Monday task now 2/3
- Can start Attempt 3 on Monday's instance
- Or switch to Tuesday's fresh instance
```

---

## 8. Timeline Display - Detailed Examples

### 8.1 Week Timeline with Carried-Over Tasks

```
        Mon         Tue         Wed         Thu
      ─────────────────────────────────────────
08:00 │ Writing   │ Writing   │ Writing   │   │
      │ ✓ Done    │ ✨ Today  │ Pending   │   │
      │           │           │           │   │
09:00 │ Math      │ Math      │ Math      │   │
      │ ✓ 3/3     │ ⏰ From   │ Pending   │   │
      │           │   Mon     │           │   │
      │           │   1/3     │           │   │
      │           │-----------│           │   │
      │           │ Math      │           │   │
      │           │ ✨ Today  │           │   │
      │           │ 0/3       │           │   │
```

**Legend:**
- ✓ = Completed
- ✨ = Scheduled for today
- ⏰ = Carried over from earlier date
- Original scheduled date shown in column header

### 8.2 Day View with Time Slots

```
Tuesday, December 2

⏰ From Yesterday
┌────────────────────────────────┐
│ 08:00 AM - Math Practice       │
│ Originally: Monday             │
│ Status: 1/3 completed          │
│ [Continue] [Archive]           │
└────────────────────────────────┘

✨ Today's Schedule
┌────────────────────────────────┐
│ 08:00 AM - Writing             │
│ Scheduled: Tuesday             │
│ Status: Pending                │
│ [Start]                        │
├────────────────────────────────┤
│ 09:00 AM - Math Practice       │
│ Scheduled: Tuesday             │
│ Status: 0/3 attempts           │
│ [Start]                        │
├────────────────────────────────┤
│ 02:00 PM - Reading             │
│ Scheduled: Tuesday             │
│ Status: Pending                │
│ [Start]                        │
└────────────────────────────────┘
```

---

## 9. Database Schema Updates

### 9.1 Task Document Fields

```python
class Task(BaseModel):
    _id: PyObjectId
    scheduled_date: datetime  # Original scheduled date (never changes)

    # Carry-over tracking
    is_carried_over: bool = False  # Flagged by nightly job
    carried_over_from: Optional[datetime] = None  # Original scheduled date
    carried_over_at: Optional[datetime] = None  # When it was carried over
    carry_over_count: int = 0  # How many days it's been carried

    # Auto-archive
    auto_archive_after_days: int = 3  # Parent configurable
```

### 9.2 Nightly Job Implementation

```python
async def nightly_task_carryover():
    """Run at midnight to flag carried-over tasks."""

    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday = today - timedelta(days=1)

    # Find tasks scheduled for yesterday that are still active
    active_yesterday_tasks = await tasks_collection.find({
        "scheduled_date": {
            "$gte": yesterday,
            "$lt": today
        },
        "status": {"$in": ["in_progress", "paused"]}
    })

    for task in active_yesterday_tasks:
        # Flag as carried over
        await tasks_collection.update_one(
            {"_id": task["_id"]},
            {
                "$set": {
                    "is_carried_over": True,
                    "carried_over_from": task["scheduled_date"],
                    "carried_over_at": datetime.now(),
                },
                "$inc": {
                    "carry_over_count": 1
                }
            }
        )

    # Auto-archive old carried-over tasks
    auto_archive_threshold = today - timedelta(days=3)

    stale_tasks = await tasks_collection.find({
        "carried_over_at": {"$lt": auto_archive_threshold},
        "status": {"$in": ["in_progress", "paused"]}
    })

    for task in stale_tasks:
        if task.get("progress_state"):
            await save_as_draft_completion(task["_id"], task["progress_state"])

        await tasks_collection.update_one(
            {"_id": task["_id"]},
            {"$set": {"status": "archived", "archived_reason": "auto_archived_stale"}}
        )
```

---

## 10. Frontend Queries

### 10.1 Get Tasks for Today (Including Carried-Over)

```tsx
// Hook for child portal
export function useTasksForToday(childId: string) {
  const today = new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: ['tasks', 'today', childId, today],
    queryFn: async () => {
      const response = await apiClient.get(`/api/tasks/today/${childId}`, {
        params: { date: today }
      });
      return response.data;
    }
  });
}

// Backend endpoint
@router.get("/tasks/today/{child_id}")
async def get_tasks_for_today(child_id: str, date: str):
    today = datetime.fromisoformat(date)

    # Tasks scheduled for today
    todays_tasks = await tasks_collection.find({
        "child_id": ObjectId(child_id),
        "scheduled_date": today,
        "status": {"$ne": "archived"}
    })

    # Tasks carried over from previous days
    carried_over = await tasks_collection.find({
        "child_id": ObjectId(child_id),
        "is_carried_over": True,
        "status": {"$in": ["in_progress", "paused"]},
        "scheduled_date": {"$lt": today}
    })

    return {
        "todays_tasks": list(todays_tasks),
        "carried_over_tasks": list(carried_over),
        "date": date
    }
```

### 10.2 Timeline Query

```tsx
export function useWeekTimeline(childId: string, weekStart: string) {
  return useQuery({
    queryKey: ['timeline', childId, weekStart],
    queryFn: async () => {
      const response = await apiClient.get(`/api/timeline/${childId}`, {
        params: { week_start: weekStart }
      });
      return response.data;
    }
  });
}

// Backend endpoint
@router.get("/timeline/{child_id}")
async def get_week_timeline(child_id: str, week_start: str):
    start = datetime.fromisoformat(week_start)
    end = start + timedelta(days=7)

    # Get all tasks in this week range (by original scheduled date)
    tasks = await tasks_collection.find({
        "child_id": ObjectId(child_id),
        "scheduled_date": {
            "$gte": start,
            "$lt": end
        }
    })

    # Group by original scheduled date
    timeline = {}
    for task in tasks:
        date_key = task["scheduled_date"].strftime("%Y-%m-%d")
        if date_key not in timeline:
            timeline[date_key] = []
        timeline[date_key].append(task)

    return timeline
```

---

## 11. Summary

### Key Decisions

1. ✅ **Child autonomy** - Kids can continue yesterday's work without asking
2. ✅ **Clear sections** - "From Yesterday" vs "Today" in task list
3. ✅ **Timeline integrity** - Show tasks under original scheduled date
4. ✅ **Auto-archive** - Remove stale tasks after 3 days
5. ✅ **Visual clarity** - Badges and sections make it obvious

### Timeline Display Rules

- **Week/Calendar view**: Show task in column for **original scheduled date**
- **Task list view**: Show task in **"From Yesterday"** section with date badge
- **Status badges**: ✨ Today / ⏰ From [Date] / ✅ Completed

### User Experience

**Kid perspective:**
- "I can finish yesterday's writing if I want"
- "Or I can write about today instead"
- "Both options are clear"

**Parent perspective:**
- "I can see what was carried over"
- "I get notified if tasks pile up"
- "System auto-cleans after 3 days"

### Implementation Complexity

- 🟢 **Low** - Database schema (just add 3 fields)
- 🟡 **Medium** - Nightly job (straightforward logic)
- 🟡 **Medium** - UI sections (need good design)
- 🟢 **Low** - Timeline query (filter by scheduled_date)

---

Would you like me to start implementing this design?
