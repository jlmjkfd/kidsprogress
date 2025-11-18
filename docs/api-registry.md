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

### ❌ OBSOLETE: Routines (Replaced by Unified Task Model)

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

### ❌ OBSOLETE: Activities (Replaced by Unified Task Model)

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

### ❌ OBSOLETE: Time Blocks (Replaced by Unified Task Model)

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

### AI-Powered Features (Phase 3)

#### GET /api/ai/schedule/day-tasks
- **Route**: `backend/routes/ai_schedule_routes.py`
- **Service**: `backend/services/ai_schedule_service.py`
- **Query params**: `child_id`, `target_date` (optional), `parent_id`
- **Used in**:
  - `frontend/src/api/queries/useAISchedule.ts` (useDayTasks)
- **Status**: ✓ Active
- **Note**: Get comprehensive day summary (tasks, time blocks, statistics) for AI scheduling context

#### POST /api/ai/schedule/recommend
- **Route**: `backend/routes/ai_schedule_routes.py`
- **Service**: `backend/services/ai_schedule_service.py`
- **Query params**: `child_id`, `parent_id`
- **Body**: `current_time` (optional for testing), `child_state` (optional)
- **Used in**:
  - `frontend/src/api/queries/useAISchedule.ts` (useAIRecommendation)
  - `frontend/src/components/AIRecommendationButton.tsx`
  - `frontend/src/pages/parent-portal/children/[id]/tasks.tsx`
  - `frontend/src/pages/child-portal/tasks/index.tsx`
- **Status**: ✓ Active
- **Note**: AI "What should I do now?" recommendation with reasoning, priority score, alternatives, and break detection

#### GET /api/ai/schedule/conflicts
- **Route**: `backend/routes/ai_schedule_routes.py`
- **Service**: `backend/services/ai_schedule_service.py`
- **Query params**: `child_id`, `target_date` (optional), `parent_id`
- **Used in**:
  - `frontend/src/api/queries/useAISchedule.ts` (useScheduleConflicts)
  - `frontend/src/pages/parent-portal/children/[id]/tasks.tsx`
- **Status**: ✓ Active
- **Note**: Detect time block overlaps, prerequisite violations, and break needs

#### POST /api/ai/schedule/replan
- **Route**: `backend/routes/ai_schedule_routes.py`
- **Service**: `backend/services/ai_schedule_service.py`
- **Body**: `child_id`, `parent_id`, `current_task_id`, `actual_duration`, `estimated_duration`, `current_time` (optional for testing)
- **Used in**:
  - `frontend/src/api/mutations/useAIScheduleMutations.ts` (useReplanSchedule)
  - `frontend/src/pages/parent-portal/children/[id]/tasks.tsx` (auto-triggered on completion)
- **Status**: ✓ Active
- **Note**: Dynamic replanning when tasks run longer than expected - shifts tasks, moves to tomorrow, or removes optional

### Day Type Calendar (Unified Task Model Support)

#### POST /api/day-types
- **Route**: `backend/routes/day_type_routes.py`
- **Service**: `backend/services/day_type_service.py`
- **Body**: `DayTypeCreate` (child_id, date, day_type, name, description)
- **Used in**:
  - `frontend/src/api/mutations/useDayTypeMutations.ts` (useCreateDayType)
- **Status**: ✓ Active
- **Note**: Create day type entry for specific date (school_day, weekend, holiday, special)

#### GET /api/day-types/date
- **Route**: `backend/routes/day_type_routes.py`
- **Service**: `backend/services/day_type_service.py`
- **Query params**: `child_id`, `date` (YYYY-MM-DD)
- **Used in**:
  - `frontend/src/api/queries/useDayTypes.ts` (useDayType)
- **Status**: ✓ Active
- **Note**: Get day type entry for specific date

#### GET /api/day-types/range
- **Route**: `backend/routes/day_type_routes.py`
- **Service**: `backend/services/day_type_service.py`
- **Query params**: `child_id`, `start_date`, `end_date`
- **Used in**:
  - `frontend/src/api/queries/useDayTypes.ts` (useDayTypesRange)
- **Status**: ✓ Active
- **Note**: Get all day type entries in date range for calendar view

#### GET /api/day-types/effective
- **Route**: `backend/routes/day_type_routes.py`
- **Service**: `backend/services/day_type_service.py`
- **Query params**: `child_id`, `date`
- **Used in**:
  - `frontend/src/api/queries/useDayTypes.ts` (useEffectiveDayType)
- **Status**: ✓ Active
- **Note**: Get effective day type (specific entry or default pattern)

#### PUT /api/day-types/{entry_id}
- **Route**: `backend/routes/day_type_routes.py`
- **Service**: `backend/services/day_type_service.py`
- **Body**: `DayTypeUpdate`
- **Used in**:
  - `frontend/src/api/mutations/useDayTypeMutations.ts` (useUpdateDayType)
- **Status**: ✓ Active

#### DELETE /api/day-types/{entry_id}
- **Route**: `backend/routes/day_type_routes.py`
- **Service**: `backend/services/day_type_service.py`
- **Used in**:
  - `frontend/src/api/mutations/useDayTypeMutations.ts` (useDeleteDayType)
- **Status**: ✓ Active

#### GET /api/day-types/pattern/{child_id}
- **Route**: `backend/routes/day_type_routes.py`
- **Service**: `backend/services/day_type_service.py`
- **Used in**:
  - `frontend/src/api/queries/useDayTypes.ts` (useDefaultDayPattern)
- **Status**: ✓ Active
- **Note**: Get or create default day pattern (Mon-Fri defaults)

#### PUT /api/day-types/pattern/{child_id}
- **Route**: `backend/routes/day_type_routes.py`
- **Service**: `backend/services/day_type_service.py`
- **Body**: `DefaultDayPatternUpdate`
- **Used in**:
  - `frontend/src/api/mutations/useDayTypeMutations.ts` (useUpdateDefaultPattern)
- **Status**: ✓ Active
- **Note**: Update default day pattern for each weekday

### School Calendar

#### POST /api/school-calendar/terms
- **Route**: `backend/routes/school_calendar_routes.py`
- **Service**: `backend/services/school_calendar_service.py`
- **Used in**: `frontend/src/api/mutations/useSchoolCalendarMutations.ts` (useCreateTerm)
- **Status**: ✓ Active
- **Note**: Create school term with start/end dates and school weekdays

#### GET /api/school-calendar/terms?child_id={id}
- **Route**: `backend/routes/school_calendar_routes.py`
- **Service**: `backend/services/school_calendar_service.py`
- **Used in**: `frontend/src/api/queries/useSchoolCalendar.ts` (useTerms)
- **Status**: ✓ Active
- **Note**: Fetch all terms for a child

#### PUT /api/school-calendar/terms/{term_id}
- **Route**: `backend/routes/school_calendar_routes.py`
- **Service**: `backend/services/school_calendar_service.py`
- **Used in**: `frontend/src/api/mutations/useSchoolCalendarMutations.ts` (useUpdateTerm)
- **Status**: ✓ Active

#### DELETE /api/school-calendar/terms/{term_id}
- **Route**: `backend/routes/school_calendar_routes.py`
- **Service**: `backend/services/school_calendar_service.py`
- **Used in**: `frontend/src/api/mutations/useSchoolCalendarMutations.ts` (useDeleteTerm)
- **Status**: ✓ Active

#### POST /api/school-calendar/special-days
- **Route**: `backend/routes/school_calendar_routes.py`
- **Service**: `backend/services/school_calendar_service.py`
- **Used in**: `frontend/src/api/mutations/useSchoolCalendarMutations.ts` (useCreateSpecialDay)
- **Status**: ✓ Active
- **Note**: Create holiday or special school day

#### GET /api/school-calendar/special-days?child_id={id}
- **Route**: `backend/routes/school_calendar_routes.py`
- **Service**: `backend/services/school_calendar_service.py`
- **Used in**: `frontend/src/api/queries/useSchoolCalendar.ts` (useSpecialDays)
- **Status**: ✓ Active

#### PUT /api/school-calendar/special-days/{day_id}
- **Route**: `backend/routes/school_calendar_routes.py`
- **Service**: `backend/services/school_calendar_service.py`
- **Used in**: `frontend/src/api/mutations/useSchoolCalendarMutations.ts` (useUpdateSpecialDay)
- **Status**: ✓ Active

#### DELETE /api/school-calendar/special-days/{day_id}
- **Route**: `backend/routes/school_calendar_routes.py`
- **Service**: `backend/services/school_calendar_service.py`
- **Used in**: `frontend/src/api/mutations/useSchoolCalendarMutations.ts` (useDeleteSpecialDay)
- **Status**: ✓ Active

#### GET /api/school-calendar/day-type?child_id={id}&date={date}
- **Route**: `backend/routes/school_calendar_routes.py`
- **Service**: `backend/services/school_calendar_service.py`
- **Used in**: `frontend/src/api/queries/useSchoolCalendar.ts` (useDayType)
- **Status**: ✓ Active
- **Note**: Get day type for specific date (school_day, weekend, holiday, special_school_day)

#### GET /api/school-calendar/day-types?child_id={id}&start_date={start}&end_date={end}
- **Route**: `backend/routes/school_calendar_routes.py`
- **Service**: `backend/services/school_calendar_service.py`
- **Used in**: `frontend/src/api/queries/useSchoolCalendar.ts` (useDayTypesBatch)
- **Status**: ✓ Active
- **Note**: Batch query for calendar views - efficient day type lookup for date range

## Statistics
- Total endpoints: 108 (+10 School Calendar)
- Active in frontend: 44 (Unified Task Model + School Calendar + Day Types + AI Scheduling)
- Frontend hooks ready: 67 (unified task management + school calendar complete)
- Backend only: 15
- **Obsolete (removed)**: ~40 endpoints (Routines, Activities, Time Blocks - replaced by Unified Task Model)
- AI features: 4
- Day Type Calendar: 8 (Unified Task Model support)
- School Calendar: 10 (Term & Special Day management)

## Migration Notes
- **Unified Task Model**: All task types (one-time, recurring, time-blocks, pool activities) now use `/api/tasks` endpoints
- **Recurrence**: Set `is_recurring=true` and `recurrence_pattern` (RRULE) in task creation
- **Time Blocks**: Set `blocks_other_tasks=true` and `scheduling_type=fixed_time`
- **Activity Pool**: Set `is_in_pool=true` and configure `pool_usage_rules`
- **Day Types**: Use `/api/day-types` to manage school days vs weekends vs holidays (legacy)
- **School Calendar**: Use `/api/school-calendar` to define terms and special days - replaces manual day type management
