# Task Management System - Test Cases (Phase 1A)

## Test Coverage Summary
- [ ] Unit Tests - Task Metadata Models
- [ ] Unit Tests - Task Collection Model
- [ ] Unit Tests - Task Model
- [ ] Unit Tests - Backend Services (Phase 1B)
- [ ] Integration Tests - Task API (Phase 1B)
- [ ] E2E Tests - Task Flows (Phase 1C)

## Unit Tests

### Backend - Models (Phase 1A: Complete)

#### TaskTypeDefinition Model (backend/models/task_metadata.py)
- [ ] Creates task type with required fields
- [ ] Validates code is unique
- [ ] Validates code format (lowercase, underscores only)
- [ ] is_system defaults to false
- [ ] active defaults to true
- [ ] suggested_tools is optional list
- [ ] suggested_metrics is optional list
- [ ] Serializes to JSON correctly
- [ ] Deserializes from database correctly

#### MetricTypeDefinition Model (backend/models/task_metadata.py)
- [ ] Creates metric type with required fields
- [ ] Validates code is unique
- [ ] Validates data_type enum (integer, decimal, duration, boolean)
- [ ] Validates min_value <= max_value
- [ ] is_system defaults to false
- [ ] active defaults to true
- [ ] unit is required string
- [ ] Serializes to JSON correctly

#### TaskCollection Model (backend/models/task_collection.py)
- [ ] Creates collection with required fields
- [ ] child_id is required ObjectId
- [ ] parent_id is required ObjectId
- [ ] name is required string
- [ ] is_default defaults to false
- [ ] is_archived defaults to false
- [ ] color and icon are optional
- [ ] created_at auto-generated
- [ ] Serializes to JSON correctly

#### Task Model (backend/models/task.py)

##### Basic Fields
- [ ] Creates task with minimum required fields
- [ ] collection_id is required ObjectId
- [ ] child_id is required ObjectId
- [ ] parent_id is required ObjectId
- [ ] title is required string
- [ ] description is optional string
- [ ] task_type_code is optional string
- [ ] created_at auto-generated

##### TaskStatus Enum
- [ ] Accepts all valid statuses (DRAFT, SCHEDULED, IN_PROGRESS, PAUSED, COMPLETED, CANCELLED, ARCHIVED)
- [ ] Rejects invalid status
- [ ] Defaults to DRAFT

##### ActivationRule Enum
- [ ] Accepts MANUAL, DATE_BASED, DEPENDENCY
- [ ] Defaults to MANUAL

##### TaskConstraints Sub-model
- [ ] available_from is optional datetime
- [ ] available_until is optional datetime
- [ ] must_complete_by is optional datetime
- [ ] cannot_start_before_time is optional time
- [ ] cannot_start_after_time is optional time
- [ ] prerequisite_tasks is optional list of ObjectIds
- [ ] is_recurring defaults to false
- [ ] recurrence_pattern is optional dict

##### TaskPauseRecord Sub-model
- [ ] paused_at is required datetime
- [ ] resumed_at is optional datetime
- [ ] paused_by is required string (parent/child)
- [ ] reason is optional string

##### QuantifiableMetric Sub-model
- [ ] metric_type_code is required string
- [ ] target_value is required float
- [ ] actual_value is optional float
- [ ] Validates target_value > 0

##### QualityAspect Sub-model
- [ ] name is required string
- [ ] description is optional string
- [ ] evaluation_method is required enum
- [ ] Accepts AI_EVALUATION, PARENT_REVIEW, SELF_ASSESSMENT, NONE
- [ ] criteria is optional string
- [ ] rating is optional (1-5)
- [ ] feedback is optional string

##### MediaAttachment Sub-model
- [ ] file_url is required string
- [ ] file_type is required string
- [ ] purpose is required enum (WORK_SUBMISSION, MOMENT, PROGRESS_PHOTO)
- [ ] uploaded_at auto-generated
- [ ] evaluation_result is optional dict

##### ToolUsage Sub-model
- [ ] tool_code is required string
- [ ] enabled defaults to true
- [ ] config is optional dict

##### AIGeneratedAttributes Sub-model
- [ ] All fields are optional
- [ ] suggested_task_type_code is string
- [ ] suggested_metrics is list
- [ ] suggested_quality_aspects is list
- [ ] suggested_tools is list
- [ ] estimated_duration_minutes is int
- [ ] estimated_difficulty is int (1-5)
- [ ] parent_reviewed defaults to false

##### Subtask Sub-model
- [ ] title is required string
- [ ] description is optional string
- [ ] completed defaults to false
- [ ] completed_at is optional datetime
- [ ] order is required int

##### Complete Task Validation
- [ ] Can create task with all sub-models populated
- [ ] pause_history can store multiple pause records
- [ ] metrics can store multiple quantifiable metrics
- [ ] quality_aspects can store multiple aspects
- [ ] attachments can store multiple files
- [ ] tools can enable multiple tools
- [ ] subtasks can have multiple items

### Backend - Seed Script (Phase 1A: Complete)

#### Seed Task Types (backend/scripts/seed_task_types.py)
- [ ] Seeds 6 system task types (academic, practice, chore, creative, physical, social)
- [ ] All seeded types have is_system=true
- [ ] Each type has suggested_tools
- [ ] Each type has suggested_metrics
- [ ] Idempotent (can run multiple times without duplicates)
- [ ] Updates existing system types if changed

#### Seed Metric Types
- [ ] Seeds metric types (pages_read, problems_solved, words_written, duration_minutes, repetitions, distance, accuracy_percentage)
- [ ] All seeded metrics have is_system=true
- [ ] Correct data_type for each metric
- [ ] Correct unit for each metric
- [ ] Min/max values set where appropriate
- [ ] Idempotent

### Backend - Services (Phase 1B: Not Yet Implemented)

**Status**: ❌ No tests created yet

**Files to create**:
- `backend/services/__tests__/test_child_service.py`
- `backend/services/__tests__/test_task_metadata_service.py`
- `backend/services/__tests__/test_task_collection_service.py`
- `backend/services/__tests__/test_task_service.py`

#### ChildService - Auto-create TaskCollection
**File**: `backend/services/__tests__/test_child_service.py`
- [ ] `create_child()` - Creates default TaskCollection
- [ ] Default collection name is "My Tasks"
- [ ] Default collection has is_default=true
- [ ] Default collection linked to correct child_id and parent_id
- [ ] Fails gracefully if collection creation fails

#### TaskMetadataService (to be implemented)
**File**: `backend/services/__tests__/test_task_metadata_service.py`
- [ ] `get_task_types()` - Returns all active task types
- [ ] `get_task_types()` - Filters by is_system if requested
- [ ] `get_metric_types()` - Returns all active metric types
- [ ] `create_custom_task_type()` - Parent can create custom type
- [ ] `create_custom_task_type()` - Validates parent_id
- [ ] `create_custom_task_type()` - Sets is_system=false
- [ ] `deactivate_custom_task_type()` - Only non-system types
- [ ] `get_metric_by_code()` - Returns metric definition
- [ ] `create_custom_metric()` - Parent can create custom metric

#### TaskCollectionService (to be implemented)
**File**: `backend/services/__tests__/test_task_collection_service.py`
- [ ] `get_collections_by_child()` - Returns all collections for child
- [ ] `get_collections_by_child()` - Excludes archived if requested
- [ ] `create_collection()` - Creates new collection
- [ ] `create_collection()` - Validates parent owns child
- [ ] `update_collection()` - Updates name, color, icon
- [ ] `archive_collection()` - Sets is_archived=true
- [ ] `delete_collection()` - Only if no tasks in collection
- [ ] `get_default_collection()` - Returns is_default collection

#### TaskService (to be implemented)
**File**: `backend/services/__tests__/test_task_service.py`
- [ ] `create_task()` - Creates task in collection
- [ ] `create_task()` - Validates collection_id belongs to child
- [ ] `create_task()` - Validates parent owns child
- [ ] `create_task()` - Sets status to DRAFT by default
- [ ] `get_tasks_by_collection()` - Returns tasks in collection
- [ ] `get_task_by_id()` - Returns single task
- [ ] `update_task()` - Updates task fields
- [ ] `update_task()` - Only parent can edit
- [ ] `delete_task()` - Soft delete (status=CANCELLED)
- [ ] `activate_task()` - Changes DRAFT -> SCHEDULED
- [ ] `activate_task()` - Validates ActivationRule
- [ ] `start_task()` - Changes SCHEDULED -> IN_PROGRESS
- [ ] `start_task()` - Creates ActiveTaskSession
- [ ] `start_task()` - Checks for concurrent tasks
- [ ] `pause_task()` - Changes IN_PROGRESS -> PAUSED
- [ ] `pause_task()` - Records TaskPauseRecord
- [ ] `resume_task()` - Changes PAUSED -> IN_PROGRESS
- [ ] `resume_task()` - Updates current_pause with resumed_at
- [ ] `complete_task()` - Changes IN_PROGRESS -> COMPLETED
- [ ] `complete_task()` - Deletes ActiveTaskSession
- [ ] `complete_task()` - Calculates points_earned
- [ ] `cancel_task()` - Changes to CANCELLED
- [ ] `archive_task()` - Changes COMPLETED -> ARCHIVED
- [ ] `check_concurrent_tasks()` - Returns active tasks for child

## Integration Tests (Phase 1B)

**Status**: ❌ No tests created yet

**Files to create**:
- `backend/routes/__tests__/test_children.py`
- `backend/routes/__tests__/test_task_metadata.py`
- `backend/routes/__tests__/test_task_collections.py`
- `backend/routes/__tests__/test_tasks.py`

### Child API (with TaskCollection integration)
**File**: `backend/routes/__tests__/test_children.py`
- [ ] POST /api/children → creates child and default collection
- [ ] GET /api/collections?child_id={new_child_id} → includes "My Tasks"
- [ ] Verify default collection has is_default=true

### Task Metadata API
**File**: `backend/routes/__tests__/test_task_metadata.py`
- [ ] GET /api/task-types → returns system types
- [ ] GET /api/task-types?include_custom=true → includes custom types
- [ ] POST /api/task-types → creates custom type
- [ ] GET /api/metric-types → returns all metrics
- [ ] POST /api/metric-types → creates custom metric
- [ ] Requires authentication
- [ ] Validates parent_id ownership

### Task Collection API
**File**: `backend/routes/__tests__/test_task_collections.py`
- [ ] GET /api/collections?child_id={id} → returns child's collections
- [ ] POST /api/collections → creates collection
- [ ] PUT /api/collections/{id} → updates collection
- [ ] DELETE /api/collections/{id} → archives collection
- [ ] Cannot delete collection with tasks
- [ ] Requires authentication
- [ ] Validates parent owns child

### Task CRUD API
**File**: `backend/routes/__tests__/test_tasks.py`
- [ ] POST /api/tasks → creates task
- [ ] GET /api/tasks?collection_id={id} → lists tasks
- [ ] GET /api/tasks/{id} → gets single task
- [ ] PUT /api/tasks/{id} → updates task
- [ ] DELETE /api/tasks/{id} → cancels task
- [ ] Requires authentication
- [ ] Validates parent owns child/collection

### Task Lifecycle API
**File**: `backend/routes/__tests__/test_tasks.py` (continued)
- [ ] POST /api/tasks/{id}/activate → activates task
- [ ] POST /api/tasks/{id}/start → starts task
- [ ] POST /api/tasks/{id}/start → returns concurrent task warning
- [ ] POST /api/tasks/{id}/pause → pauses task
- [ ] POST /api/tasks/{id}/resume → resumes task
- [ ] POST /api/tasks/{id}/complete → completes task
- [ ] Cannot start DRAFT task (must activate first)
- [ ] Cannot complete PAUSED task (must resume first)

## E2E Tests (Phase 1C - Frontend Integration)

### Task Type and Metric Discovery
- [ ] Parent views available task types
- [ ] Parent views system task types
- [ ] Parent creates custom task type
- [ ] Parent views available metrics

### Task Collection Management
- [ ] Parent creates new child → sees "My Tasks" collection
- [ ] Parent creates additional collection "Homework"
- [ ] Parent renames collection
- [ ] Parent archives old collection
- [ ] Archived collection not shown in task creation

### Basic Task Creation
- [ ] Parent creates simple task (title only)
- [ ] Parent creates task with description
- [ ] Parent selects task type from dropdown
- [ ] Parent adds quantifiable metric (e.g., "Read 20 pages")
- [ ] Parent adds quality aspect (e.g., "Handwriting Quality")
- [ ] Parent enables tools (e.g., timer, dictionary)
- [ ] Parent saves task to collection

### Task Lifecycle (Child View)
- [ ] Child views tasks in collection
- [ ] Child activates DRAFT task (if allowed)
- [ ] Child starts SCHEDULED task
- [ ] System detects child has another task in progress
- [ ] Concurrent task warning modal appears
- [ ] Child chooses to pause previous task
- [ ] Child works on task
- [ ] Child pauses task with reason
- [ ] Child resumes paused task
- [ ] Child completes task
- [ ] Points calculated and awarded

### Task with Metrics
- [ ] Parent creates task with metric "Solve 10 problems"
- [ ] Child starts task
- [ ] Child submits actual_value "10"
- [ ] Task marked complete
- [ ] Metric achievement displayed

### Task with Media Submission
- [ ] Parent creates task with quality aspect requiring AI evaluation
- [ ] Child completes work
- [ ] Child uploads photo (purpose=WORK_SUBMISSION)
- [ ] System routes to AI evaluation workflow (placeholder)
- [ ] Evaluation result shown to child

### Task with Subtasks
- [ ] Parent creates task "Clean Room"
- [ ] Parent adds subtasks: "Make bed", "Organize desk", "Vacuum"
- [ ] Child starts task
- [ ] Child checks off subtasks one by one
- [ ] All subtasks complete → task complete

### Pause and Resume Flow
- [ ] Child starts task A
- [ ] Child starts task B → concurrent warning
- [ ] Child pauses task A
- [ ] Child works on task B
- [ ] Child completes task B
- [ ] Child resumes task A from paused list
- [ ] Child completes task A

### Task Constraints
- [ ] Parent creates task with available_from date in future
- [ ] Task not shown as available until date
- [ ] Task becomes available on date
- [ ] Parent creates task with must_complete_by deadline
- [ ] System shows deadline warning as date approaches

## Test Files

### Backend
- `backend/models/__tests__/test_task_metadata.py`
- `backend/models/__tests__/test_task_collection.py`
- `backend/models/__tests__/test_task.py`
- `backend/scripts/__tests__/test_seed_task_types.py`
- `backend/services/__tests__/test_task_metadata_service.py` (Phase 1B)
- `backend/services/__tests__/test_task_collection_service.py` (Phase 1B)
- `backend/services/__tests__/test_task_service.py` (Phase 1B)
- `backend/routes/__tests__/test_task_metadata.py` (Phase 1B)
- `backend/routes/__tests__/test_task_collections.py` (Phase 1B)
- `backend/routes/__tests__/test_tasks.py` (Phase 1B)

### Frontend (Phase 1C)

**Status**: ❌ No tests created yet

**Frontend API Hooks - Missing Tests**:
- `frontend/src/api/mutations/__tests__/useCreateChild.test.tsx`
- `frontend/src/api/mutations/__tests__/useVerifyChildPin.test.tsx`
- `frontend/src/api/mutations/__tests__/useTaskMutations.test.tsx`
- `frontend/src/api/mutations/__tests__/useTaskMetadataMutations.test.tsx`
- `frontend/src/api/mutations/__tests__/useTaskCollectionMutations.test.tsx`
- `frontend/src/api/queries/__tests__/useCurrentUser.test.tsx`
- `frontend/src/api/queries/__tests__/useChildren.test.tsx`
- `frontend/src/api/queries/__tests__/useChild.test.tsx`
- `frontend/src/api/queries/__tests__/useTasks.test.tsx`
- `frontend/src/api/queries/__tests__/useTaskMetadata.test.tsx`
- `frontend/src/api/queries/__tests__/useTaskCollections.test.tsx`

**Frontend Components - Missing Tests**:
- Child management components
- Task creation/editing components
- Task card/list components
- Task status components
- Task metadata/collection components

### E2E (Phase 1C)
- `e2e/tests/task-collection-management.spec.ts`
- `e2e/tests/task-creation.spec.ts`
- `e2e/tests/task-lifecycle.spec.ts`
- `e2e/tests/task-concurrent-warning.spec.ts`
- `e2e/tests/task-with-metrics.spec.ts`
- `e2e/tests/task-with-subtasks.spec.ts`

## Edge Cases & Known Issues

### Edge Cases to Test
- [ ] Task with 0 subtasks
- [ ] Task with 50 subtasks
- [ ] Task with empty description
- [ ] Task with very long title (200+ chars)
- [ ] Task type code with invalid characters
- [ ] Metric with min_value > max_value
- [ ] Concurrent task detection with 5+ active tasks
- [ ] Pause task multiple times
- [ ] Complete task without starting it
- [ ] Delete collection with 100+ tasks
- [ ] Task with available_from in past
- [ ] Task with must_complete_by already passed
- [ ] Prerequisite task chain (A → B → C)
- [ ] Circular prerequisite (A → B → A)

### Known Issues (Phase 1A)
- None - models complete and validated

### Deferred to Later Phases
- AI task planning (Stage 2)
- AI evaluation implementation (Stage 2)
- Recurring task automation (Stage 2)
- Task templates (Stage 3)
- Advanced analytics (Stage 4)

### Testing Priority

**High Priority (Phase 1B):**
- Task CRUD operations
- Task lifecycle transitions
- Concurrent task detection
- TaskCollection auto-creation

**Medium Priority (Phase 1C):**
- Frontend task creation flow
- Child task interaction
- Metrics and subtasks

**Low Priority (Stage 2+):**
- AI-generated attributes
- Complex recurrence patterns
- Dependency chains
- Media evaluation routing

## Enhanced Task Management Testing Timeline

### Phase 1: Backend Foundation (Week 1-2)
**Week 1:**
- Day 1-2: Model tests (Routine, Activity, TimeBlock, Tool)
- Day 3-4: Service tests (routine_service, activity_service)
- Day 5: Service tests (schedule_service, tool_service)

**Week 2:**
- Day 1-2: Route tests (routine_routes, activity_routes)
- Day 3-4: Route tests (schedule_routes, tool_routes)
- Day 5: Cron job tests (daily generator, rollover job)

### Phase 2: AI & Logic (Week 3)
- Day 1-2: AI workflow tests (ai_schedule_agent)
- Day 3: RRULE edge case tests (leap years, DST)
- Day 4: Rollover logic tests (3-rollover limit, backlog)
- Day 5: Concurrent task validation tests

### Phase 3: Frontend Components (Week 4-5)
**Week 4:**
- Day 1-2: API hook tests (routineApi, activityApi, scheduleApi, toolApi)
- Day 3-4: Form component tests (RoutineForm, ActivityForm, RRuleBuilder)
- Day 5: Card component tests (TaskCard, RoutineCard, ActivityPoolCard)

**Week 5:**
- Day 1-2: Calendar component tests (CalendarView, TimeBlockEditor)
- Day 3: Tool component tests (ToolWidget, ToolsPanel, built-in tools)
- Day 4: AI component tests (AIRecommendationButton, ScheduleOverloadWarning)
- Day 5: Page tests (TaskCalendar, Schedule pages)

### Phase 4: Integration & E2E (Week 6)
- Day 1: Backend integration tests (task generation flow)
- Day 2: Backend integration tests (rollover flow, AI recommendation flow)
- Day 3: E2E tests (routine creation → task generation)
- Day 4: E2E tests (activity usage → rule enforcement)
- Day 5: E2E tests (AI recommendation → task start)

### Phase 5: Polish & Edge Cases (Week 7)
- Day 1-2: Edge case testing (RRULE patterns, concurrent edge cases)
- Day 3: Performance testing (100+ tasks, large activity pools)
- Day 4: Cross-browser testing (Chrome, Firefox, Safari)
- Day 5: Mobile responsive testing, final bug fixes

## Test Coverage Goals

### Backend (Enhanced Features)
- **Models**: 100% coverage (all fields validated)
- **Services**: 90%+ coverage (core logic + edge cases)
- **Routes**: 95%+ coverage (all endpoints + auth)
- **Workflows**: 85%+ coverage (AI agent + happy paths)
- **Cron Jobs**: 90%+ coverage (generation + rollover)

### Frontend (Enhanced Features)
- **API Hooks**: 90%+ coverage (all queries/mutations mocked)
- **Components**: 85%+ coverage (render + user interactions)
- **Forms**: 95%+ coverage (validation + submission)
- **Pages**: 80%+ coverage (integration of components)

### Integration
- **Critical Flows**: 100% coverage (task generation, rollover, AI recommendations)
- **Secondary Flows**: 85%+ coverage (concurrent tasks, tool usage)

## Testing Tools

### Backend
- `pytest` - Test runner
- `pytest-asyncio` - Async test support
- `pytest-mock` - Mocking fixtures
- `freezegun` - Time/date mocking for RRULE tests
- `mongomock` - MongoDB mocking (if needed)

### Frontend
- `vitest` - Test runner
- `@testing-library/react` - Component testing
- `@testing-library/user-event` - User interaction simulation
- `msw` - API mocking
- `@testing-library/jest-dom` - Custom matchers

### E2E
- `playwright` - Browser automation
- `@playwright/test` - Test framework
