# Task State Management Redesign

## Executive Summary

This document outlines a comprehensive redesign of task state management to address:
1. **Pause button necessity** - Different behavior for regular vs template tasks
2. **Template task completion** - Completion driven by business logic, not manual button
3. **Cross-night state handling** - Clear rules for multi-completion and in-progress tasks

---

## 1. Core Principles

### 1.1 Task Type Distinction

| Feature | Regular Tasks | Template Tasks |
|---------|--------------|----------------|
| **Execution Model** | Simple start → complete | Navigate to execution page |
| **Pause Support** | ✅ Yes (pause/resume) | ❌ No (exit page instead) |
| **Completion Trigger** | ✅ Manual "Complete" button | ✅ Business logic (auto-complete) |
| **Progress Tracking** | ⚠️ Limited (no auto-save) | ✅ Auto-save every 30s |
| **Multi-completion** | ⚠️ Technically supported, UI hidden | ✅ Designed for practice |

### 1.2 State Transitions

```
REGULAR TASK FLOW:
PENDING → (Start) → IN_PROGRESS → (Pause) → PAUSED → (Resume) → IN_PROGRESS → (Complete) → COMPLETED
                                     ↓
                                  (Complete) → COMPLETED

TEMPLATE TASK FLOW:
PENDING → (Start) → Navigate to /execute → Auto-save progress → (Submit/Timer) → Auto-complete → COMPLETED
```

---

## 2. Pause Button Redesign

### 2.1 Decision Matrix

| Task Type | Has template_id? | Show Pause? | Show Execute Button? | Behavior on Start |
|-----------|------------------|-------------|---------------------|-------------------|
| Regular | ❌ No | ✅ Yes | ❌ No | Set status=IN_PROGRESS |
| Template | ✅ Yes | ❌ No | ✅ Yes (if in_progress) | Navigate to /execute |

### 2.2 Child Portal Task Card UI

#### **Regular Task (No Template)**
```tsx
// Status: PENDING
[Start] [Skip]

// Status: IN_PROGRESS
[Pause] [Complete]

// Status: PAUSED
[Resume] [Complete]
```

#### **Template Task**
```tsx
// Status: PENDING
[Start Practice]

// Status: IN_PROGRESS (with saved progress)
[Continue] [Restart]

// Status: COMPLETED (multi-completion enabled)
[Practice Again] [View Results]
```

### 2.3 Implementation Changes

#### File: `frontend/src/pages/child-portal/tasks/components/TaskCard.tsx`

```tsx
// Current logic (simplified)
{task.status === "in_progress" && (
  <button onClick={onPause}>Pause</button>
)}

// NEW logic
{task.status === "in_progress" && (
  task.template_id ? (
    // Template task - navigate to execution page
    <button onClick={() => navigate(`/execute/${task._id}`)}>
      Continue
    </button>
  ) : (
    // Regular task - pause/complete
    <>
      <button onClick={onPause}>Pause</button>
      <button onClick={onComplete}>Complete</button>
    </>
  )
)}
```

---

## 3. Template Task Completion Flow

### 3.1 Completion Trigger: Business Logic Only

Template tasks should **NEVER** show a manual "Complete" button in the task list.

**Completion is triggered by:**
- ✅ `onComplete()` callback in TaskExecutor
- ✅ `setIsComplete(true)` in TaskExecutor
- ✅ Timer expiration (if implemented)
- ✅ Submit button in execution UI
- ❌ ~~Manual complete button in task card~~

### 3.2 Template Developer Guidelines

#### **Required: Implement Completion Logic**

Every `TaskExecutor` component must:

```tsx
export default function TaskExecutor({
  taskId,
  executionData,
  onComplete,      // ← Call this when task is done
  onCancel,        // ← Call this if user exits
  setIsComplete,   // ← Set to true to mark complete
}: TaskExecutorProps) {

  const handleSubmit = async () => {
    // 1. Process completion data
    const completionData = { /* ... */ };

    // 2. Submit to backend
    await onComplete(completionData);

    // 3. Mark task as complete (triggers auto-complete logic)
    setIsComplete(true);
  };

  return (
    <div>
      {/* Task execution UI */}
      <button onClick={handleSubmit}>Submit</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  );
}
```

#### **Backend Handler: Auto-Complete Flag**

```python
# Backend handler
async def should_auto_complete(self, completion: TaskCompletion) -> bool:
    """Return True to auto-complete task after submission."""
    return True  # Most templates should auto-complete
```

### 3.3 Execution Page Behavior

#### **Navigation Flow**

```
Task Card (IN_PROGRESS) → Click "Continue" → /tasks/execute/:taskId
                                                    ↓
                                        Load saved progress
                                                    ↓
                                        Render TaskExecutor
                                                    ↓
                                        [User completes task]
                                                    ↓
                                        onComplete() → setIsComplete(true)
                                                    ↓
                                        Backend marks COMPLETED
                                                    ↓
                                        Redirect to task list
```

#### **Cancel/Exit Behavior**

```tsx
// User exits execution page without completing
const handleCancel = async () => {
  // Progress is already auto-saved every 30s
  // Just navigate back
  navigate(`/child-portal/${childId}/tasks`);

  // Task remains IN_PROGRESS with saved progress_state
};
```

---

## 4. Cross-Night Task State Handling

### 4.1 State Scenarios & Rules

#### **Scenario A: Non-Multi-Completion Task (IN_PROGRESS)**

```
Day 1: Task starts (status=IN_PROGRESS)
       Child answers 5/10 questions
       Closes browser without completing

Day 2 (Next day):
  → Backend detects date change
  → Clears progress_state
  → Sets status=PENDING (reset for new day)
  → Child must start fresh
```

**Rationale:** Non-repeatable tasks should reset daily if not completed.

---

#### **Scenario B: Multi-Completion Task (Partial Progress)**

```
Day 1: max_completions=3
       Attempt 1: COMPLETED ✓
       Attempt 2: IN_PROGRESS (5/10 questions done)
       Closes browser

Day 2 (Next day):
  → Backend checks scheduled_date
  → If scheduled_date is Day 2: Keep task active
  → If scheduled_date was Day 1: Archive/reset

  Sub-cases:
  B1: Task is recurring (appears on Day 2)
      → New instance created for Day 2
      → Day 1 instance archived with partial completion

  B2: Task was one-time (scheduled for Day 1 only)
      → Mark as SKIPPED (incomplete)
      → Clear progress_state
```

---

#### **Scenario C: Multi-Completion Task (First Attempt Not Started)**

```
Day 1: max_completions=3
       Task visible but never started
       status=PENDING

Day 2:
  → If recurring: New instance for Day 2
  → If one-time: Check scheduled_date
      → If past: Mark SKIPPED
      → If today/future: Keep PENDING
```

---

#### **Scenario D: Multi-Completion Task (Completed At Least Once)**

```
Day 1: max_completions=3
       Attempt 1: COMPLETED ✓
       Attempt 2: COMPLETED ✓
       Attempt 3: Not started

Day 2:
  → Task was successfully used (completion_count > 0)
  → If recurring: New instance for Day 2
  → If one-time: Archive as COMPLETED (partial fulfillment counts as success)
```

---

#### **Scenario E: Unlimited Attempts (`max_completions=0`)**

```
Day 1: max_completions=0 (unlimited)
       Attempt 1: COMPLETED ✓
       Attempt 2: COMPLETED ✓
       Attempt 3: IN_PROGRESS

Day 2:
  → Check scheduled_date
  → If recurring: New unlimited instance for Day 2
  → If one-time for Day 1: Archive with completions
  → Current IN_PROGRESS attempt discarded
```

---

### 4.2 Implementation: Nightly Cleanup Job

#### **Backend: Nightly Task State Reconciliation**

Create a new cron job to run at midnight (00:00):

```python
# backend/jobs/task_cleanup.py

async def reconcile_task_states():
    """Run at midnight to clean up cross-night task states."""

    today = datetime.now().date()
    yesterday = today - timedelta(days=1)

    # Find all IN_PROGRESS tasks from yesterday
    in_progress_tasks = await tasks_collection.find({
        "status": "in_progress",
        "scheduled_date": {
            "$lt": datetime.combine(today, time.min)
        }
    })

    for task_doc in in_progress_tasks:
        task = Task(**task_doc)

        # Case 1: Non-multi-completion task
        if task.max_completions_per_period is None:
            # Reset to PENDING, clear progress
            await tasks_collection.update_one(
                {"_id": task.id},
                {
                    "$set": {
                        "status": "pending",
                        "progress_state": None,
                        "progress_saved_at": None
                    }
                }
            )

        # Case 2: Multi-completion task
        else:
            # Check if completed at least once
            completion_count = await completions_collection.count_documents({
                "task_id": task.id,
                "scheduled_date": yesterday.isoformat()
            })

            if completion_count > 0:
                # Had at least one completion - archive as success
                await tasks_collection.update_one(
                    {"_id": task.id},
                    {
                        "$set": {
                            "status": "completed",
                            "progress_state": None
                        }
                    }
                )
            else:
                # No completions - mark as skipped
                await tasks_collection.update_one(
                    {"_id": task.id},
                    {
                        "$set": {
                            "status": "skipped",
                            "progress_state": None
                        }
                    }
                )
```

---

### 4.3 Frontend: Task Start Logic

When child clicks "Start" or "Continue" on a task:

```tsx
// frontend/src/pages/child-portal/tasks/index.tsx

const handleStartTask = async (taskId: string) => {
  const task = tasks.find(t => t._id === taskId);

  // Call backend to start task
  const result = await startTaskMutation.mutateAsync({
    taskId,
    childId,
  });

  // Backend returns:
  // - Updated task object
  // - execution_data (for template tasks)
  // - is_resuming (boolean)

  if (task.template_id) {
    // Template task - navigate to execution page
    navigate(`/child-portal/${childId}/tasks/execute/${taskId}`);
  } else {
    // Regular task - just update status to IN_PROGRESS
    // Task card will show Pause/Complete buttons
  }
};
```

#### **Backend: Start Task Endpoint**

```python
# backend/routes/completion_routes.py

@router.post("/{task_id}/start")
async def start_task(task_id: str, child_id: str, current_user: User):
    task = await tasks_collection.find_one({"_id": ObjectId(task_id)})
    task_obj = Task(**task)

    # Check for stale progress from previous day
    if task_obj.progress_state and task_obj.progress_saved_at:
        saved_date = task_obj.progress_saved_at.date()
        today = datetime.now().date()

        # If progress is from different day than scheduled_date
        if task_obj.scheduled_date:
            scheduled_date = task_obj.scheduled_date.date()
            if saved_date < scheduled_date:
                # Clear stale progress
                task_obj.progress_state = None
                await tasks_collection.update_one(
                    {"_id": ObjectId(task_id)},
                    {"$unset": {"progress_state": "", "progress_saved_at": ""}}
                )

    # Set status to IN_PROGRESS
    await tasks_collection.update_one(
        {"_id": ObjectId(task_id)},
        {"$set": {"status": "in_progress"}}
    )

    # If template task, prepare execution data
    if task_obj.template_id:
        handler = create_handler(task_obj.template_id, task_obj.execution_config)
        execution_data = await handler.prepare_execution(task_id)

        # Merge with saved progress if resuming
        if task_obj.progress_state:
            execution_data = {**execution_data, **task_obj.progress_state}

        return {
            "task": task_obj,
            "execution_data": execution_data,
            "is_resuming": bool(task_obj.progress_state)
        }

    return {"task": task_obj}
```

---

## 5. Complete Workflow Diagrams

### 5.1 Regular Task Workflow

```
┌─────────────┐
│   PENDING   │
└──────┬──────┘
       │ [Start]
       ↓
┌─────────────┐     [Pause]      ┌─────────┐
│ IN_PROGRESS │ ←──────────────→ │ PAUSED  │
└──────┬──────┘                  └────┬────┘
       │                              │
       │ [Complete]    [Resume]       │
       ↓              ────────────────┘
┌─────────────┐
│  COMPLETED  │
└─────────────┘
```

### 5.2 Template Task Workflow

```
┌─────────────┐
│   PENDING   │
└──────┬──────┘
       │ [Start]
       ↓
┌─────────────────────────────────────┐
│  Navigate to /tasks/execute/:id     │
│  TaskExecutor renders                │
│  Auto-save every 30s                 │
└──────────┬──────────────────────────┘
           │
           ├── [Cancel/Exit] ──→ Returns to task list (stays IN_PROGRESS)
           │
           │ [Submit/Timer]
           ↓
┌─────────────────────────────────────┐
│  onComplete() + setIsComplete(true) │
│  Backend auto-completes              │
└──────────┬──────────────────────────┘
           │
           ↓
┌─────────────┐
│  COMPLETED  │ ──→ Multi-completion? ──→ [Practice Again] button
└─────────────┘                               ↓
                                       (Completion count < max)
                                              ↓
                                       Returns to PENDING
```

### 5.3 Cross-Night State Transitions

```
DAY 1 (23:50)                    MIDNIGHT                   DAY 2 (00:05)
┌─────────────┐                    │                      ┌──────────────┐
│IN_PROGRESS  │                    │                      │   PENDING    │
│(Regular)    │                    │  Nightly Job         │ (Fresh start)│
│progress=50% │ ───────────────────┼─────────────────────→│ progress=∅   │
└─────────────┘                    │                      └──────────────┘

DAY 1 (23:50)                    MIDNIGHT                   DAY 2 (00:05)
┌─────────────┐                    │                      ┌──────────────┐
│IN_PROGRESS  │                    │                      │  COMPLETED   │
│(Multi 2/3)  │ completion_count=2 │  Nightly Job         │ (Archived as │
│progress=80% │ ───────────────────┼─────────────────────→│   success)   │
└─────────────┘                    │                      └──────────────┘

DAY 1 (23:50)                    MIDNIGHT                   DAY 2 (00:05)
┌─────────────┐                    │                      ┌──────────────┐
│IN_PROGRESS  │                    │                      │   SKIPPED    │
│(Multi 0/3)  │ completion_count=0 │  Nightly Job         │ (No progress)│
│progress=20% │ ───────────────────┼─────────────────────→│              │
└─────────────┘                    │                      └──────────────┘
```

---

## 6. Child Portal UI Changes

### 6.1 Task Card Buttons (Summary)

| Task Type | Status | Buttons Shown |
|-----------|--------|---------------|
| Regular | PENDING | [Start] |
| Regular | IN_PROGRESS | [Pause] [Complete] |
| Regular | PAUSED | [Resume] [Complete] |
| Regular | COMPLETED | [View] (if has data) |
| Template | PENDING | [Start Practice] |
| Template | IN_PROGRESS | [Continue] [Restart?] |
| Template | COMPLETED (max not reached) | [Practice Again] [View Results] |
| Template | COMPLETED (max reached) | [View Results] |

### 6.2 Multi-Completion Badge

Show progress on task cards:

```tsx
{task.max_completions_per_period && (
  <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
    {task.completion_count || 0} / {task.max_completions_per_period || '∞'}
  </div>
)}
```

---

## 7. Parent Portal Logic

### 7.1 Task Status Visibility

Parents should see:
- ✅ Completion count for multi-completion tasks
- ✅ In-progress indicator (with time started)
- ✅ Skipped tasks (incomplete after deadline)
- ✅ Partial completions (e.g., "2/3 attempts")

### 7.2 Analytics for Multi-Completion Tasks

```tsx
// Parent can see:
- Total attempts across all days
- Average score per attempt
- Progress over time
- Daily completion rate
```

---

## 8. Implementation Checklist

### Phase 1: Core State Logic
- [ ] Remove pause button for template tasks
- [ ] Add "Continue" button for IN_PROGRESS template tasks
- [ ] Update task start logic to navigate to /execute for templates
- [ ] Remove manual "Complete" button for template tasks

### Phase 2: Cross-Night Cleanup
- [ ] Implement nightly cron job for state reconciliation
- [ ] Add progress_state date validation in start endpoint
- [ ] Update task status based on completion_count

### Phase 3: UI Updates
- [ ] Update TaskCard component with new button logic
- [ ] Add multi-completion progress badge
- [ ] Update parent portal analytics

### Phase 4: Template Guidelines
- [ ] Document completion flow in template development guide
- [ ] Add examples for different completion triggers
- [ ] Update existing templates if needed

---

## 9. Template Developer Guidelines Update

Add to `docs/features/task-template-system/guidelines/guide-template-development.md`:

### **Implementing Task Completion**

Your `TaskExecutor` component **MUST** handle completion:

```tsx
// ✅ CORRECT - Call onComplete when done
const handleSubmit = async () => {
  await onComplete(completionData);
  setIsComplete(true); // Triggers auto-complete
};

// ❌ WRONG - Don't rely on external Complete button
// Template tasks don't show manual Complete button in task list
```

### **Auto-Complete Backend Handler**

```python
async def should_auto_complete(self, completion: TaskCompletion) -> bool:
    """Return True to auto-complete task after submission.

    Most templates should return True.
    Return False only if you need manual parent approval.
    """
    return True
```

---

## 10. Migration Notes

### Existing Data
- No schema changes needed
- Existing IN_PROGRESS tasks will be handled by nightly job
- Existing templates continue to work (already call onComplete)

### Breaking Changes
- None - this is UI/UX refinement
- Backend API remains compatible

---

## 11. Future Enhancements

1. **Smart Resume Detection**
   - Show "You have unfinished work" banner
   - Estimate time to complete based on progress

2. **Progress Notifications**
   - Notify child if they have IN_PROGRESS tasks at end of day
   - Parent notification for incomplete tasks

3. **Flexible Auto-Archive**
   - Let parents configure: "Reset" vs "Skip" for incomplete tasks
   - Per-task setting

4. **Cross-Day Continuation**
   - Option to allow certain tasks to continue across days
   - Useful for multi-day projects

---

## Conclusion

This redesign creates clear, predictable behavior for:
- ✅ Regular tasks → Simple pause/complete flow
- ✅ Template tasks → Navigate to dedicated execution page
- ✅ Cross-night states → Automatic cleanup with sensible rules
- ✅ Multi-completion → Proper tracking and limits

**Key Benefits:**
1. Cleaner UX - No confusing pause button for template tasks
2. Better progress tracking - Auto-save ensures no data loss
3. Predictable overnight behavior - Clear rules prevent confusion
4. Template flexibility - Business logic controls completion
