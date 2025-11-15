# API Registry

> Manually updated after feature implementation
> Last updated: 2025-11-15

## Endpoints

### Authentication

#### POST /api/auth/register
- **Route**: `backend/routes/auth.py`
- **Service**: `backend/services/auth_service.py`
- **Used in**:
  - `frontend/src/pages/register/index.tsx`
  - `frontend/src/api/mutations/useRegister.ts`
- **Status**: ✓ Active

#### POST /api/auth/login
- **Route**: `backend/routes/auth.py`
- **Service**: `backend/services/auth_service.py`
- **Used in**:
  - `frontend/src/pages/login/index.tsx`
  - `frontend/src/api/mutations/useLogin.ts`
- **Status**: ✓ Active

#### GET /api/auth/me
- **Route**: `backend/routes/auth.py`
- **Service**: `backend/services/auth_service.py`
- **Used in**:
  - `frontend/src/api/queries/useCurrentUser.ts`
  - Called after login/register
- **Status**: ✓ Active

#### POST /api/auth/child-login
- **Route**: `backend/routes/auth.py`
- **Service**: `backend/services/child_service.py`, `backend/services/device_service.py`
- **Used in**: Not yet implemented in frontend
- **Status**: ✓ Active (backend only)

### Children

#### GET /api/children
- **Route**: `backend/routes/children.py`
- **Service**: `backend/services/child_service.py`
- **Used in**:
  - `frontend/src/pages/dashboard/index.tsx`
  - `frontend/src/api/queries/useChildren.ts`
- **Status**: ✓ Active

#### POST /api/children
- **Route**: `backend/routes/children.py`
- **Service**: `backend/services/child_service.py`
- **Used in**:
  - `frontend/src/pages/dashboard/components/AddChildModal.tsx`
  - `frontend/src/api/mutations/useCreateChild.ts`
- **Status**: ✓ Active

#### GET /api/children/{id}
- **Route**: `backend/routes/children.py`
- **Service**: `backend/services/child_service.py`
- **Used in**:
  - `frontend/src/pages/child-profile/index.tsx`
  - `frontend/src/api/queries/useChild.ts`
- **Status**: ✓ Active

#### POST /api/children/{child_id}/verify-pin
- **Route**: `backend/routes/children.py`
- **Service**: `backend/services/child_service.py`
- **Used in**:
  - `frontend/src/pages/child-profile/index.tsx`
  - `frontend/src/api/mutations/useVerifyChildPin.ts`
- **Status**: ✓ Active

#### PUT /api/children/{id}
- **Route**: `backend/routes/children.py`
- **Service**: `backend/services/child_service.py`
- **Used in**: Not yet implemented in frontend
- **Status**: ✓ Active (backend only)

#### DELETE /api/children/{id}
- **Route**: `backend/routes/children.py`
- **Service**: `backend/services/child_service.py`
- **Used in**: Not yet implemented in frontend
- **Status**: ✓ Active (backend only)

### Devices

#### POST /api/devices/register
- **Route**: `backend/routes/devices.py`
- **Service**: `backend/services/device_service.py`
- **Used in**: Not yet implemented in frontend
- **Status**: ✓ Active (backend only)

#### GET /api/devices/{token}/children
- **Route**: `backend/routes/devices.py`
- **Service**: `backend/services/device_service.py`
- **Used in**: Not yet implemented in frontend
- **Status**: ✓ Active (backend only)

### Task Metadata

#### GET /api/task-metadata/task-types
- **Route**: `backend/routes/task_metadata.py`
- **Service**: `backend/services/task_metadata_service.py`
- **Used in**:
  - `frontend/src/api/queries/useTaskMetadata.ts` (useTaskTypes)
- **Status**: ✓ Active

#### POST /api/task-metadata/task-types
- **Route**: `backend/routes/task_metadata.py`
- **Service**: `backend/services/task_metadata_service.py`
- **Used in**:
  - `frontend/src/api/mutations/useTaskMetadataMutations.ts` (useCreateTaskType)
- **Status**: ✓ Active (frontend hooks ready)

#### GET /api/task-metadata/task-types/{code}
- **Route**: `backend/routes/task_metadata.py`
- **Service**: `backend/services/task_metadata_service.py`
- **Used in**:
  - `frontend/src/api/queries/useTaskMetadata.ts` (useTaskType)
- **Status**: ✓ Active (frontend hooks ready)

#### PUT /api/task-metadata/task-types/{code}
- **Route**: `backend/routes/task_metadata.py`
- **Service**: `backend/services/task_metadata_service.py`
- **Used in**:
  - `frontend/src/api/mutations/useTaskMetadataMutations.ts` (useUpdateTaskType)
- **Status**: ✓ Active (frontend hooks ready)

#### DELETE /api/task-metadata/task-types/{code}
- **Route**: `backend/routes/task_metadata.py`
- **Service**: `backend/services/task_metadata_service.py`
- **Used in**:
  - `frontend/src/api/mutations/useTaskMetadataMutations.ts` (useDeleteTaskType)
- **Status**: ✓ Active (frontend hooks ready)

#### GET /api/task-metadata/metric-types
- **Route**: `backend/routes/task_metadata.py`
- **Service**: `backend/services/task_metadata_service.py`
- **Used in**:
  - `frontend/src/api/queries/useTaskMetadata.ts` (useMetricTypes)
- **Status**: ✓ Active (frontend hooks ready)

#### POST /api/task-metadata/metric-types
- **Route**: `backend/routes/task_metadata.py`
- **Service**: `backend/services/task_metadata_service.py`
- **Used in**:
  - `frontend/src/api/mutations/useTaskMetadataMutations.ts` (useCreateMetricType)
- **Status**: ✓ Active (frontend hooks ready)

#### GET /api/task-metadata/metric-types/{code}
- **Route**: `backend/routes/task_metadata.py`
- **Service**: `backend/services/task_metadata_service.py`
- **Used in**:
  - `frontend/src/api/queries/useTaskMetadata.ts` (useMetricType)
- **Status**: ✓ Active (frontend hooks ready)

#### PUT /api/task-metadata/metric-types/{code}
- **Route**: `backend/routes/task_metadata.py`
- **Service**: `backend/services/task_metadata_service.py`
- **Used in**:
  - `frontend/src/api/mutations/useTaskMetadataMutations.ts` (useUpdateMetricType)
- **Status**: ✓ Active (frontend hooks ready)

#### DELETE /api/task-metadata/metric-types/{code}
- **Route**: `backend/routes/task_metadata.py`
- **Service**: `backend/services/task_metadata_service.py`
- **Used in**:
  - `frontend/src/api/mutations/useTaskMetadataMutations.ts` (useDeleteMetricType)
- **Status**: ✓ Active (frontend hooks ready)

### Task Collections

#### POST /api/task-collections
- **Route**: `backend/routes/task_collections.py`
- **Service**: `backend/services/task_collection_service.py`
- **Used in**:
  - `frontend/src/api/mutations/useTaskCollectionMutations.ts` (useCreateTaskCollection)
- **Status**: ✓ Active (frontend hooks ready)

#### GET /api/task-collections/child/{child_id}
- **Route**: `backend/routes/task_collections.py`
- **Service**: `backend/services/task_collection_service.py`
- **Used in**:
  - `frontend/src/api/queries/useTaskCollections.ts` (useTaskCollections)
- **Status**: ✓ Active (frontend hooks ready)

#### GET /api/task-collections/{collection_id}
- **Route**: `backend/routes/task_collections.py`
- **Service**: `backend/services/task_collection_service.py`
- **Used in**:
  - `frontend/src/api/queries/useTaskCollections.ts` (useTaskCollection)
- **Status**: ✓ Active (frontend hooks ready)

#### GET /api/task-collections/child/{child_id}/default
- **Route**: `backend/routes/task_collections.py`
- **Service**: `backend/services/task_collection_service.py`
- **Used in**:
  - `frontend/src/api/queries/useTaskCollections.ts` (useDefaultTaskCollection)
- **Status**: ✓ Active (frontend hooks ready)

#### PUT /api/task-collections/{collection_id}
- **Route**: `backend/routes/task_collections.py`
- **Service**: `backend/services/task_collection_service.py`
- **Used in**:
  - `frontend/src/api/mutations/useTaskCollectionMutations.ts` (useUpdateTaskCollection)
- **Status**: ✓ Active (frontend hooks ready)

#### DELETE /api/task-collections/{collection_id}
- **Route**: `backend/routes/task_collections.py`
- **Service**: `backend/services/task_collection_service.py`
- **Used in**:
  - `frontend/src/api/mutations/useTaskCollectionMutations.ts` (useDeleteTaskCollection)
- **Status**: ✓ Active (frontend hooks ready)

### Tasks

#### POST /api/tasks
- **Route**: `backend/routes/tasks.py`
- **Service**: `backend/services/task_service.py`
- **Used in**:
  - `frontend/src/api/mutations/useTaskMutations.ts` (useCreateTask)
- **Status**: ✓ Active (frontend hooks ready)

#### GET /api/tasks/collection/{collection_id}
- **Route**: `backend/routes/tasks.py`
- **Service**: `backend/services/task_service.py`
- **Used in**:
  - `frontend/src/api/queries/useTasks.ts` (useTasksByCollection)
- **Status**: ✓ Active (frontend hooks ready)

#### GET /api/tasks/child/{child_id}
- **Route**: `backend/routes/tasks.py`
- **Service**: `backend/services/task_service.py`
- **Used in**:
  - `frontend/src/api/queries/useTasks.ts` (useTasksByChild)
- **Status**: ✓ Active (frontend hooks ready)

#### GET /api/tasks/{task_id}
- **Route**: `backend/routes/tasks.py`
- **Service**: `backend/services/task_service.py`
- **Used in**:
  - `frontend/src/api/queries/useTasks.ts` (useTask)
- **Status**: ✓ Active (frontend hooks ready)

#### PUT /api/tasks/{task_id}
- **Route**: `backend/routes/tasks.py`
- **Service**: `backend/services/task_service.py`
- **Used in**:
  - `frontend/src/api/mutations/useTaskMutations.ts` (useUpdateTask)
- **Status**: ✓ Active (frontend hooks ready)

#### DELETE /api/tasks/{task_id}
- **Route**: `backend/routes/tasks.py`
- **Service**: `backend/services/task_service.py`
- **Used in**:
  - `frontend/src/api/mutations/useTaskMutations.ts` (useDeleteTask)
- **Status**: ✓ Active (frontend hooks ready)

#### POST /api/tasks/{task_id}/activate
- **Route**: `backend/routes/tasks.py`
- **Service**: `backend/services/task_service.py`
- **Used in**:
  - `frontend/src/api/mutations/useTaskMutations.ts` (useActivateTask)
- **Status**: ✓ Active (frontend hooks ready)

#### POST /api/tasks/{task_id}/start
- **Route**: `backend/routes/tasks.py`
- **Service**: `backend/services/task_service.py`
- **Used in**:
  - `frontend/src/api/mutations/useTaskMutations.ts` (useStartTask)
- **Status**: ✓ Active (frontend hooks ready)
- **Note**: Returns concurrent task warnings

#### POST /api/tasks/{task_id}/pause
- **Route**: `backend/routes/tasks.py`
- **Service**: `backend/services/task_service.py`
- **Used in**:
  - `frontend/src/api/mutations/useTaskMutations.ts` (usePauseTask)
- **Status**: ✓ Active (frontend hooks ready)

#### POST /api/tasks/{task_id}/resume
- **Route**: `backend/routes/tasks.py`
- **Service**: `backend/services/task_service.py`
- **Used in**:
  - `frontend/src/api/mutations/useTaskMutations.ts` (useResumeTask)
- **Status**: ✓ Active (frontend hooks ready)

#### POST /api/tasks/{task_id}/complete
- **Route**: `backend/routes/tasks.py`
- **Service**: `backend/services/task_service.py`
- **Used in**:
  - `frontend/src/api/mutations/useTaskMutations.ts` (useCompleteTask)
- **Status**: ✓ Active (frontend hooks ready)

#### POST /api/tasks/{task_id}/cancel
- **Route**: `backend/routes/tasks.py`
- **Service**: `backend/services/task_service.py`
- **Used in**:
  - `frontend/src/api/mutations/useTaskMutations.ts` (useCancelTask)
- **Status**: ✓ Active (frontend hooks ready)

#### GET /api/tasks/child/{child_id}/active
- **Route**: `backend/routes/tasks.py`
- **Service**: `backend/services/task_service.py`
- **Used in**:
  - `frontend/src/api/queries/useTasks.ts` (useActiveTasks)
- **Status**: ✓ Active (frontend hooks ready)
- **Note**: For concurrent task warning UI

#### POST /api/tasks/{task_id}/rollover
- **Route**: `backend/routes/tasks.py`
- **Service**: `backend/services/task_service.py`
- **Used in**: Not yet implemented
- **Status**: ✓ Active (backend only)
- **Note**: Enhanced task management - rollover incomplete task to new date

#### POST /api/tasks/{task_id}/backlog
- **Route**: `backend/routes/tasks.py`
- **Service**: `backend/services/task_service.py`
- **Used in**: Not yet implemented
- **Status**: ✓ Active (backend only)
- **Note**: Enhanced task management - move task to backlog after 3 rollovers

### Routines (Enhanced Task Management)

#### POST /api/routines
- **Route**: `backend/routes/routine_routes.py`
- **Service**: `backend/services/routine_service.py`
- **Used in**:
  - `frontend/src/pages/parent-portal/children/[id]/routines.tsx`
  - `frontend/src/api/mutations/useRoutineMutations.ts` (useCreateRoutine)
- **Status**: ✓ Active
- **Note**: Create recurring task template with RRULE pattern

#### GET /api/routines
- **Route**: `backend/routes/routine_routes.py`
- **Service**: `backend/services/routine_service.py`
- **Query params**: `child_id`, `include_inactive`
- **Used in**:
  - `frontend/src/pages/parent-portal/children/[id]/routines.tsx`
  - `frontend/src/api/queries/useRoutines.ts`
- **Status**: ✓ Active

#### GET /api/routines/{routine_id}
- **Route**: `backend/routes/routine_routes.py`
- **Service**: `backend/services/routine_service.py`
- **Used in**:
  - `frontend/src/api/queries/useRoutines.ts` (useRoutine)
- **Status**: ✓ Active (frontend hooks ready)

#### PUT /api/routines/{routine_id}
- **Route**: `backend/routes/routine_routes.py`
- **Service**: `backend/services/routine_service.py`
- **Used in**:
  - `frontend/src/pages/parent-portal/children/[id]/routines.tsx`
  - `frontend/src/api/mutations/useRoutineMutations.ts` (useUpdateRoutine)
- **Status**: ✓ Active

#### DELETE /api/routines/{routine_id}
- **Route**: `backend/routes/routine_routes.py`
- **Service**: `backend/services/routine_service.py`
- **Used in**:
  - `frontend/src/pages/parent-portal/children/[id]/routines.tsx`
  - `frontend/src/api/mutations/useRoutineMutations.ts` (useDeleteRoutine)
- **Status**: ✓ Active
- **Note**: Soft delete (sets is_active=false)

#### POST /api/routines/{routine_id}/generate
- **Route**: `backend/routes/routine_routes.py`
- **Service**: `backend/services/routine_service.py`
- **Query params**: `date` (generate task for specific date)
- **Used in**:
  - `frontend/src/api/mutations/useRoutineMutations.ts` (useGenerateRoutineTask)
- **Status**: ✓ Active (frontend hooks ready)
- **Note**: Generate task instance from routine

#### POST /api/routines/{routine_id}/cancel
- **Route**: `backend/routes/routine_routes.py`
- **Service**: `backend/services/routine_service.py`
- **Body**: `skip_date`
- **Used in**:
  - `frontend/src/api/mutations/useRoutineMutations.ts` (useCancelRoutine)
- **Status**: ✓ Active (frontend hooks ready)
- **Note**: Cancel routine instance for specific date

#### GET /api/routines/{routine_id}/preview
- **Route**: `backend/routes/routine_routes.py`
- **Service**: `backend/services/routine_service.py`
- **Query params**: `count` (default 10)
- **Used in**: Frontend implementation pending
- **Status**: ✓ Active (backend only)
- **Note**: Preview next N occurrences

### Activities (Enhanced Task Management)

#### POST /api/activities
- **Route**: `backend/routes/activity_routes.py`
- **Service**: `backend/services/activity_service.py`
- **Used in**:
  - `frontend/src/pages/parent-portal/children/[id]/activities.tsx`
  - `frontend/src/api/mutations/useActivityMutations.ts` (useCreateActivity)
- **Status**: ✓ Active (frontend hooks ready)
- **Note**: Create activity in optional pool

#### GET /api/activities
- **Route**: `backend/routes/activity_routes.py`
- **Service**: `backend/services/activity_service.py`
- **Query params**: `child_id`, `include_inactive`
- **Used in**:
  - `frontend/src/pages/parent-portal/children/[id]/activities.tsx`
  - `frontend/src/api/queries/useActivities.ts`
- **Status**: ✓ Active (frontend hooks ready)

#### GET /api/activities/{activity_id}
- **Route**: `backend/routes/activity_routes.py`
- **Service**: `backend/services/activity_service.py`
- **Used in**:
  - `frontend/src/api/queries/useActivities.ts` (useActivity)
- **Status**: ✓ Active (frontend hooks ready)

#### PUT /api/activities/{activity_id}
- **Route**: `backend/routes/activity_routes.py`
- **Service**: `backend/services/activity_service.py`
- **Used in**:
  - `frontend/src/pages/parent-portal/children/[id]/activities.tsx`
  - `frontend/src/api/mutations/useActivityMutations.ts` (useUpdateActivity)
- **Status**: ✓ Active (frontend hooks ready)

#### DELETE /api/activities/{activity_id}
- **Route**: `backend/routes/activity_routes.py`
- **Service**: `backend/services/activity_service.py`
- **Used in**:
  - `frontend/src/pages/parent-portal/children/[id]/activities.tsx`
  - `frontend/src/api/mutations/useActivityMutations.ts` (useDeleteActivity)
- **Status**: ✓ Active (frontend hooks ready)

#### GET /api/activities/available
- **Route**: `backend/routes/activity_routes.py`
- **Service**: `backend/services/activity_service.py`
- **Query params**: `child_id`, `date`
- **Used in**: Not yet implemented
- **Status**: ⚙️ In Development
- **Note**: Check activity availability based on usage rules

#### POST /api/activities/{activity_id}/create-task
- **Route**: `backend/routes/activity_routes.py`
- **Service**: `backend/services/activity_service.py`
- **Body**: `scheduled_date`
- **Used in**: Not yet implemented
- **Status**: ⚙️ In Development
- **Note**: Create task instance from activity

### Schedule (Enhanced Task Management)

#### GET /api/schedule/daily
- **Route**: `backend/routes/schedule_routes.py`
- **Service**: `backend/services/schedule_service.py`
- **Query params**: `child_id`, `date`
- **Used in**: Not yet implemented
- **Status**: ⚙️ In Development
- **Note**: Get complete daily schedule with tasks, blocks, conflicts

#### GET /api/schedule/conflicts
- **Route**: `backend/routes/schedule_routes.py`
- **Service**: `backend/services/schedule_service.py`
- **Query params**: `child_id`, `date`
- **Used in**: Not yet implemented
- **Status**: ⚙️ In Development
- **Note**: Detect time conflicts for specific date

#### GET /api/schedule/available-slots
- **Route**: `backend/routes/schedule_routes.py`
- **Service**: `backend/services/schedule_service.py`
- **Query params**: `child_id`, `date`, `duration_minutes`
- **Used in**: Not yet implemented
- **Status**: ⚙️ In Development
- **Note**: Find available time slots


### Tools (Enhanced Task Management)

#### GET /api/tools
- **Route**: `backend/routes/tool_routes.py`
- **Service**: `backend/services/tool_service.py`
- **Query params**: `include_inactive`, `system_only`
- **Used in**: Not yet implemented
- **Status**: ⚙️ In Development

#### GET /api/tools/{tool_id}
- **Route**: `backend/routes/tool_routes.py`
- **Service**: `backend/services/tool_service.py`
- **Used in**: Not yet implemented
- **Status**: ⚙️ In Development

#### POST /api/tools
- **Route**: `backend/routes/tool_routes.py`
- **Service**: `backend/services/tool_service.py`
- **Used in**: Not yet implemented
- **Status**: ⚙️ In Development
- **Note**: Create custom tool (parent only)

#### PUT /api/tools/{tool_id}
- **Route**: `backend/routes/tool_routes.py`
- **Service**: `backend/services/tool_service.py`
- **Used in**: Not yet implemented
- **Status**: ⚙️ In Development

#### DELETE /api/tools/{tool_id}
- **Route**: `backend/routes/tool_routes.py`
- **Service**: `backend/services/tool_service.py`
- **Used in**: Not yet implemented
- **Status**: ⚙️ In Development

#### GET /api/tools/applicable
- **Route**: `backend/routes/tool_routes.py`
- **Service**: `backend/services/tool_service.py`
- **Query params**: `task_id`
- **Used in**: Not yet implemented
- **Status**: ⚙️ In Development
- **Note**: Get applicable tools for specific task

### Time Blocks (Enhanced Task Management)

#### POST /api/time-blocks
- **Route**: `backend/routes/time_block_routes.py`
- **Service**: `backend/services/time_block_service.py`
- **Used in**:
  - `frontend/src/api/mutations/useTimeBlockMutations.ts` (useCreateTimeBlock)
- **Status**: ✓ Active (frontend hooks ready)
- **Note**: Create calendar time block or special event

#### GET /api/time-blocks
- **Route**: `backend/routes/time_block_routes.py`
- **Service**: `backend/services/time_block_service.py`
- **Query params**: `child_id`, `date` or `date_range`
- **Used in**:
  - `frontend/src/pages/parent-portal/children/[id]/time-blocks.tsx`
  - `frontend/src/api/queries/useTimeBlocks.ts`
- **Status**: ✓ Active

#### PUT /api/time-blocks/{block_id}
- **Route**: `backend/routes/time_block_routes.py`
- **Service**: `backend/services/time_block_service.py`
- **Used in**:
  - `frontend/src/api/mutations/useTimeBlockMutations.ts` (useUpdateTimeBlock)
- **Status**: ✓ Active (frontend hooks ready)

#### DELETE /api/time-blocks/{block_id}
- **Route**: `backend/routes/time_block_routes.py`
- **Service**: `backend/services/time_block_service.py`
- **Used in**:
  - `frontend/src/pages/parent-portal/children/[id]/time-blocks.tsx`
  - `frontend/src/api/mutations/useTimeBlockMutations.ts` (useDeleteTimeBlock)
- **Status**: ✓ Active

#### POST /api/day-types
- **Route**: `backend/routes/time_block_routes.py`
- **Service**: `backend/services/time_block_service.py`
- **Used in**: Not yet implemented
- **Status**: ⚙️ In Development
- **Note**: Set day type (school_day, weekend, holiday, special_event)

#### GET /api/day-types
- **Route**: `backend/routes/time_block_routes.py`
- **Service**: `backend/services/time_block_service.py`
- **Query params**: `child_id`, `date` or `date_range`
- **Used in**: Not yet implemented
- **Status**: ⚙️ In Development

### AI-Powered Features

#### POST /api/ai/schedule/recommend
- **Route**: `backend/routes/ai_routes.py`
- **Service**: `backend/ai/task_recommender.py`
- **Body**: `child_id`
- **Used in**: Not yet implemented
- **Status**: ✓ Active
- **Note**: AI "What should I do now?" recommendation based on current context

#### POST /api/ai/schedule/plan-day
- **Route**: `backend/routes/ai_routes.py`
- **Service**: `backend/ai/task_recommender.py`
- **Body**: `child_id`, `target_date` (optional)
- **Used in**: Not yet implemented
- **Status**: ✓ Active
- **Note**: Generate complete daily schedule using AI

#### POST /api/ai/schedule/replan
- **Route**: `backend/routes/ai_routes.py`
- **Service**: `backend/ai/task_recommender.py`
- **Body**: `child_id`, `reason`, `completed_task_ids`
- **Used in**: Not yet implemented
- **Status**: ✓ Active
- **Note**: Dynamic replanning when schedule changes

#### GET /api/ai/schedule/explanation
- **Route**: `backend/routes/ai_routes.py`
- **Service**: `backend/ai/gemini_client.py`
- **Query params**: `child_id`, `task_id`
- **Used in**: Not yet implemented
- **Status**: ✓ Active
- **Note**: Get child-friendly explanation for task scheduling decision

## Statistics
- Total endpoints: 86
- Active in frontend: 22 (Enhanced Task Management UI complete)
- Frontend hooks ready: 45 (task management complete)
- Backend only: 15 (Schedule, Tools, AI features)
- AI features: 4 (task planning)
