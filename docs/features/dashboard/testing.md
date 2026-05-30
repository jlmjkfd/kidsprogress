# Dashboard & Child Selection Testing

## Overview
Testing plan for dashboard and child selection features including child grid display and add child modal.

## Test Coverage Summary

### Backend Tests
**Status**: ❌ Child management backend tests not created yet
- Tests should be in child-profile feature testing

### Frontend Tests
**Status**: ❌ No tests created yet

**Files to create**:
- `frontend/src/api/queries/__tests__/useChildren.test.tsx`
- `frontend/src/api/mutations/__tests__/useCreateChild.test.tsx`
- `frontend/src/pages/dashboard/__tests__/index.test.tsx`
- `frontend/src/pages/dashboard/components/__tests__/AddChildModal.test.tsx`

## Frontend Component Tests

### Dashboard Page
**File**: `frontend/src/pages/dashboard/__tests__/index.test.tsx`

#### Rendering
- [ ] Renders welcome message with user name
- [ ] Renders language switcher
- [ ] Renders "Add New Child" button
- [ ] Renders loading state while fetching children
- [ ] Renders empty state when no children exist
- [ ] Renders child grid when children exist

#### Child Grid Display
- [ ] Displays all children in grid layout
- [ ] Grid is responsive (1 col mobile, 2 col tablet, 3 col desktop)
- [ ] Each child card shows: name, age, avatar/fallback icon
- [ ] Child card shows PIN indicator (lock icon) if pin_required=true
- [ ] Child card shows no PIN indicator if pin_required=false
- [ ] Age is calculated correctly from date_of_birth
- [ ] Avatar displays image if avatar_url provided
- [ ] Avatar displays IconUser fallback if no avatar_url

#### Interactions
- [ ] Clicking "Add New Child" opens AddChildModal
- [ ] Clicking child card navigates to `/child/:childId`
- [ ] Navigation includes correct child ID in route
- [ ] Modal closes after successful child creation
- [ ] Child list refreshes after child creation (query invalidation)

#### i18n
- [ ] Welcome message translates correctly (en/zh)
- [ ] "Add New Child" button translates correctly
- [ ] Empty state message translates correctly
- [ ] Age label translates correctly

### AddChildModal Component
**File**: `frontend/src/pages/dashboard/components/__tests__/AddChildModal.test.tsx`

#### Rendering
- [ ] Not render when isOpen is false
- [ ] Render form when isOpen is true
- [ ] Form contains name input
- [ ] Form contains date_of_birth date picker
- [ ] Form contains PIN protection checkbox
- [ ] PIN input not visible by default
- [ ] PIN input visible when PIN checkbox checked

#### Form Validation
- [ ] Name input is required
- [ ] Date of birth input is required
- [ ] Submit button disabled when name is empty
- [ ] Submit button disabled when date_of_birth is empty
- [ ] PIN input required when PIN checkbox checked
- [ ] PIN must be 4 digits
- [ ] PIN validates numeric input only

#### Form Submission
- [ ] Submits with name and date_of_birth when no PIN
- [ ] Submits with name, date_of_birth, and PIN when PIN checked
- [ ] Calls useCreateChild mutation with correct data
- [ ] Shows loading state during submission
- [ ] Closes modal on successful submission
- [ ] Calls onClose callback after success
- [ ] Shows error message on submission failure

#### PIN Toggle
- [ ] Checking PIN checkbox shows PIN input
- [ ] Unchecking PIN checkbox hides PIN input
- [ ] Unchecking PIN checkbox clears PIN value
- [ ] PIN input accepts only numeric characters
- [ ] PIN input limited to 4 characters

#### Modal Controls
- [ ] Clicking X button closes modal
- [ ] Clicking Cancel button closes modal
- [ ] Closing modal resets form values
- [ ] Closing modal clears validation errors

#### i18n
- [ ] All form labels translate correctly (en/zh)
- [ ] Placeholder text translates correctly
- [ ] Button text translates correctly
- [ ] Error messages translate correctly

## Frontend API Hook Tests

### useChildren Query
**File**: `frontend/src/api/queries/__tests__/useChildren.test.tsx`

- [ ] Fetches children list successfully (GET /api/children)
- [ ] Returns array of Child objects
- [ ] Returns empty array when no children
- [ ] Handles fetch error gracefully
- [ ] Uses correct query key: ['children']
- [ ] Not fetch when enabled is false
- [ ] Includes all child fields (name, date_of_birth, avatar_url, pin_required, etc.)
- [ ] Caches results properly

### useCreateChild Mutation
**File**: `frontend/src/api/mutations/__tests__/useCreateChild.test.tsx`

- [ ] Creates child successfully (POST /api/children)
- [ ] Sends correct request payload (name, date_of_birth, pin, pin_required)
- [ ] Returns created child data with _id
- [ ] Invalidates 'children' query on success
- [ ] Handles creation error (400)
- [ ] Handles validation error
- [ ] Handles network error

## Integration Test Scenarios

### First-Time Parent Flow
- [ ] Parent logs in → redirected to dashboard
- [ ] Dashboard shows empty state (no children)
- [ ] Parent clicks "Add New Child"
- [ ] Modal opens with form
- [ ] Parent fills name and date_of_birth
- [ ] Parent submits form
- [ ] Child created successfully
- [ ] Modal closes
- [ ] Dashboard shows child card in grid
- [ ] Parent clicks child card → navigates to child profile

### Adding Multiple Children
- [ ] Parent has 1 child already
- [ ] Parent clicks "Add New Child"
- [ ] Parent creates second child
- [ ] Dashboard shows 2 children in grid
- [ ] Grid layout adjusts for multiple children

### Adding Child with PIN Protection
- [ ] Parent opens AddChildModal
- [ ] Parent checks "PIN Protection" checkbox
- [ ] PIN input appears
- [ ] Parent enters 4-digit PIN
- [ ] Form submits with pin_required=true and hashed PIN
- [ ] Child card shows lock icon
- [ ] Clicking child card triggers PIN verification modal

### Age Calculation
- [ ] Child's date_of_birth is 5 years ago
- [ ] Dashboard displays "Age: 5"
- [ ] Age updates dynamically as time passes

## E2E Test Scenarios

### Dashboard Navigation
- [ ] Parent logs in → lands on portal selection
- [ ] Parent selects "Parent Portal"
- [ ] Parent portal shows manage children page (dashboard)
- [ ] Dashboard loads children from API
- [ ] Children display in grid

### Child Creation Journey
- [ ] Navigate to dashboard
- [ ] Click "Add New Child" button
- [ ] Fill in child name "Alice"
- [ ] Select date of birth "2018-05-15"
- [ ] Submit form
- [ ] Wait for success
- [ ] Verify child card appears
- [ ] Verify child card shows "Alice" and correct age

### Language Switching
- [ ] Dashboard loads in English
- [ ] Click language switcher to Chinese
- [ ] Verify dashboard text translates
- [ ] Add child modal opens
- [ ] Verify modal text is in Chinese
- [ ] Switch back to English
- [ ] Verify text returns to English

## Test Execution Commands

### Frontend Tests
```bash
# Run all dashboard tests
npm test -- src/pages/dashboard/__tests__/*.test.tsx \
  src/api/queries/__tests__/useChildren.test.tsx \
  src/api/mutations/__tests__/useCreateChild.test.tsx

# Run component tests only
npm test -- src/pages/dashboard/__tests__/*.test.tsx

# Run API hook tests only
npm test -- src/api/queries/__tests__/useChildren.test.tsx \
  src/api/mutations/__tests__/useCreateChild.test.tsx
```

## Key Testing Patterns

### Component with Query Hook
```typescript
vi.mock('@api/queries/useChildren')

beforeEach(() => {
  vi.mocked(useChildren).mockReturnValue({
    data: [mockChild1, mockChild2],
    isLoading: false,
    error: null,
  } as any)
})

it('renders child grid', () => {
  render(<Dashboard />)
  expect(screen.getByText('Alice')).toBeInTheDocument()
  expect(screen.getByText('Bob')).toBeInTheDocument()
})
```

### Modal with Mutation Hook
```typescript
vi.mock('@api/mutations/useCreateChild')

const mockMutate = vi.fn()

beforeEach(() => {
  vi.mocked(useCreateChild).mockReturnValue({
    mutate: mockMutate,
    isPending: false,
  } as any)
})

it('submits child creation form', async () => {
  render(<AddChildModal isOpen={true} onClose={mockOnClose} />)

  fireEvent.change(screen.getByLabelText(/name/i), {
    target: { value: 'Alice' }
  })
  fireEvent.change(screen.getByLabelText(/date_of_birth/i), {
    target: { value: '2018-05-15' }
  })
  fireEvent.click(screen.getByText(/submit/i))

  expect(mockMutate).toHaveBeenCalledWith({
    name: 'Alice',
    date_of_birth: '2018-05-15',
    pin_required: false,
  }, expect.any(Object))
})
```

## Related Documentation
- [Dashboard Context](./context.md)
- [Child Profile Testing](../child-profile/testing.md)
- [API Registry](../../api-registry.md)
