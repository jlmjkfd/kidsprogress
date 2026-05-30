# Task Completion for Recurring Tasks - Issue Analysis

> **Date**: 2025-12-11
> **Status**: 🔴 CRITICAL BUG FOUND
> **Severity**: HIGH - Code will fail at runtime

---

## Executive Summary

**Issue**: The `submit_task_completion()` endpoint in [completion_routes.py](backend/routes/completion_routes.py) uses undefined variables `is_virtual_task` and `template_id_str`, which will cause a runtime error when processing task completions.

**Impact**: Task completions for **both virtual and real tasks** will fail with `NameError: name 'is_virtual_task' is not defined`.

---

## Database Schema (Correct Implementation ✅)

The `TaskCompletion` model properly handles recurring tasks:

**File**: [backend/models/task_template.py:72-102](backend/models/task_template.py)

```python
class TaskCompletion(BaseModel):
    """Task completion record (separate from Task instances)."""
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    completion_id: str = Field(..., description="Unique completion identifier")

    # References
    task_id: PyObjectId = Field(..., description="Task instance that was completed")
    child_id: PyObjectId = Field(..., description="Child who completed task")
    template_id: str = Field(..., description="Template used for this task")

    # Multi-completion tracking
    session_number: int = Field(default=1, description="Which attempt number (1, 2, 3...)")
    scheduled_date: Optional[str] = Field(None, description="YYYY-MM-DD format for grouping completions by date")

    # ... other fields
```

**Key Fields for Recurring Tasks**:
1. **`task_id`**: For virtual tasks, this stores the **template ID** (ObjectId of the recurring task template)
2. **`scheduled_date`**: Stores the **specific occurrence date** in "YYYY-MM-DD" format
3. **`session_number`**: Tracks which attempt this is for the same date (for multi-completion tasks)

**Example**:
```json
{
  "task_id": "507f1f77bcf86cd799439011",  // Template ID for virtual task
  "scheduled_date": "2025-12-10",          // Specific day this task was for
  "session_number": 1,                     // First attempt on this day
  "template_id": "writing_practice",
  // ... other fields
}
```

---

## Backend Implementation Analysis

### ✅ Correctly Implemented Sections

#### 1. Session Number Calculation (Lines 168-188)

```python
from backend.models.task_identifier import TaskIdentifier
identifier = TaskIdentifier(raw_id=task_id)

# Calculate session number for this completion
scheduled_date = task_obj.scheduled_date.strftime("%Y-%m-%d") if task_obj.scheduled_date else None

# Query by template ID for virtual tasks, task ID for real tasks
if identifier.is_virtual:
    template_id_obj = ObjectId(identifier.template_id)
    existing_completions = await completions_collection.count_documents({
        "task_id": template_id_obj,
        "scheduled_date": scheduled_date
    })
else:
    # Real task
    existing_completions = await completions_collection.count_documents({
        "task_id": ObjectId(task_id),
        "scheduled_date": scheduled_date
    })
session_number = existing_completions + 1
```

**✅ This is correct**: Uses `TaskIdentifier` to detect virtual tasks and queries by template ID + scheduled_date.

#### 2. Scheduled Date Storage (Lines 214-216)

```python
# Add session tracking
completion.session_number = session_number
completion.scheduled_date = scheduled_date
```

**✅ This is correct**: Properly stores scheduled_date on the completion object.

---

### 🔴 CRITICAL BUG - Undefined Variables (Lines 206, 254-270, 311)

#### Problem 1: Line 206 - Undefined Variables

```python
# For virtual tasks, use template ID; for real tasks, use task_id
completion_task_id = template_id_str if is_virtual_task and template_id_str else task_id
```

**Bug**: `is_virtual_task` and `template_id_str` are **never defined**.

**Should be**:
```python
# For virtual tasks, use template ID; for real tasks, use task_id
completion_task_id = identifier.template_id if identifier.is_virtual else task_id
```

#### Problem 2: Lines 253-260 - Undefined Variables

```python
# Extract actual template ID for virtual tasks (is_virtual_task already defined above)
if is_virtual_task and template_id_str:
    try:
        actual_task_id = ObjectId(template_id_str)
    except:
        actual_task_id = None
else:
    actual_task_id = ObjectId(task_id)
```

**Bug**: Same undefined variables. Comment says "already defined above" but they aren't!

**Should be**:
```python
# Extract actual task ID for database operations
if identifier.is_virtual:
    try:
        actual_task_id = ObjectId(identifier.template_id)
    except:
        actual_task_id = None
else:
    actual_task_id = ObjectId(task_id)
```

#### Problem 3: Lines 270, 311 - Undefined Variable

```python
if not is_virtual_task and actual_task_id and is_multi_completion:
    # ... update task status

elif not is_virtual_task and actual_task_id:
    # ... update task status
```

**Bug**: `is_virtual_task` is undefined.

**Should be**:
```python
if not identifier.is_virtual and actual_task_id and is_multi_completion:
    # ... update task status

elif not identifier.is_virtual and actual_task_id:
    # ... update task status
```

---

## Frontend Implementation (Correct ✅)

The frontend doesn't need to know about `scheduled_date` - it's handled automatically by the backend:

**File**: [frontend/src/api/mutations/useCompletionMutations.ts](frontend/src/api/mutations/useCompletionMutations.ts)

```typescript
export function useSubmitCompletion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      data,
    }: {
      taskId: string;  // Can be virtual task ID: "507f...._2025-12-10"
      data: SubmitCompletionRequest;
    }) => {
      const response = await apiClient.post<SubmitCompletionResponse>(
        `/api/completions/${taskId}/submit`,
        data
      );
      return response.data;
    },
    // ...
  });
}
```

**✅ This is correct**: Frontend just passes the task_id (which can be virtual). Backend extracts scheduled_date from the task object.

---

## How It Should Work (Design)

### For Virtual Tasks (Recurring Task Instances)

1. **Virtual Task ID Format**: `{template_id}_{date}` (e.g., `507f1f77bcf86cd799439011_2025-12-10`)

2. **Backend Flow**:
   ```python
   # Parse virtual task ID
   identifier = TaskIdentifier(raw_id="507f1f77bcf86cd799439011_2025-12-10")
   identifier.is_virtual  # True
   identifier.template_id  # "507f1f77bcf86cd799439011"
   identifier.occurrence_date  # date(2025, 12, 10)

   # Get task object (returns virtual instance with scheduled_date=2025-12-10)
   task_obj = await service.get_task_by_id(task_id, parent_id)

   # Extract scheduled_date from task
   scheduled_date = task_obj.scheduled_date.strftime("%Y-%m-%d")  # "2025-12-10"

   # Save completion with template_id and scheduled_date
   completion = TaskCompletion(
       task_id=ObjectId(identifier.template_id),  # Template ObjectId
       scheduled_date=scheduled_date,              # "2025-12-10"
       session_number=1,
       # ... other fields
   )
   ```

3. **Database Query** (to get existing completions for this day):
   ```python
   existing_completions = await completions_collection.count_documents({
       "task_id": ObjectId("507f1f77bcf86cd799439011"),  # Template ID
       "scheduled_date": "2025-12-10"                     # Specific date
   })
   ```

### For Real Tasks (One-time or Non-recurring)

1. **Real Task ID**: Standard ObjectId (e.g., `507f1f77bcf86cd799439011`)

2. **Backend Flow**:
   ```python
   # Parse real task ID
   identifier = TaskIdentifier(raw_id="507f1f77bcf86cd799439011")
   identifier.is_virtual  # False
   identifier.is_real     # True

   # Get task object
   task_obj = await service.get_task_by_id(task_id, parent_id)

   # Extract scheduled_date from task (if any)
   scheduled_date = task_obj.scheduled_date.strftime("%Y-%m-%d") if task_obj.scheduled_date else None

   # Save completion with task_id
   completion = TaskCompletion(
       task_id=ObjectId(task_id),  # Real task ObjectId
       scheduled_date=scheduled_date,  # Date of the task (optional)
       session_number=1,
       # ... other fields
   )
   ```

---

## Why This Design Makes Sense

### 1. Efficient Querying

**Get all completions for a specific day of a recurring task**:
```python
completions = await completions_collection.find({
    "task_id": ObjectId(template_id),  # Recurring task template
    "scheduled_date": "2025-12-10"      # Specific day
}).to_list()
```

**Get all completions for a recurring task (all days)**:
```python
completions = await completions_collection.find({
    "task_id": ObjectId(template_id)  # Recurring task template
}).to_list()
```

### 2. Multi-Completion Support

If a task allows multiple completions per day (e.g., "Practice writing 3 times"):

```python
# First attempt on 2025-12-10
{
    "task_id": ObjectId("507f..."),
    "scheduled_date": "2025-12-10",
    "session_number": 1
}

# Second attempt on 2025-12-10
{
    "task_id": ObjectId("507f..."),
    "scheduled_date": "2025-12-10",
    "session_number": 2
}

# Third attempt on 2025-12-10
{
    "task_id": ObjectId("507f..."),
    "scheduled_date": "2025-12-10",
    "session_number": 3
}
```

### 3. Separation of Concerns

- **`task_id`**: Points to the template (for recurring) or real task (for one-time)
- **`scheduled_date`**: Disambiguates which day this completion is for
- **`session_number`**: Disambiguates multiple attempts on the same day

---

## Recommended Fix

**File**: [backend/routes/completion_routes.py](backend/routes/completion_routes.py)

### Fix 1: Line 206

**Current (BROKEN)**:
```python
completion_task_id = template_id_str if is_virtual_task and template_id_str else task_id
```

**Fixed**:
```python
# For virtual tasks, use template ID string; for real tasks, use task_id
completion_task_id = identifier.template_id if identifier.is_virtual else task_id
```

### Fix 2: Lines 253-260

**Current (BROKEN)**:
```python
# Extract actual template ID for virtual tasks (is_virtual_task already defined above)
if is_virtual_task and template_id_str:
    try:
        actual_task_id = ObjectId(template_id_str)
    except:
        actual_task_id = None
else:
    actual_task_id = ObjectId(task_id)
```

**Fixed**:
```python
# Extract actual task ID for database operations
if identifier.is_virtual:
    try:
        actual_task_id = ObjectId(identifier.template_id)
    except:
        actual_task_id = None
else:
    try:
        actual_task_id = ObjectId(task_id)
    except:
        actual_task_id = None
```

### Fix 3: Lines 270, 311

**Current (BROKEN)**:
```python
if not is_virtual_task and actual_task_id and is_multi_completion:
    # ...

elif not is_virtual_task and actual_task_id:
    # ...
```

**Fixed**:
```python
if not identifier.is_virtual and actual_task_id and is_multi_completion:
    # ...

elif not identifier.is_virtual and actual_task_id:
    # ...
```

---

## Testing Recommendations

After applying the fix, test these scenarios:

### Test Case 1: Complete Virtual Task (Recurring Task Instance)
```bash
POST /api/completions/507f1f77bcf86cd799439011_2025-12-10/submit
{
  "child_id": "507f...",
  "completion_data": { ... }
}

# Expected: Completion saved with:
# - task_id: ObjectId("507f1f77bcf86cd799439011")
# - scheduled_date: "2025-12-10"
# - session_number: 1
```

### Test Case 2: Complete Virtual Task Multiple Times (Same Day)
```bash
# First completion
POST /api/completions/507f1f77bcf86cd799439011_2025-12-10/submit

# Second completion (same day)
POST /api/completions/507f1f77bcf86cd799439011_2025-12-10/submit

# Expected: session_number increments to 2
```

### Test Case 3: Complete Real Task (One-time)
```bash
POST /api/completions/507f1f77bcf86cd799439011/submit
{
  "child_id": "507f...",
  "completion_data": { ... }
}

# Expected: Completion saved with:
# - task_id: ObjectId("507f1f77bcf86cd799439011")
# - scheduled_date: "2025-12-10" (from task.scheduled_date)
# - session_number: 1
```

### Test Case 4: Query Completions for Specific Day
```bash
GET /api/completions?task_id=507f1f77bcf86cd799439011_2025-12-10

# Expected: Returns all completions for template 507f... on 2025-12-10
```

---

## Summary

### ✅ What's Working
1. **Database schema** correctly designed with `task_id` and `scheduled_date` fields
2. **Session number calculation** correctly uses `TaskIdentifier` to distinguish virtual vs real tasks
3. **Frontend** correctly passes task_id (can be virtual) to backend
4. **Query logic** in GET endpoints correctly handles virtual task IDs

### 🔴 What's Broken
1. **Undefined variables** `is_virtual_task` and `template_id_str` used on lines 206, 254, 270, 311
2. Will cause **runtime NameError** when any task completion is submitted
3. Code was likely refactored to use `TaskIdentifier` but these lines were missed

### 🔧 Fix Required
Replace all occurrences of:
- `is_virtual_task` → `identifier.is_virtual`
- `template_id_str` → `identifier.template_id`

**Priority**: 🔴 **HIGH** - This is a critical bug that will break all task completions.

---

**Next Steps**:
1. Apply the recommended fixes to [completion_routes.py](backend/routes/completion_routes.py)
2. Run the suggested test cases
3. Verify completions are saved correctly with `scheduled_date` field
4. Consider adding integration tests to prevent regressions
