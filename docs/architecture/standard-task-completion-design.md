# Standard Task Completion Design

## Problem Statement

Currently, standard tasks (non-template tasks) don't preserve tool data (notes, timer, etc.) when completed. The `progress_state` field containing tool data is cleared on completion, making it impossible for parents to view what the child wrote/did during task execution.

## Current Architecture

### Template Tasks (Working)
1. **During Execution**: Tool data saved to `task.progress_state.tools`
2. **On Completion**: Template handler creates `TaskCompletion` record in `task_completions` collection
3. **Completion Data**: Contains `detailed_data` (template-specific answers) and `measured_data` (scores/metrics)
4. **Tool Data**: Stored in `detailed_data` or separate field
5. **Parent View**: Can view all attempts via `/api/completions` endpoint

### Standard Tasks (Current Issue)
1. **During Execution**: Tool data saved to `task.progress_state.tools`
2. **On Completion**: `complete_task()` just sets `status = "completed"` and `completed_at = timestamp`
3. **Tool Data**: Lost when `progress_state` is cleared
4. **Parent View**: No way to see what child wrote in notes or timer duration

## Solution Design

### Option 1: Store Tool Data in Task Document (Simpler)
Store tool data directly in the task document on completion.

**Pros**:
- Simple implementation
- No new collection needed
- Tool data stays with task

**Cons**:
- Can't track multiple completions (if task is uncompleted and completed again)
- Doesn't support multi-completion for standard tasks in future

### Option 2: Use TaskCompletion Collection (Recommended)
Create completion records for standard tasks, similar to template tasks.

**Pros**:
- Consistent architecture (both task types use same completion system)
- Supports future multi-completion for standard tasks
- Can track completion history
- Parents can view all completion attempts

**Cons**:
- More complex implementation
- Need to modify completion routes

## Recommended Solution: Option 2

### Data Model

```python
# Standard task completion record
{
  "_id": ObjectId("..."),
  "completion_id": "comp_<uuid>",
  "task_id": ObjectId("..."),  # Task that was completed
  "child_id": ObjectId("..."),
  "template_id": null,  # null for standard tasks
  "session_number": 1,
  "scheduled_date": "2025-12-13",

  # Timing
  "started_at": "2025-12-13T10:00:00Z",
  "completed_at": "2025-12-13T10:30:00Z",

  # Tool data from progress_state
  "detailed_data": {
    "tools": {
      "timer": {
        "toolId": "timer",
        "state": { "elapsedSeconds": 1800 },
        "lastUpdated": "2025-12-13T10:30:00Z"
      },
      "note": {
        "toolId": "note",
        "state": { "content": "I finished my homework!" },
        "lastUpdated": "2025-12-13T10:29:00Z"
      }
    }
  },

  # Measured data (for standard tasks, could include duration, tools used, etc.)
  "measured_data": {
    "duration_minutes": 30,
    "tools_used": ["timer", "note"]
  },

  "attachments": [],  # Media attachments if any
  "created_at": "2025-12-13T10:30:00Z"
}
```

### Implementation Plan

#### Backend Changes

1. **Modify `lifecycle.py:complete_task()`**:
   ```python
   async def complete_task(self, task_id: str, child_id: str) -> Optional[Task]:
       # ... existing validation ...

       # Get task data before completion
       task_data = await self.tasks_collection.find_one({...})

       # Save completion record if has progress_state or attachments
       if task_data.get("progress_state") or task_data.get("attachments"):
           await self._save_standard_task_completion(task_data, child_id)

       # Complete task (existing logic)
       result = await self.tasks_collection.find_one_and_update(...)

       return Task(**result)
   ```

2. **Add helper method**:
   ```python
   async def _save_standard_task_completion(
       self, task_data: dict, child_id: str
   ) -> None:
       """Save completion record for standard task."""
       import uuid
       from backend.models.task_template import TaskCompletion

       completions_collection = self.db["task_completions"]

       # Calculate session number
       task_id = task_data["_id"]
       existing_count = await completions_collection.count_documents({
           "task_id": task_id
       })

       # Create completion record
       completion = TaskCompletion(
           completion_id=f"comp_{uuid.uuid4().hex[:12]}",
           task_id=task_id,
           child_id=ObjectId(child_id),
           template_id="",  # Empty string for standard tasks
           session_number=existing_count + 1,
           scheduled_date=task_data.get("scheduled_date").strftime("%Y-%m-%d") if task_data.get("scheduled_date") else None,
           started_at=task_data.get("started_at") or utcnow(),
           completed_at=utcnow(),
           detailed_data=task_data.get("progress_state") or {},
           measured_data={
               "duration_minutes": self._calculate_duration(
                   task_data.get("started_at"),
                   utcnow()
               ),
               "tools_used": list(task_data.get("progress_state", {}).get("tools", {}).keys()) if task_data.get("progress_state") else []
           },
           attachments=[att.get("file_url") for att in task_data.get("attachments", [])]
       )

       # Save to database
       completion_dict = completion.model_dump(exclude={'id'})
       if completion.id:
           completion_dict['_id'] = completion.id
       await completions_collection.insert_one(completion_dict)
   ```

3. **Modify `completion_routes.py:get_completions()`**:
   - Already supports filtering by `task_id`
   - Already handles both `template_id` (for template tasks) and null (for standard tasks)
   - No changes needed

#### Frontend Changes

1. **Update attempt detail page** ([frontend/src/pages/child-portal/tasks/attempts/[taskId].tsx](frontend/src/pages/child-portal/tasks/attempts/[taskId].tsx)):
   - Already uses `useCompletions()` hook
   - Update `renderAttemptContent()` to handle standard tasks:
   ```tsx
   const renderAttemptContent = () => {
     // Template tasks - use plugin AttemptView
     if (task.template_id) {
       const plugin = getPlugin(task.template_id);
       if (plugin?.components.AttemptView) {
         return <AttemptView completion={selectedCompletion} />;
       }
     }

     // Standard tasks - show tool data
     const toolData = selectedCompletion.detailed_data?.tools;
     if (toolData) {
       return <StandardTaskAttemptView tools={toolData} />;
     }

     // Fallback
     return <div>No data available</div>;
   };
   ```

2. **Create `StandardTaskAttemptView` component**:
   ```tsx
   function StandardTaskAttemptView({ tools }: { tools: Record<string, any> }) {
     return (
       <div className="space-y-4">
         {Object.entries(tools).map(([toolId, toolData]) => (
           <div key={toolId} className="rounded-lg bg-white p-4 shadow">
             <h3 className="mb-2 font-semibold">{toolId}</h3>
             {toolId === 'note' && (
               <p className="whitespace-pre-wrap">{toolData.state.content}</p>
             )}
             {toolId === 'timer' && (
               <p>Duration: {Math.floor(toolData.state.elapsedSeconds / 60)} minutes</p>
             )}
             {/* Add other tools as needed */}
           </div>
         ))}
       </div>
     );
   }
   ```

3. **Update TaskCard condition**:
   ```tsx
   {childId && (
     (task.template_id && task.completion_count && task.completion_count > 0) ||
     (!task.template_id && task.status === "completed")
   ) && (
     <button onClick={...}>View Attempts</button>
   )}
   ```

## Key Differences: Template Tasks vs Standard Tasks

### Template Tasks
- **Purpose**: Structured learning activities with specific questions/problems
- **Execution**: Plugin-based (e.g., addition-subtraction, reading comprehension)
- **Completion Data**: Template-specific answers (e.g., math answers, reading responses)
- **Evaluation**: Automatic scoring via template handler
- **Multi-completion**: Yes (practice multiple times per day)
- **Tools**: Optional, supplementary to template content
- **Storage**: `task_completions` with `template_id` set

### Standard Tasks
- **Purpose**: General tasks without structured content (e.g., "Clean room", "Homework")
- **Execution**: Free-form, child decides what to do
- **Completion Data**: Tool data only (notes, timer, attachments)
- **Evaluation**: Parent review or simple completion
- **Multi-completion**: Currently no (could be added in future)
- **Tools**: Primary way to capture task details
- **Storage**: `task_completions` with `template_id` empty/null

### Completion Record Comparison

| Field | Template Task | Standard Task |
|-------|--------------|---------------|
| `template_id` | Plugin ID (e.g., "addition-subtraction") | `""` or `null` |
| `detailed_data` | Plugin-specific answers | Tool data from `progress_state` |
| `measured_data` | Plugin-calculated scores/metrics | Duration, tools used |
| `session_number` | Attempt number for same day | Usually 1 (no multi-completion yet) |
| `attachments` | Optional photos/videos | Optional photos/videos |
| `llm_analysis` | AI evaluation of answers | Currently not used |

## Migration

No migration needed - this is a new feature. Existing completed standard tasks won't have completion records, which is acceptable.

## Testing Plan

1. **Create standard task** with tools enabled
2. **Start task** and use timer + notes
3. **Complete task** and verify completion record created
4. **View attempts** from parent portal
5. **Verify tool data** is displayed correctly
6. **Uncomplete and re-complete** task, verify second completion record

## Future Enhancements

1. **Multi-completion for standard tasks**: Allow children to complete task multiple times
2. **AI analysis**: LLM could analyze notes content for insights
3. **Comparison view**: Compare multiple completion attempts
4. **Export tool data**: Export notes/attachments in bulk
