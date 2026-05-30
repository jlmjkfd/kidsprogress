# Child Profile Management Testing

## Overview
Testing plan for child profile management including backend services, API routes, and frontend components.

## Test Coverage Summary

### Backend Tests
**Status**: ❌ No tests created yet

**Files to create**:
- `backend/services/__tests__/test_child_service.py`
- `backend/routes/__tests__/test_children.py`

### Frontend Tests
**Status**: ❌ No tests created yet

**Files to create**:
- `frontend/src/api/mutations/__tests__/useCreateChild.test.tsx`
- `frontend/src/api/mutations/__tests__/useVerifyChildPin.test.tsx`
- `frontend/src/api/queries/__tests__/useChildren.test.tsx`
- `frontend/src/api/queries/__tests__/useChild.test.tsx`
- Component tests for child management UI

## Backend Service Tests

### ChildService (backend/services/child_service.py)
**File**: `backend/services/__tests__/test_child_service.py`

#### Child Creation
- [ ] `create_child()` - Creates child with required fields (name, date_of_birth, parent_id)
- [ ] `create_child()` - Generates unique child_id
- [ ] `create_child()` - Auto-generates 4-digit PIN if not provided
- [ ] `create_child()` - Uses provided PIN if given
- [ ] `create_child()` - Creates default TaskCollection "My Tasks"
- [ ] `create_child()` - Default collection has is_default=true
- [ ] `create_child()` - Sets created_at timestamp
- [ ] `create_child()` - Validates parent_id exists
- [ ] `create_child()` - Fails gracefully if collection creation fails

#### Child Retrieval
- [ ] `get_children_by_parent()` - Returns all children for parent
- [ ] `get_children_by_parent()` - Returns empty array if no children
- [ ] `get_children_by_parent()` - Excludes archived children by default
- [ ] `get_children_by_parent()` - Includes archived if requested
- [ ] `get_child_by_id()` - Returns single child by ID
- [ ] `get_child_by_id()` - Returns None for non-existent child
- [ ] `get_child_by_id()` - Validates parent owns child

#### Child Updates
- [ ] `update_child()` - Updates name
- [ ] `update_child()` - Updates date_of_birth
- [ ] `update_child()` - Updates avatar
- [ ] `update_child()` - Updates preferences
- [ ] `update_child()` - Validates parent owns child (403)
- [ ] `update_child()` - Returns 404 for non-existent child
- [ ] `update_child()` - Cannot update parent_id

#### Child PIN Management
- [ ] `verify_child_pin()` - Returns true for correct PIN
- [ ] `verify_child_pin()` - Returns false for incorrect PIN
- [ ] `verify_child_pin()` - Validates child_id exists
- [ ] `update_child_pin()` - Updates PIN successfully
- [ ] `update_child_pin()` - Validates parent owns child
- [ ] `update_child_pin()` - Validates PIN is 4 digits
- [ ] `update_child_pin()` - Hashes PIN before storage

#### Child Archival
- [ ] `archive_child()` - Sets is_archived=true
- [ ] `archive_child()` - Validates parent owns child
- [ ] `archive_child()` - Archived child not in default get_children query
- [ ] `restore_child()` - Sets is_archived=false
- [ ] `delete_child()` - Hard delete only if no associated tasks

## Backend Route Tests

### Children API (backend/routes/children.py)
**File**: `backend/routes/__tests__/test_children.py`

#### Create Child Endpoint
- [ ] POST /api/children - Creates child successfully (201)
- [ ] POST /api/children - Returns child data with ID
- [ ] POST /api/children - Creates default "My Tasks" collection
- [ ] POST /api/children - Requires authentication (403)
- [ ] POST /api/children - Validates required fields (400)
- [ ] POST /api/children - Validates date_of_birth format (400)

#### List Children Endpoint
- [ ] GET /api/children - Returns all children for authenticated parent (200)
- [ ] GET /api/children - Returns empty array if no children
- [ ] GET /api/children - Requires authentication (403)
- [ ] GET /api/children - Excludes archived children by default
- [ ] GET /api/children?include_archived=true - Includes archived

#### Get Single Child Endpoint
- [ ] GET /api/children/{id} - Returns child data (200)
- [ ] GET /api/children/{id} - Returns 404 for non-existent child
- [ ] GET /api/children/{id} - Requires authentication (403)
- [ ] GET /api/children/{id} - Validates parent owns child (403)

#### Update Child Endpoint
- [ ] PUT /api/children/{id} - Updates child data (200)
- [ ] PUT /api/children/{id} - Returns updated child data
- [ ] PUT /api/children/{id} - Requires authentication (403)
- [ ] PUT /api/children/{id} - Validates parent owns child (403)
- [ ] PUT /api/children/{id} - Returns 404 for non-existent child
- [ ] PUT /api/children/{id} - Validates request payload (400)

#### Verify Child PIN Endpoint
- [ ] POST /api/children/{id}/verify-pin - Returns success for correct PIN (200)
- [ ] POST /api/children/{id}/verify-pin - Returns error for incorrect PIN (401)
- [ ] POST /api/children/{id}/verify-pin - Requires child_id in path
- [ ] POST /api/children/{id}/verify-pin - Returns 404 for non-existent child
- [ ] POST /api/children/{id}/verify-pin - No authentication required (child login)

#### Archive Child Endpoint
- [ ] DELETE /api/children/{id} - Archives child (204)
- [ ] DELETE /api/children/{id} - Requires authentication (403)
- [ ] DELETE /api/children/{id} - Validates parent owns child (403)
- [ ] DELETE /api/children/{id} - Returns 404 for non-existent child

## Frontend API Hook Tests

### Child Mutation Hooks

#### useCreateChild
**File**: `frontend/src/api/mutations/__tests__/useCreateChild.test.tsx`
- [ ] Creates child successfully
- [ ] Sends correct request payload
- [ ] Invalidates children query on success
- [ ] Handles creation error
- [ ] Validates required fields

#### useVerifyChildPin
**File**: `frontend/src/api/mutations/__tests__/useVerifyChildPin.test.tsx`
- [ ] Verifies PIN successfully
- [ ] Sends correct child_id and PIN
- [ ] Handles incorrect PIN error
- [ ] Handles non-existent child error
- [ ] Returns success/error state

### Child Query Hooks

#### useChildren
**File**: `frontend/src/api/queries/__tests__/useChildren.test.tsx`
- [ ] Fetches children list successfully
- [ ] Returns empty array when no children
- [ ] Handles fetch error
- [ ] Not fetch when enabled is false
- [ ] Uses correct query key
- [ ] Includes all child fields

#### useChild
**File**: `frontend/src/api/queries/__tests__/useChild.test.tsx`
- [ ] Fetches child by ID successfully
- [ ] Handles child not found
- [ ] Not fetch when child_id is null
- [ ] Not fetch when enabled is false
- [ ] Uses correct query key with child_id
- [ ] Handles unauthorized error

## Frontend Component Tests

**Status**: ❌ No component tests created yet

**Components to test**:
- Child creation form/modal
- Child profile card
- Child list view
- Child PIN entry modal
- Child selection component
- Child edit form

### Example Test Cases

#### ChildCreationModal
- [ ] Not render when isOpen is false
- [ ] Render creation form when isOpen is true
- [ ] Validates required fields (name, date_of_birth)
- [ ] Submits form with valid data
- [ ] Shows error message on validation failure
- [ ] Calls onClose after successful creation
- [ ] Shows loading state during creation

#### ChildProfileCard
- [ ] Displays child name
- [ ] Displays child age (calculated from date_of_birth)
- [ ] Displays child avatar
- [ ] Opens edit modal on edit button click
- [ ] Opens PIN verification modal on PIN button click

## Integration Test Scenarios

### Child Creation Flow
- [ ] Parent creates child → default collection "My Tasks" is created
- [ ] Parent creates child with custom PIN → PIN is stored hashed
- [ ] Parent creates child without PIN → 4-digit PIN is auto-generated

### Child PIN Verification Flow
- [ ] Child enters correct PIN → allowed access to child portal
- [ ] Child enters incorrect PIN → denied access, shown error
- [ ] Child account has no PIN → fallback to PIN creation flow

### Child Profile Management Flow
- [ ] Parent views all children → sees list with basic info
- [ ] Parent edits child profile → updates saved successfully
- [ ] Parent archives child → child no longer appears in active list
- [ ] Parent views archived children → sees archived child

## Test Execution Commands

### Backend Tests
```bash
# Run all child service tests
./backend/.venv/Scripts/python.exe -m pytest backend/services/__tests__/test_child_service.py -v

# Run all child route tests
./backend/.venv/Scripts/python.exe -m pytest backend/routes/__tests__/test_children.py -v

# Run all child tests
./backend/.venv/Scripts/python.exe -m pytest backend/services/__tests__/test_child_service.py backend/routes/__tests__/test_children.py -v
```

### Frontend Tests
```bash
# Run child API hook tests
npm test -- src/api/mutations/__tests__/useCreateChild.test.tsx \
  src/api/mutations/__tests__/useVerifyChildPin.test.tsx \
  src/api/queries/__tests__/useChildren.test.tsx \
  src/api/queries/__tests__/useChild.test.tsx

# Run child component tests (when created)
npm test -- src/components/child/**/__tests__/*.test.tsx
```

## Related Documentation
- [Child Profile Context](./context.md)
- [API Registry](../../api-registry.md)
