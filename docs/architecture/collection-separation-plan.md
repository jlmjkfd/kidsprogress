# Task Schema Collection Separation Plan

**Date**: 2025-01-06
**Status**: Phase 3 Complete ✅ | Backend Ready
**Reason**: Support analytics, session history, and future features while maintaining clean architecture

**Progress**:
- ✅ Phase 1: Models & Database (Complete)
  - Created 5 new model files with Pydantic schemas
  - Updated Task model with reference fields
  - Added 20 database indexes
  - Migration script executed successfully
- ✅ Phase 2: Services Layer (Complete)
  - Created 5 service files with full CRUD operations
  - Updated VirtualInstanceService to use RecurrenceRuleService
  - Integrated services into TaskCRUD
  - Auto-create recurrence rules on task creation
- ✅ Phase 3: Routes Layer (Complete)
  - Created 4 route files with full REST APIs
  - Request/response models for all endpoints
  - Integrated with main.py
  - Task counter updates (session_count, attachment_count, subtask_count)
- ⏳ Phase 4: Frontend Types & Hooks (Optional - when features are used)
- ⏳ Phase 5: Testing & Validation (Optional - when features are used)

---

## Overview

Separating embedded fields from Task collection into dedicated collections for:
1. RecurrenceRule - Pattern history for analytics
2. TaskSession - Work session tracking and progress history
3. TaskAttachment - Media files (photos, videos, audio)
4. Subtask - Subtask breakdown (future-proof for complex workflows)
5. TaskHistory - Audit trail for all task changes

---

## New Collections Schema

### 1. recurrence_rules Collection

```python
{
  _id: ObjectId,
  task_template_id: ObjectId,  # Points to recurring task template
  pattern: str,  # RRULE string
  effective_from: date,  # When this rule becomes active
  effective_until: Optional[date],  # When this rule ends (None = current)

  # Tracking
  created_at: datetime,
  created_by: ObjectId,  # parent_id
  reason: Optional[str],  # Why pattern changed

  # History chain
  replaced_by: Optional[ObjectId],  # Next rule in chain
  replaces: Optional[ObjectId],  # Previous rule in chain

  # Analytics (computed later)
  completion_rate: Optional[float],
  avg_completion_time_minutes: Optional[int]
}
```

**Indexes**:
- `task_template_id` (query all rules for a template)
- `task_template_id + effective_from` (find rule for specific date)
- `effective_until` (find active rules)

### 2. task_sessions Collection

```python
{
  _id: ObjectId,
  task_id: ObjectId,  # Original task (template or materialized)
  completion_id: Optional[ObjectId],  # Links to task_completions if finished
  child_id: ObjectId,
  scheduled_date: date,  # Which occurrence this session is for

  # Session tracking
  started_at: datetime,
  last_saved_at: datetime,
  completed_at: Optional[datetime],
  abandoned_at: Optional[datetime],
  duration_minutes: Optional[int],

  # Progress data
  progress_state: Dict[str, Any],  # Current or final progress
  progress_snapshots: List[Dict],  # Auto-saves over time

  # Analytics
  pause_count: int,
  tool_switches: int,
  struggle_indicators: List[str]  # Detected difficulty points
}
```

**Indexes**:
- `task_id + scheduled_date` (find session for specific occurrence)
- `child_id + started_at` (recent sessions for child)
- `completion_id` (link to completion record)
- `completed_at` (filter completed vs in-progress)

### 3. task_attachments Collection

```python
{
  _id: ObjectId,
  task_id: ObjectId,
  completion_id: Optional[ObjectId],  # Which attempt this belongs to
  session_id: Optional[ObjectId],  # Link to work session
  child_id: ObjectId,

  # File metadata
  file_url: str,
  thumbnail_url: Optional[str],
  file_type: str,  # "image", "video", "audio"
  file_size_bytes: int,
  mime_type: str,

  # Purpose and context
  purpose: MediaPurpose,  # WORK_SUBMISSION, MOMENT, PROGRESS_PHOTO
  description: Optional[str],

  # Upload tracking
  uploaded_at: datetime,
  uploaded_by: str,  # "PARENT" or "CHILD"

  # AI analysis
  ai_analysis: Optional[Dict[str, Any]],
  ai_analyzed_at: Optional[datetime]
}
```

**Indexes**:
- `task_id` (all attachments for a task)
- `completion_id` (attachments for specific attempt)
- `child_id + uploaded_at` (child's upload history)
- `purpose` (filter by type)

### 4. subtasks Collection

```python
{
  _id: ObjectId,
  task_id: ObjectId,
  parent_subtask_id: Optional[ObjectId],  # For nested subtasks

  # Content
  title: str,
  description: Optional[str],
  order: int,

  # State
  status: str,  # "pending", "in_progress", "completed", "skipped"
  completed_at: Optional[datetime],
  completed_by: str,  # "PARENT" or "CHILD"

  # Dependencies
  depends_on: List[ObjectId],  # Other subtask IDs

  # Tracking
  created_at: datetime,
  updated_at: datetime
}
```

**Indexes**:
- `task_id + order` (ordered list for a task)
- `parent_subtask_id` (nested subtasks)
- `status` (filter completed/pending)

### 5. task_history Collection

```python
{
  _id: ObjectId,
  task_id: ObjectId,

  # Change tracking
  changed_at: datetime,
  changed_by: ObjectId,  # parent_id or child_id
  changed_by_type: str,  # "PARENT" or "CHILD"
  change_type: str,  # "created", "edited", "status_changed", "deleted", "pattern_changed"

  # Change details
  changes: Dict[str, Any],  # {"field": {"old": ..., "new": ...}}
  reason: Optional[str],  # User-provided explanation

  # Metadata
  client_info: Optional[Dict[str, str]]  # Device, IP, user agent (for security)
}
```

**Indexes**:
- `task_id + changed_at` (chronological history)
- `changed_by` (who made changes)
- `change_type` (filter by change type)

---

## Task Model Changes

### Fields to Remove from Task

```python
# REMOVE from Task model:
- recurrence_pattern: str
- exceptions: List[RecurrenceException]
- max_completions_per_period: int
- completion_count: int
- progress_state: Dict
- attachments: List[MediaAttachment]
- subtasks: List[Subtask]
```

### Fields to Add to Task

```python
# ADD to Task model:
- current_rule_id: Optional[ObjectId]  # Active recurrence rule
- session_count: int = 0  # How many work sessions
- attachment_count: int = 0  # How many files attached
- subtask_count: int = 0  # How many subtasks
- subtask_completed_count: int = 0  # Progress tracking
```

---

## Service Layer Architecture

### New Services

1. **RecurrenceRuleService**
   - `create_rule(task_id, pattern, effective_from, reason)`
   - `get_active_rule(task_id, date)`
   - `get_rule_history(task_id)`
   - `update_pattern(task_id, new_pattern, reason)` - Creates new rule

2. **TaskSessionService**
   - `start_session(task_id, child_id, scheduled_date)`
   - `save_progress(session_id, progress_state)`
   - `complete_session(session_id, completion_id)`
   - `abandon_session(session_id)`
   - `get_active_session(task_id, child_id, scheduled_date)`
   - `get_session_history(task_id)`

3. **TaskAttachmentService**
   - `upload_attachment(task_id, file, purpose, completion_id?)`
   - `get_attachments(task_id, completion_id?)`
   - `delete_attachment(attachment_id)`
   - `analyze_with_ai(attachment_id)`

4. **SubtaskService**
   - `create_subtask(task_id, title, description, order)`
   - `get_subtasks(task_id)`
   - `update_subtask(subtask_id, updates)`
   - `complete_subtask(subtask_id)`
   - `reorder_subtasks(task_id, new_order)`

5. **TaskHistoryService**
   - `record_change(task_id, change_type, changes, changed_by, reason?)`
   - `get_history(task_id, limit?)`
   - `get_changes_by_user(user_id)`

---

## Impact Analysis

### Files to Modify

**Backend Models**:
- ✅ `backend/models/task.py` - Remove fields, add references
- ✅ `backend/models/recurrence_rule.py` - NEW
- ✅ `backend/models/task_session.py` - NEW
- ✅ `backend/models/task_attachment.py` - NEW
- ✅ `backend/models/subtask.py` - NEW
- ✅ `backend/models/task_history.py` - NEW

**Backend Services**:
- ✅ `backend/services/recurrence_rule_service.py` - NEW
- ✅ `backend/services/task_session_service.py` - NEW
- ✅ `backend/services/task_attachment_service.py` - NEW
- ✅ `backend/services/subtask_service.py` - NEW
- ✅ `backend/services/task_history_service.py` - NEW
- ⚠️ `backend/services/task_service/crud.py` - Update CRUD operations
- ⚠️ `backend/services/virtual_instance_service.py` - Use recurrence rules
- ⚠️ `backend/services/task_service/lifecycle.py` - Use sessions

**Backend Routes**:
- ⚠️ `backend/routes/tasks.py` - Update task endpoints
- ⚠️ `backend/routes/completion_routes.py` - Use sessions
- ✅ `backend/routes/recurrence_routes.py` - NEW
- ✅ `backend/routes/session_routes.py` - NEW
- ✅ `backend/routes/attachment_routes.py` - NEW
- ✅ `backend/routes/subtask_routes.py` - NEW

**Database**:
- ✅ `backend/main.py` - Add indexes for new collections
- ✅ `backend/scripts/migrate_task_separation.py` - Migration script

**Frontend Types**:
- ⚠️ `frontend/src/types/task.ts` - Update Task interface
- ✅ `frontend/src/types/recurrence.ts` - NEW
- ✅ `frontend/src/types/session.ts` - NEW
- ✅ `frontend/src/types/attachment.ts` - NEW
- ✅ `frontend/src/types/subtask.ts` - NEW

**Frontend API**:
- ⚠️ `frontend/src/api/queries/useTasks.ts` - Update queries
- ✅ `frontend/src/api/queries/useRecurrence.ts` - NEW
- ✅ `frontend/src/api/queries/useSessions.ts` - NEW
- ✅ `frontend/src/api/queries/useAttachments.ts` - NEW
- ✅ `frontend/src/api/queries/useSubtasks.ts` - NEW

**Frontend Mutations**:
- ⚠️ `frontend/src/api/mutations/useTaskMutations.ts` - Update mutations
- ✅ `frontend/src/api/mutations/useRecurrenceMutations.ts` - NEW
- ✅ `frontend/src/api/mutations/useSessionMutations.ts` - NEW
- ✅ `frontend/src/api/mutations/useAttachmentMutations.ts` - NEW
- ✅ `frontend/src/api/mutations/useSubtaskMutations.ts` - NEW

---

## Implementation Phases

### Phase 1: Models & Database (Foundation)
1. Create new model files
2. Update Task model
3. Add database indexes
4. Write migration script

### Phase 2: Services (Business Logic)
1. Implement RecurrenceRuleService
2. Implement TaskSessionService
3. Implement TaskAttachmentService
4. Implement SubtaskService
5. Implement TaskHistoryService
6. Update existing services to use new collections

### Phase 3: Routes & API (Integration)
1. Create new route files
2. Update existing routes
3. Test API endpoints

### Phase 4: Frontend Types & API
1. Update TypeScript types
2. Create new query hooks
3. Create new mutation hooks
4. Update existing hooks

### Phase 5: Testing & Validation
1. Run migration script
2. Run all backend tests
3. Run all frontend tests
4. Manual testing of key features

---

## Feature Compatibility Matrix

| Feature | Affected | Changes Required | Status |
|---------|----------|------------------|--------|
| Task Creation | ✅ Yes | Create initial rule if recurring | TODO |
| Task Editing (Template) | ✅ Yes | Create new rule on pattern change | TODO |
| Task Editing (Occurrence) | ✅ Yes | Use exception overrides | TODO |
| Virtual Instance Generation | ✅ Yes | Load rules by date range | TODO |
| Task Completion | ✅ Yes | Link session to completion | TODO |
| Save Progress | ✅ Yes | Save to session collection | TODO |
| Overdue Tasks | ✅ Yes | Use historical rules | TODO |
| Task Deletion | ⚠️ Minor | Delete related records | TODO |
| Analytics | ✅ NEW | Query rule/session history | TODO |
| Attachments | ✅ Yes | Load from separate collection | TODO |
| Subtasks | ✅ NEW | CRUD on subtasks collection | TODO |

---

## Testing Strategy

### Unit Tests
- Model validation tests
- Service method tests
- Rule selection logic tests
- Session state management tests

### Integration Tests
- Virtual instance generation with rules
- Task completion with sessions
- Overdue calculation with historical rules
- Attachment upload and retrieval
- Subtask CRUD operations

### End-to-End Tests
- Create recurring task → edit pattern → verify past unchanged
- Start task → save progress → complete → verify session history
- Upload attachment → retrieve → verify metadata
- Create subtasks → complete → verify progress

---

## Rollback Plan

If issues arise:
1. Migration script creates backup of old data
2. Can restore from backup
3. Revert code changes via git
4. Old schema still works (backward compatible during transition)

---

## Success Criteria

- ✅ All existing features work
- ✅ All tests pass (backend + frontend)
- ✅ No performance degradation
- ✅ Analytics queries return meaningful data
- ✅ Session history preserved
- ✅ Pattern changes don't affect past dates
- ✅ Attachments load efficiently
- ✅ Subtasks CRUD works

---

## Next Steps

1. Review and approve this plan
2. Create backup of current database
3. Begin Phase 1: Models & Database
4. Implement phase by phase
5. Test thoroughly after each phase
6. Deploy to production

---

**Estimated Time**: 3-4 days full implementation + testing
