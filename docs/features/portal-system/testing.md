# Portal System Testing

## Overview
Testing plan for the dual portal system (Parent Portal + Child Portal) including portal selection, navigation, and layout components.

## Test Coverage Summary

### Backend Tests
**Status**: ✅ Portal system uses existing authentication and child APIs (already tested)

### Frontend Tests
**Status**: ❌ No tests created yet

**Files to create**:
- `frontend/src/pages/portal-selection/__tests__/index.test.tsx`
- `frontend/src/pages/child-selection/__tests__/index.test.tsx`
- `frontend/src/pages/parent-portal/__tests__/layout.test.tsx`
- `frontend/src/pages/child-portal/__tests__/layout.test.tsx`

## Frontend Component Tests

### Portal Selection Page
**File**: `frontend/src/pages/portal-selection/__tests__/index.test.tsx`

#### Rendering
- [ ] Renders page title and description
- [ ] Renders two portal option cards
- [ ] Parent portal card shows correct icon (IconUsers)
- [ ] Child portal card shows correct icon (IconSparkles)
- [ ] Language switcher is visible
- [ ] Logout button is visible

#### Portal Options
- [ ] Parent portal card displays title and description
- [ ] Child portal card displays title and description
- [ ] Both cards are clickable
- [ ] Cards have hover states

#### Navigation
- [ ] Clicking Parent portal card navigates to `/parent-portal`
- [ ] Clicking Child portal card navigates to `/child-selection`
- [ ] Logout button triggers logout flow

#### i18n
- [ ] Page title translates correctly (en/zh)
- [ ] Portal descriptions translate correctly
- [ ] Button text translates correctly

#### Protected Route
- [ ] Requires authentication
- [ ] Redirects to `/login` if not authenticated

### Child Selection Page
**File**: `frontend/src/pages/child-selection/__tests__/index.test.tsx`

#### Rendering
- [ ] Renders page title "Who is using the app?"
- [ ] Renders loading state while fetching children
- [ ] Renders child cards in grid layout
- [ ] Grid is responsive (1-3 columns)
- [ ] Back button to portal selection is visible

#### Child Cards
- [ ] Each child card shows name
- [ ] Each child card shows avatar or fallback icon
- [ ] Cards are clickable
- [ ] Cards have visual feedback on hover

#### Navigation
- [ ] Clicking child card navigates to `/child-portal/:childId`
- [ ] Child ID is correctly passed in route
- [ ] Back button navigates to `/portal-selection`

#### PIN Verification
- [ ] Clicking child with pin_required=true opens PIN modal
- [ ] PIN modal blocks navigation until verified
- [ ] Correct PIN allows navigation to child portal
- [ ] Incorrect PIN shows error and blocks navigation
- [ ] Cancel closes modal and returns to selection

#### Edge Cases
- [ ] Shows empty state if no children exist
- [ ] Empty state suggests adding children
- [ ] Handles loading errors gracefully

#### i18n
- [ ] Page title translates correctly
- [ ] Back button text translates correctly
- [ ] Empty state message translates correctly

### Parent Portal Layout
**File**: `frontend/src/pages/parent-portal/__tests__/layout.test.tsx`

#### Rendering
- [ ] Renders sidebar navigation
- [ ] Renders main content area (`<Outlet />`)
- [ ] Renders footer with buttons
- [ ] Language switcher visible in header
- [ ] Layout is responsive (collapsible sidebar on mobile)

#### Sidebar Navigation
- [ ] Displays all navigation items:
  - [ ] Manage Children (IconUsers)
  - [ ] All Tasks (IconChecklist)
  - [ ] Analytics (IconChartBar)
  - [ ] Settings (IconSettings)
- [ ] Current route is highlighted (active state)
- [ ] Clicking nav item navigates to correct route
- [ ] Icons display correctly

#### Footer Buttons
- [ ] "Portal Selection" button visible
- [ ] "Logout" button visible
- [ ] Clicking "Portal Selection" navigates to `/portal-selection`
- [ ] Clicking "Logout" triggers logout and redirects

#### Nested Routing
- [ ] Index route (`/parent-portal`) renders children management
- [ ] `/parent-portal/children/:childId` renders child profile
- [ ] `/parent-portal/children/:childId/tasks` renders task management
- [ ] `/parent-portal/tasks` renders all tasks view
- [ ] `/parent-portal/analytics` renders analytics (or placeholder)
- [ ] `/parent-portal/settings` renders settings

#### i18n
- [ ] Navigation labels translate correctly
- [ ] Footer button text translates correctly

### Child Portal Layout
**File**: `frontend/src/pages/child-portal/__tests__/layout.test.tsx`

#### Rendering
- [ ] Renders top bar with child's name
- [ ] Renders horizontal tab navigation
- [ ] Renders main content area (`<Outlet />`)
- [ ] Background has child-friendly gradient
- [ ] Layout is responsive

#### Top Bar
- [ ] Displays child's name from route param
- [ ] Fetches child data from API using childId
- [ ] Shows loading state while fetching
- [ ] Shows error state if child not found
- [ ] Back button to child selection visible

#### Tab Navigation
- [ ] Displays all tab items:
  - [ ] My Tasks (IconChecklist)
  - [ ] Tools (IconSparkles)
  - [ ] Chat (IconMessageCircle)
  - [ ] Progress (IconChartBar)
- [ ] Current tab is highlighted (active state)
- [ ] Clicking tab navigates to correct route
- [ ] Icons display correctly
- [ ] Tabs are horizontally scrollable on mobile

#### Navigation
- [ ] Back button navigates to `/child-selection`
- [ ] Tab clicks navigate within child portal:
  - [ ] `/child-portal/:childId/tasks`
  - [ ] `/child-portal/:childId/tools`
  - [ ] `/child-portal/:childId/chat`
  - [ ] `/child-portal/:childId/progress`

#### Nested Routing
- [ ] Default route renders tasks page
- [ ] Routes with childId render correct pages
- [ ] Invalid childId shows error state

#### i18n
- [ ] Tab labels translate correctly
- [ ] Back button text translates correctly

## Integration Test Scenarios

### Portal Selection to Parent Portal Flow
- [ ] User logs in → redirected to `/portal-selection`
- [ ] User clicks "Parent" card
- [ ] Navigates to `/parent-portal`
- [ ] Parent portal layout loads
- [ ] Sidebar navigation displays
- [ ] Index route shows manage children page

### Portal Selection to Child Portal Flow
- [ ] User at `/portal-selection`
- [ ] User clicks "Child" card
- [ ] Navigates to `/child-selection`
- [ ] Child cards load from API
- [ ] User clicks child card (no PIN)
- [ ] Navigates to `/child-portal/:childId/tasks`
- [ ] Child portal layout loads
- [ ] Tabs display correctly

### Child Portal with PIN Protection
- [ ] User at `/child-selection`
- [ ] User clicks child with pin_required=true
- [ ] PIN verification modal opens
- [ ] User enters incorrect PIN → error shown
- [ ] User enters correct PIN → modal closes
- [ ] Navigates to `/child-portal/:childId/tasks`

### Portal Switching
- [ ] User in parent portal
- [ ] User clicks "Portal Selection" button
- [ ] Navigates back to `/portal-selection`
- [ ] User clicks "Child" card
- [ ] Enters child portal
- [ ] User navigates back → returns to child selection
- [ ] User navigates back again → returns to portal selection

### Parent Portal Navigation
- [ ] User at `/parent-portal` (index)
- [ ] User clicks "Settings" in sidebar
- [ ] Navigates to `/parent-portal/settings`
- [ ] Settings page loads
- [ ] Sidebar highlights "Settings" as active
- [ ] User clicks "Manage Children"
- [ ] Returns to `/parent-portal` (index)

### Child Portal Navigation
- [ ] User at `/child-portal/:childId/tasks`
- [ ] User clicks "Tools" tab
- [ ] Navigates to `/child-portal/:childId/tools`
- [ ] Tools tab highlighted as active
- [ ] User clicks "My Tasks"
- [ ] Returns to tasks view

## E2E Test Scenarios

### Complete Parent Portal Journey
- [ ] Login as parent
- [ ] Land on portal selection
- [ ] Select parent portal
- [ ] Create new child
- [ ] Navigate to child's tasks
- [ ] View analytics
- [ ] Go to settings
- [ ] Return to portal selection
- [ ] Logout

### Complete Child Portal Journey
- [ ] Login as parent
- [ ] Select child portal
- [ ] Select child (with PIN)
- [ ] Enter PIN correctly
- [ ] View tasks
- [ ] Navigate to tools
- [ ] Chat with AI
- [ ] View progress
- [ ] Return to child selection
- [ ] Return to portal selection

### Cross-Portal Navigation
- [ ] Start in parent portal
- [ ] Switch to child portal
- [ ] Return to portal selection
- [ ] Switch back to parent portal
- [ ] Logout

## Test Execution Commands

### Frontend Tests
```bash
# Run all portal system tests
npm test -- src/pages/portal-selection/__tests__/*.test.tsx \
  src/pages/child-selection/__tests__/*.test.tsx \
  src/pages/parent-portal/__tests__/layout.test.tsx \
  src/pages/child-portal/__tests__/layout.test.tsx

# Run portal selection tests
npm test -- src/pages/portal-selection/__tests__/*.test.tsx \
  src/pages/child-selection/__tests__/*.test.tsx

# Run layout tests
npm test -- src/pages/parent-portal/__tests__/layout.test.tsx \
  src/pages/child-portal/__tests__/layout.test.tsx
```

## Key Testing Patterns

### Testing Layout with Nested Routes
```typescript
import { MemoryRouter, Routes, Route } from 'react-router-dom'

it('renders child profile on /children/:childId route', () => {
  render(
    <MemoryRouter initialEntries={['/parent-portal/children/123']}>
      <Routes>
        <Route path="/parent-portal" element={<ParentPortalLayout />}>
          <Route path="children/:childId" element={<ChildProfile />} />
        </Route>
      </Routes>
    </MemoryRouter>
  )

  expect(screen.getByText(/child profile/i)).toBeInTheDocument()
})
```

### Testing Navigation
```typescript
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => ({
  ...await vi.importActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}))

it('navigates to parent portal on click', () => {
  render(<PortalSelectionPage />)
  fireEvent.click(screen.getByText(/parent portal/i))
  expect(mockNavigate).toHaveBeenCalledWith('/parent-portal')
})
```

### Testing Active Route Highlighting
```typescript
vi.mock('react-router-dom', async () => ({
  ...await vi.importActual('react-router-dom'),
  useLocation: () => ({ pathname: '/parent-portal/settings' }),
}))

it('highlights active navigation item', () => {
  render(<ParentPortalLayout />)
  const settingsLink = screen.getByText(/settings/i).closest('a')
  expect(settingsLink).toHaveClass('active') // or check aria-current
})
```

## Related Documentation
- [Portal System Context](./context.md)
- [Authentication Testing](../authentication/testing.md)
- [Child Profile Testing](../child-profile/testing.md)
- [API Registry](../../api-registry.md)
