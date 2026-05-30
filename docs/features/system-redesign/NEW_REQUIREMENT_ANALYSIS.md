# New Requirements Analysis & Refinement

**Date**: 2025-12-07
**Status**: Analysis Complete - Ready for Review

---

## Executive Summary

After analyzing the new requirements against existing implementation and design documents, I've identified:

1. ✅ **3 requirements already implemented** (can use as-is)
2. 🟡 **4 requirements need refinement** (minor adjustments to existing design)
3. 🆕 **3 new features** (not yet designed)
4. ⚠️ **1 conflicting requirement** (needs architectural decision)

---

## Part 1: Task Types & Life Cycle

### Current Implementation Status

| Requirement | Status | Notes |
|------------|--------|-------|
| **Informational tasks** | ✅ Implemented | `is_informational` field exists in Task model |
| **Template tasks** | ✅ Implemented | Plugin architecture in `backend/templates/` |
| **General tasks** | ✅ Implemented | Standard Task model with title/description |
| **Time arrangement types** | ✅ Implemented | `SchedulingType` enum covers all 5 types |
| **Recurrence with RRULE** | ✅ Implemented | Virtual instances for recurring tasks |

### Recommendation: **ACCEPT AS-IS**

All task types and scheduling mechanisms are already implemented. No changes needed.

---

## Part 2: Task Execution - General Tasks

### Requirement Analysis

> "general tasks: kids can start/complete tasks, record the real start/complete time. when kids click start, jump to task page (all general tasks can use the same one, this page contain some tools like calculator, timer, note...)"

### Current State

- ✅ Start/Complete workflow exists
- ✅ Tools system exists (`ToolUsage` model)
- ❌ **Missing**: Unified general task execution page
- ❌ **Missing**: Task-tool integration in execution UI

### Recommendation: **REFINE & IMPLEMENT**

#### Proposed Design

```
General Task Execution Page: /child-portal/tasks/execute/general/:taskId

┌─────────────────────────────────────────┐
│ Task: Math Homework                      │
│ Description: Complete pages 45-50        │
├─────────────────────────────────────────┤
│ [Tools Panel - Sidebar]                  │
│  📱 Calculator                           │
│  ⏱️  Timer                               │
│  📝 Notes                                │
│  📏 Ruler                                │
├─────────────────────────────────────────┤
│ [Main Content Area]                      │
│  Notes:                                  │
│  ________________________________        │
│  ________________________________        │
│                                          │
│  [Mark as Complete]                      │
└─────────────────────────────────────────┘
```

**Implementation Tasks**:
1. Create `/execute/general/:taskId` route
2. Load tools from `task.tools` array
3. Render tool widgets (calculator, timer, note as plugins)
4. Save tool data (notes) to task-specific records
5. Complete task when user clicks "Mark as Complete"

---

## Part 3: Task Execution - Template Tasks

### Requirement Analysis

> "template tasks: kids can click start to jump to the specific task page with business logics... after start, kids can click resume to return to the uncompleted task page."

### Current State

- ✅ Template execution pages exist (e.g., `/execute/addition-subtraction`)
- ✅ Auto-save progress every 30s
- ✅ Resume functionality via `progress_state`
- ❌ **Issue**: Pause button still shown in UI (should be removed per `task-state-redesign.md`)

### Recommendation: **ALIGN WITH EXISTING DESIGN**

From [task-state-redesign.md](../task-state-redesign.md):
- Template tasks should have **Continue** button (not Pause)
- Completion triggered by business logic (submit, timer, conditions met)
- No manual "Complete" button on task cards

**Action**: Implement the pause button redesign already documented.

---

## Part 4: Overdue Tasks - **MAJOR CONFLICT DETECTED**

### ⚠️ Architectural Conflict

**New Requirement says**:
> "Current overdue tasks rollover logic seems has problems, I think we can remove it, we don't need rollover logic"

**Existing Implementation has TWO systems**:

1. **Rollover System** (`task_rollover_job.py`)
   - Runs at 23:00
   - Moves `scheduled_date` to tomorrow for MUST_DO tasks
   - After 3 rollovers → backlog

2. **Carry-Over System** (`task_carryover_job.py` - **just implemented**)
   - Runs at 00:01
   - Flags tasks with `is_carried_over=True`
   - Keeps original `scheduled_date` intact
   - Shows "From Yesterday" section

### 🚨 Critical Question

**Which approach should we use?**

#### Option A: Remove Rollover, Keep Carry-Over (Recommended)

**Pros**:
- Simpler mental model
- Matches new requirement ("no rollover logic")
- Better UX: tasks stay on original date in timeline
- Kids can see what day the task was originally for

**Cons**:
- Need to handle MUST_DO tasks differently (can't just ignore them)

**Implementation**:
```python
# Remove: task_rollover_job.py
# Keep: task_carryover_job.py

# Modify carry-over job to handle MUST_DO:
if task.obligation_level == "MUST_DO" and task.carry_over_count >= 3:
    # Notify parent + move to backlog
    await notify_parent(task)
    await move_to_backlog(task)
```

#### Option B: Keep Rollover, Remove Carry-Over

**Pros**:
- Already implemented and tested
- MUST_DO tasks automatically rescheduled

**Cons**:
- Goes against new requirement
- Tasks "move" between days (confusing in timeline)
- Kid can't tell which day task was originally for

#### Option C: Hybrid (Not Recommended - Too Complex)

Use rollover for MUST_DO, carry-over for others → confusing UX

### My Recommendation: **Option A**

**Rationale**:
1. New requirement explicitly says "remove rollover logic"
2. Carry-over design (v3) is better UX:
   - "From Yesterday" section is clear
   - Timeline integrity maintained
   - Child autonomy preserved
3. Can handle MUST_DO with notifications instead of auto-rescheduling

**Changes Needed**:
```diff
- backend/jobs/task_rollover_job.py (DELETE)
- backend/services/task_service/rollover.py (KEEP move_to_backlog(), DELETE rollover_task())
+ backend/jobs/task_carryover_job.py (ENHANCE for MUST_DO handling)
```

---

## Part 5: Overdue Tasks UI

### Requirement Analysis

> "child portal: in list view, add a tab to show all overdued tasks of previous dates (uncompleted tasks). For today's overdued tasks (like after deadline, after time window), still show in today's list using other style."

### Alignment with Existing Design

From [cross-night-task-handling-v3.md](../cross-night-task-handling-v3.md):
- ✅ "From Yesterday" section → covers "previous dates uncompleted tasks"
- ✅ Different styling for carried-over tasks
- 🆕 Need: Tab navigation for "All Overdue" vs "Today"

### Recommendation: **ENHANCE EXISTING DESIGN**

Add tab navigation to child portal task list:

```tsx
<Tabs>
  <Tab>Today</Tab>
  <Tab>All Overdue ({overdueCount})</Tab>
</Tabs>

{activeTab === 'today' && (
  <>
    <Section>From Yesterday</Section>
    <Section>Today's Tasks</Section>
    <Section>Completed</Section>
  </>
)}

{activeTab === 'overdue' && (
  <OverdueList>
    {/* Group by date */}
    <DateGroup date="Dec 5">
      {tasks.map(...)}
    </DateGroup>
    <DateGroup date="Dec 4">
      {tasks.map(...)}
    </DateGroup>
  </OverdueList>
)}
```

**Backend Query**:
```python
@router.get("/tasks/child/{child_id}/overdue")
async def get_all_overdue_tasks(child_id: str):
    """Get all overdue tasks grouped by date."""
    return await tasks_collection.find({
        "child_id": ObjectId(child_id),
        "scheduled_date": {"$lt": datetime.now()},
        "status": {"$in": ["pending", "in_progress", "paused"]},
    }).sort("scheduled_date", -1)  # Newest overdue first
```

---

## Part 6: Tools System

### Requirement Analysis

> "All tools are provided by the system. Some tools allow parents to select when creating tasks... Some tools only for template tasks... database related tools' records need to Corresponding to the specific task ID"

### Current State

- ✅ `Tool` model exists with `ToolApplicability` enum
- ✅ `ToolUsage` embedded in Task model
- ✅ Tool service and routes exist
- ❌ **Missing**: Tool widgets UI components
- ❌ **Missing**: Task-tool data storage schema

### Recommendation: **IMPLEMENT TOOL WIDGETS SYSTEM**

#### Tool Categories (by Applicability)

```typescript
enum ToolApplicability {
  GENERAL_TASK = "general_task",      // Calculator, Timer - parent selects
  TEMPLATE_ONLY = "template_only",     // Template-specific logic
  SHARED_TEMPLATE = "shared_template", // Shared across templates
  SYSTEM = "system"                    // Available everywhere
}
```

#### Tool Data Storage Schema

```python
# New collection: tool_records
class ToolRecord(BaseModel):
    _id: PyObjectId
    task_id: PyObjectId          # Which task was this used for
    child_id: PyObjectId
    tool_code: str               # "note", "calculator", etc.
    data: Dict[str, Any]         # Tool-specific data
    created_at: datetime
    updated_at: datetime

# Examples:
# Note tool:
{
    "tool_code": "note",
    "data": {
        "content": "Finished page 45, need to review derivatives",
        "attachments": []
    }
}

# Timer tool:
{
    "tool_code": "timer",
    "data": {
        "duration_seconds": 1800,
        "completed": true
    }
}
```

#### Tool Widget Architecture

```
frontend/src/tools/
├── registry.tsx          # Tool registry
├── types.ts             # Tool interfaces
├── widgets/
│   ├── Calculator.tsx
│   ├── Timer.tsx
│   ├── Note.tsx
│   ├── Ruler.tsx
│   └── index.ts
└── ToolPanel.tsx        # Container for tool widgets
```

#### Tool Display Options

**Question**: "tools can be a individual page or a modal or side slided bar? which one is better?"

**Answer**: **Side Slider** (Best UX)

**Rationale**:
1. ✅ Non-intrusive - kid can switch tools without losing context
2. ✅ Quick access - slide in/out as needed
3. ✅ Multitasking - can see task content + tool simultaneously
4. ❌ Modal - blocks view, forces context switch
5. ❌ Separate page - requires navigation, loses task context

**Implementation**:
```tsx
<TaskExecutionPage>
  <TaskContent>{/* Main task area */}</TaskContent>
  <ToolsButton onClick={openToolsPanel}>🛠️ Tools</ToolsButton>

  <SideSlider open={toolsPanelOpen} side="right" width="320px">
    <ToolPanel tools={task.tools}>
      {task.tools.map(tool => (
        <ToolWidget key={tool.code} tool={tool} taskId={taskId} />
      ))}
    </ToolPanel>
  </SideSlider>
</TaskExecutionPage>
```

---

## Part 7: New Features (Not Yet Designed)

### Feature 1: Kids Plan Their Own Tasks

> "Kids are allowed to plan their own task (simpler than parents)"

**Design Needed**:
- Simplified task creation form for kids
- Permission model: can kids create tasks without approval?
- What fields can kids set? (title, time, but not obligation_level?)

**Questions to Answer**:
1. Does parent need to approve kid-created tasks?
2. Can kids set recurrence?
3. Can kids assign tasks to themselves only (not siblings)?

**Proposed Scope** (v1):
```tsx
// Kids can create simple one-time tasks
<KidTaskCreator>
  <Input name="title" placeholder="What do you want to do?" />
  <Input name="time" type="time" placeholder="When?" />
  <Input name="duration" type="number" placeholder="How long?" />
  <Button>Add to My Day</Button>
</KidTaskCreator>

// Auto-set:
// - obligation_level: OPTIONAL
// - status: PENDING
// - created_by: CHILD
```

### Feature 2: Kids Record What They're Doing

> "Kids are allowed to record what they are doing, (like create a new task, and start immediately)"

**Design Needed**:
- "Quick capture" button in child portal
- Creates + starts task in one action
- Tracks actual activity time

**Proposed Flow**:
```
Kid clicks "What I'm Doing Now" →
  Enter activity name →
  Task created with status=IN_PROGRESS →
  Timer starts automatically →
  Kid completes when done
```

**Schema Addition**:
```python
class Task:
    created_by: str = "PARENT"  # or "CHILD"
    is_quick_capture: bool = False  # True for "what I'm doing now"
```

### Feature 3: Memo System for Kids

> "how to design a memo for kids in this system? like don't forget take a book to school tomorrow."

**Design Options**:

#### Option A: Memos as Special Tasks
```python
# Use existing Task model
Task(
    title="Remember: Bring book to school",
    is_informational=True,  # No start/complete buttons
    scheduling_type=SchedulingType.DEADLINE,
    deadline=tomorrow_morning_8am,
    task_type_code="memo"
)
```
**Pros**: Reuses existing infrastructure, shows in timeline
**Cons**: Clutters task list

#### Option B: Separate Memo Model
```python
class Memo(BaseModel):
    _id: PyObjectId
    child_id: PyObjectId
    content: str
    remind_at: Optional[datetime]  # When to show reminder
    completed: bool = False
    created_at: datetime
```
**Pros**: Clean separation, can have memo-specific UI
**Cons**: New collection, new queries

#### Option C: Use Note Tool + Pin Feature
```python
# Use existing tool_records collection
ToolRecord(
    tool_code="note",
    data={
        "content": "Bring book to school tomorrow",
        "is_pinned": True,  # Show at top of task list
        "remind_at": "2025-12-08T08:00:00"
    }
)
```
**Pros**: Reuses tools system
**Cons**: Memos aren't really "tools"

**My Recommendation**: **Option B (Separate Memo Model)**

**Rationale**:
- Memos have different lifecycle than tasks (no complete, just dismiss)
- Need quick-add UI (not full task creation)
- Can show in dedicated "Reminders" section
- Simple schema, easy to query

---

## Summary of Recommendations

### ✅ Accept As-Is (No Changes)
1. Task types (informational, template, general)
2. Scheduling types (flexible, fixed, window, deadline, pool)
3. Recurrence with RRULE

### 🔧 Refine Existing Design
1. **Remove rollover system**, keep carry-over system
2. Implement pause button redesign (template vs regular tasks)
3. Add "All Overdue" tab to child portal

### 🆕 New Implementation Required
1. **General task execution page** with tools panel
2. **Tool widgets system** (side slider, task-tool data storage)
3. **Kids plan own tasks** (simplified creator)
4. **Quick capture** ("What I'm doing now")
5. **Memo system** (separate model with reminders)

### ⚠️ Decisions Needed
1. **Rollover vs Carry-Over**: Confirm removal of rollover system
2. **Kid task permissions**: Can kids create without approval?
3. **Memo implementation**: Confirm separate model approach

---

## Next Steps

1. **User review this analysis**
2. **Answer decision questions**
3. **Prioritize new features** (which to implement first?)
4. **Create detailed designs** for approved features
5. **Begin implementation** in priority order

---

## Implementation Complexity Estimates

| Feature | Complexity | Estimated Effort |
|---------|-----------|-----------------|
| Remove rollover system | 🟢 Low | 2 hours |
| Pause button redesign | 🟡 Medium | 4 hours |
| General task execution page | 🟡 Medium | 8 hours |
| Tool widgets (Calculator, Timer, Note) | 🔴 High | 16 hours |
| Tool data storage system | 🟡 Medium | 6 hours |
| "All Overdue" tab | 🟢 Low | 3 hours |
| Kids create tasks | 🟡 Medium | 6 hours |
| Quick capture | 🟢 Low | 4 hours |
| Memo system | 🟡 Medium | 8 hours |

**Total**: ~57 hours (1.5 weeks for one developer)
