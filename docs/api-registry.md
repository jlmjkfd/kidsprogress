# API Registry

> Manually updated after feature implementation
> Last updated: 2025-11-07

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

## Statistics
- Total endpoints: 44
- Active in frontend: 7 (existing features)
- Frontend hooks ready: 32 (task management)
- Backend only (ready for frontend): 5
- Unused endpoints: 0
