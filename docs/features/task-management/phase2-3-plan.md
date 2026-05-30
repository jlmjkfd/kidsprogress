# Task Management - Phase 2 & 3 Implementation Plan

## Overview
This document outlines the implementation plan for Phase 2 (Task Copy Features) and Phase 3 (AI Scheduling & Dynamic Replanning) of the Task Management system.

## Phase 2: Task Copy & Duplication Features

### User Stories
1. **Copy task to another date**: Parent can duplicate a task to a different date (e.g., copy today's "Math homework" to tomorrow)
2. **Copy task to another child**: Parent with multiple children can copy a task from one child to another (e.g., "Piano practice" from Alice to Bob)
3. **Bulk copy**: Copy multiple tasks at once to another date or child
4. **Copy with modifications**: Option to modify task details during copy (e.g., change time slot, obligation level)

### Backend Implementation

#### API Endpoints (backend/routes/task_routes.py)
```python
# Copy single task to another date
POST /api/tasks/{task_id}/copy
Body: {
  "target_date": "2025-11-17",  # Optional: if not provided, stays same date
  "target_child_id": "xxx",      # Optional: if not provided, stays same child
  "modifications": {              # Optional: override fields
    "title": "Modified title",
    "preferred_time_slot": {...},
    "obligation_level": "must_do"
  }
}

# Bulk copy multiple tasks
POST /api/tasks/bulk-copy
Body: {
  "task_ids": ["id1", "id2", "id3"],
  "target_date": "2025-11-17",
  "target_child_id": "xxx",
  "modifications": {...}
}
```

#### Service Layer (backend/services/task_service.py)
```python
async def copy_task(
    task_id: str,
    target_date: Optional[datetime] = None,
    target_child_id: Optional[str] = None,
    modifications: Optional[dict] = None,
    parent_id: str
) -> Task:
    """
    Copy a task to another date/child.

    Logic:
    1. Fetch original task
    2. Verify parent owns both source and target child
    3. Create new task with:
       - Same title, description, metrics, quality_aspects, tools, subtasks
       - Same scheduling_type, obligation_level (unless overridden)
       - task_source = "one_time" (copied tasks are one-time)
       - source_metadata.copied_from = original_task_id
       - scheduled_date = target_date or original_date
       - child_id = target_child_id or original_child_id
       - status = "draft" (starts as draft)
    4. Apply modifications if provided
    5. Return new task
    """
```

### Frontend Implementation

#### Components (frontend/src/pages/parent-portal/children/[id]/components/)

**CopyTaskModal.tsx** - Modal for copying task(s)
```typescript
interface CopyTaskModalProps {
  tasks: Task[];  // Can be single or multiple tasks
  onClose: () => void;
  onSubmit: (data: CopyTaskRequest) => Promise<void>;
}

// Features:
// - Select target date (date picker)
// - Select target child (dropdown, only if parent has multiple children)
// - Optional modifications section (collapsed by default)
//   - Override title
//   - Override time slot
//   - Override obligation level
// - Preview: "Copying X task(s) to [date] for [child name]"
// - Copy button
```

#### Updated tasks.tsx
```typescript
// Add copy handlers
const handleCopyTask = (task: Task) => {
  setTasksToCopy([task]);
  setShowCopyModal(true);
};

const handleBulkCopy = () => {
  // Show modal for selected tasks
  setTasksToCopy(selectedTasks);
  setShowCopyModal(true);
};

// Add bulk selection UI
const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
const [bulkMode, setBulkMode] = useState(false);
```

#### API Mutations (frontend/src/api/mutations/useTaskMutations.ts)
```typescript
export const useCopyTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CopyTaskRequest) => {
      const response = await apiClient.post<Task>(`/api/tasks/${data.taskId}/copy`, data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", "child", data.child_id] });
    },
  });
};

export const useBulkCopyTasks = () => {
  // Similar to useCopyTask but for multiple tasks
};
```

### UX Flow Examples

**Scenario 1: Copy to another date**
1. User clicks "Copy" button on a task card
2. Modal opens with:
   - Current date pre-filled
   - Date picker to select new date
   - "Copy to another child?" checkbox (if multiple children)
3. User selects tomorrow's date
4. User clicks "Copy"
5. Success toast: "Task copied to Nov 17"
6. User navigates to tomorrow's view and sees the copied task

**Scenario 2: Copy to another child**
1. User clicks "Copy" on "Piano practice" task for child Alice
2. Modal opens
3. User checks "Copy to another child"
4. Dropdown appears with other children (Bob, Charlie)
5. User selects Bob
6. User clicks "Copy"
7. Success toast: "Task copied to Bob"
8. Task appears in Bob's task list

### i18n Keys Needed
```json
{
  "copy_task": "Copy Task",
  "copy_tasks": "Copy Tasks",
  "copy_to_date": "Copy to Date",
  "copy_to_child": "Copy to Another Child",
  "select_target_date": "Select Target Date",
  "select_target_child": "Select Target Child",
  "modify_during_copy": "Modify During Copy",
  "copying_count": "Copying {{count}} task(s)",
  "task_copied": "Task copied successfully",
  "tasks_copied": "{{count}} tasks copied successfully",
  "bulk_select_mode": "Bulk Select Mode",
  "select_all": "Select All",
  "deselect_all": "Deselect All"
}
```

---

## Phase 3: AI Scheduling & Dynamic Replanning

### User Stories from Original Scenario

**Scenario**: Morning routine with school time blocks, meal constraints, physical activity sequencing, break suggestions, and dynamic replanning.

1. **Morning task sequence**: "Brush teeth" → "Get dressed" → "Eat breakfast" (8:00 AM deadline)
2. **School time block**: 8:30 AM - 3:00 PM (fixed, no tasks can be scheduled)
3. **Meal constraints**: Lunch at 12:00 PM (within school), Dinner at 6:00 PM
4. **Physical activity sequencing**: "Basketball practice" after school, can't do "Homework" immediately after (need 15-min break)
5. **AI break suggestions**: If child working >45 min, suggest 5-10 min break
6. **Dynamic replanning**: Task takes longer than expected → AI reorganizes remaining tasks

### Backend Implementation

#### AI Schedule Agent Workflow (backend/workflows/ai_schedule_agent.py)

**Context-Aware Recommendation System**
```python
class AIScheduleAgent:
    """
    Intelligent task scheduling agent using Gemini 1.5 Flash.

    Inputs:
    - Child's current state (time, location, energy, focus)
    - Available tasks (scheduled, backlog, activities)
    - Time blocks (school, meals, sleep)
    - Constraint rules (prerequisites, sequencing, breaks)
    - Recent activity history (what they just finished)

    Outputs:
    - "What to do now" recommendation
    - Reasoning explanation
    - Alternative options
    - Estimated time
    - Break suggestions
    """

    async def get_recommendation(
        self,
        child_id: str,
        current_time: datetime,
        context: ScheduleContext
    ) -> Recommendation:
        """
        Multi-factor decision algorithm:

        1. Filter available tasks:
           - Check time blocks (no tasks during school)
           - Check prerequisites (previous tasks completed?)
           - Check sequencing rules (physical → break → mental)
           - Check meal constraints (don't schedule tasks during meals)

        2. Calculate priority score for each task:
           - Base priority (obligation_level, priority_boost)
           - Deadline urgency (must_complete_by proximity)
           - Rollover penalty (tasks rolled over multiple times)
           - Preferred time match (is it close to preferred_time_slot?)
           - Energy/focus compatibility (task difficulty vs child state)
           - Break detection (been working >45 min? suggest break)

        3. LLM decision:
           - Provide top 3 candidates to Gemini
           - Include full context (history, constraints, child state)
           - Get natural language recommendation with reasoning

        4. Return recommendation
        """
```

#### Task Sequencing Rules (backend/models/task.py)
```python
class TaskSequencingRule(BaseModel):
    """Rules for task ordering and breaks."""
    requires_break_after: bool = False  # Needs break after completion
    break_duration_minutes: int = 10    # How long the break should be
    cannot_follow_task_types: List[str] = []  # Task types that can't come right after
    prerequisite_task_ids: List[str] = []  # Tasks that must complete first
    category: str = "mental"  # mental, physical, creative, rest
```

#### Time Block Constraints (backend/models/time_block.py - already exists)
```python
# Enhanced TimeBlock model
class TimeBlock:
    # ... existing fields ...
    blocks_task_scheduling: bool = True  # If True, no tasks during this block
    allows_activities: bool = False      # Can suggest activities during block
```

#### Dynamic Replanning Service (backend/services/schedule_service.py)
```python
async def replan_remaining_tasks(
    child_id: str,
    current_task_id: str,
    actual_duration: int,  # How long the task actually took
    estimated_duration: int  # How long we thought it would take
) -> ReplannedSchedule:
    """
    When a task takes longer than expected, reorganize remaining tasks.

    Algorithm:
    1. Calculate time difference (actual - estimated)
    2. Get all remaining scheduled tasks for today
    3. Check if any tasks will now conflict with:
       - Time blocks (school, meals, bedtime)
       - Deadlines (must_complete_by)
       - Prerequisites
    4. Use AI agent to reorganize:
       - Shift tasks to later time slots
       - Reduce optional tasks if needed
       - Suggest moving must_do tasks to tomorrow if no time
    5. Return new schedule with changes highlighted
    """
```

### Frontend Implementation

#### AI Recommendation Button Component
```typescript
// components/AIRecommendationButton.tsx
function AIRecommendationButton({ childId }: { childId: string }) {
  const { data: recommendation, refetch } = useAIRecommendation(childId);

  return (
    <div className="ai-recommendation-card">
      <button onClick={() => refetch()}>
        <IconSparkles /> What should I do now?
      </button>

      {recommendation && (
        <div className="recommendation-details">
          <h3>{recommendation.suggested_task.title}</h3>
          <p className="reasoning">{recommendation.reasoning}</p>
          <div className="metadata">
            <span>⏱️ ~{recommendation.estimated_minutes} min</span>
            <span>🎯 {recommendation.priority_score}/100</span>
          </div>
          <button onClick={() => startTask(recommendation.suggested_task.id)}>
            Start Task
          </button>

          {recommendation.alternatives.length > 0 && (
            <details>
              <summary>Other Options</summary>
              {recommendation.alternatives.map(alt => (
                <div key={alt.id}>{alt.title}</div>
              ))}
            </details>
          )}
        </div>
      )}
    </div>
  );
}
```

#### Dynamic Replanning Notification
```typescript
// When a task completes and took longer than expected
useEffect(() => {
  if (taskCompleted && actualDuration > estimatedDuration + 10) {
    // Show notification
    toast.info("This task took longer than expected. Reorganizing your schedule...");

    // Trigger replanning
    replanMutation.mutate({
      childId,
      currentTaskId: task.id,
      actualDuration,
      estimatedDuration
    });
  }
}, [taskCompleted]);
```

#### Schedule Conflict Warnings
```typescript
// Visual indicators for schedule conflicts
function TaskCard({ task }: { task: Task }) {
  const conflicts = useScheduleConflicts(task.id);

  return (
    <div className="task-card">
      {/* ... task content ... */}

      {conflicts?.has_time_block_conflict && (
        <div className="warning">
          ⚠️ This task overlaps with {conflicts.conflicting_block.title}
        </div>
      )}

      {conflicts?.missing_prerequisites && (
        <div className="warning">
          🔒 Complete "{conflicts.prerequisite_task.title}" first
        </div>
      )}

      {conflicts?.needs_break_before && (
        <div className="info">
          ☕ Suggested: Take a 10-minute break first
        </div>
      )}
    </div>
  );
}
```

### API Endpoints for Phase 3

```python
# Get AI recommendation
GET /api/schedule/recommendation
Query: child_id, current_time (optional)
Response: {
  "suggested_task": Task,
  "reasoning": str,
  "priority_score": float,
  "estimated_minutes": int,
  "alternatives": [Task],
  "break_suggested": bool
}

# Replan remaining tasks
POST /api/schedule/replan
Body: {
  "child_id": str,
  "current_task_id": str,
  "actual_duration": int,
  "estimated_duration": int
}
Response: {
  "changes": [
    {"task_id": str, "old_time": str, "new_time": str, "reason": str}
  ],
  "tasks_moved_to_tomorrow": [Task],
  "tasks_removed": [Task]
}

# Check schedule conflicts
GET /api/schedule/conflicts
Query: child_id, task_id (optional)
Response: {
  "has_conflicts": bool,
  "conflicts": [
    {
      "type": "time_block" | "prerequisite" | "break_needed",
      "description": str,
      "conflicting_item": {...}
    }
  ]
}
```

### Complex Scenario Implementation Example

**Scenario**: Child finishes basketball practice at 4:30 PM, needs to do homework before dinner at 6:00 PM.

**System behavior**:
1. Child clicks "Complete" on "Basketball practice" task at 4:30 PM
2. Backend detects task is categorized as "physical"
3. AI agent called with context:
   - Current time: 4:30 PM
   - Recent completion: Basketball (physical, 60 min)
   - Next time block: Dinner at 6:00 PM
   - Available tasks: "Math homework" (mental, 30 min), "Read book" (mental, 20 min)
   - Sequencing rule: Physical → needs 15-min break → Mental
4. AI recommendation:
   ```
   "Take a 15-minute break first! You just finished basketball practice.
   After your break, start 'Math homework' at 4:45 PM. You'll finish by
   5:15 PM, leaving 45 minutes before dinner for reading or free time."
   ```
5. Frontend shows:
   - Break timer: "15-minute break recommended 🧘"
   - Next task preview: "Math homework at 4:45 PM"
   - Optional: "Read book" available after homework

### i18n Keys for Phase 3
```json
{
  "what_should_i_do_now": "What should I do now?",
  "ai_recommendation": "AI Recommendation",
  "reasoning": "Why this task?",
  "estimated_time": "Estimated Time",
  "priority_score": "Priority Score",
  "alternatives": "Other Options",
  "start_task": "Start Task",
  "break_suggested": "Break Suggested",
  "take_break": "Take a Break",
  "break_duration": "{{minutes}}-minute break",
  "schedule_conflict": "Schedule Conflict",
  "time_block_conflict": "Overlaps with {{blockName}}",
  "prerequisite_required": "Complete {{taskName}} first",
  "break_needed": "Suggested: Take a break first",
  "schedule_reorganized": "Schedule reorganized",
  "tasks_moved": "{{count}} task(s) rescheduled",
  "replan_reason": "Reason: {{reason}}"
}
```

---

## Implementation Priority

### Phase 2 Recommended Order:
1. Backend copy endpoints (single task first)
2. Frontend CopyTaskModal component
3. Integrate into tasks.tsx (single copy button)
4. Test single task copy flow
5. Add bulk copy support
6. Add copy-to-another-child support

**Estimated time**: 1-2 days

### Phase 3 Recommended Order:
1. Task sequencing rules in models
2. Time block constraint enforcement
3. Basic AI recommendation endpoint (without LLM first, just priority sorting)
4. Frontend AI recommendation button
5. Add Gemini LLM integration for natural language reasoning
6. Dynamic replanning service
7. Conflict detection and warnings

**Estimated time**: 5-7 days

---

## Testing Checklist

### Phase 2 Testing
- [ ] Copy task to same child, different date
- [ ] Copy task to different child, same date
- [ ] Copy task to different child, different date
- [ ] Copy with modifications (title, time, obligation)
- [ ] Bulk copy 5 tasks at once
- [ ] Copy permission validation (can't copy to child you don't own)
- [ ] UI: Copy modal opens/closes correctly
- [ ] UI: Success toast shows after copy
- [ ] UI: Copied task appears in target date/child view

### Phase 3 Testing
- [ ] AI recommendation returns valid task
- [ ] Recommendation respects time blocks (no tasks during school)
- [ ] Recommendation suggests break after physical activity
- [ ] Prerequisite tasks enforced (locked tasks show in UI)
- [ ] Dynamic replanning triggered when task runs long
- [ ] Conflict warnings show in task cards
- [ ] Schedule reorganization works correctly
- [ ] AI reasoning is clear and helpful
- [ ] Works with empty schedule (no crashes)
- [ ] Works with fully booked schedule (suggests nothing if no time)

---

## Future Enhancements (Phase 4+)

1. **Learning from patterns**: AI learns child's preferences over time
2. **Energy/focus tracking**: Ask child "How's your energy?" to improve recommendations
3. **Gamification**: Streak tracking, achievement badges for consistency
4. **Parent insights**: "Alice is most productive between 4-6 PM" analytics
5. **Multi-day planning**: Week-level AI optimization
6. **Collaborative scheduling**: Child can propose schedule changes to parent
