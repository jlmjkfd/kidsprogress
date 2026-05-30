# Portal System - Context

## Overview

The portal system is the core navigation architecture of KidsProgress, providing two distinct user experiences after parent authentication:
- **Parent Portal**: Professional management interface for parents
- **Child Portal**: Child-friendly interactive interface for children

## User Flow

```
1. Parent Login (POST /api/auth/login)
   ↓
2. Portal Selection Page (/portal-selection)
   ├─→ Option A: Parent Portal
   │   └→ Parent Portal Layout (/parent-portal)
   │      ├─→ Manage Children (index)
   │      ├─→ Child Profile (/children/:childId)
   │      ├─→ Task Management (/children/:childId/tasks)
   │      ├─→ All Tasks (/tasks) [Coming Soon]
   │      ├─→ Analytics (/analytics) [Coming Soon]
   │      └─→ Settings (/settings) [Coming Soon]
   │
   └─→ Option B: Child Portal
       └→ Child Selection Page (/child-selection)
          └→ Child selects themselves
             └→ Child Portal Layout (/child-portal/:childId)
                ├─→ My Tasks (/tasks) [Coming Soon]
                ├─→ Tools (/tools) [Coming Soon]
                ├─→ Chat with AI (/chat) [Coming Soon]
                └─→ My Progress (/progress) [Coming Soon]
```

## Technical Architecture

### Routing Structure

The application uses React Router v6 nested routes with layout components:

```typescript
/                           → Redirect based on auth status
/login                      → Parent login page
/register                   → Parent registration page
/portal-selection          → Landing page after login

// Parent Portal (nested routes)
/parent-portal             → Layout with sidebar navigation
  ├── /                    → Manage children (index route)
  ├── /children/:childId   → Child profile view
  ├── /children/:childId/tasks → Task management
  ├── /tasks               → All tasks view
  ├── /analytics           → Analytics dashboard
  └── /settings            → Settings

// Child Portal (nested routes)
/child-selection           → Children select themselves
/child-portal/:childId     → Layout with tab navigation
  ├── /tasks               → Child's tasks (default)
  ├── /tools               → Learning tools
  ├── /chat                → AI chat
  └── /progress            → Progress tracking
```

### Layout Pattern

Both portals use the `<Outlet />` pattern from React Router:

**Parent Portal Layout** (`frontend/src/pages/parent-portal/layout.tsx`):
- Sidebar with navigation items
- Footer with "Portal Selection" and "Logout" buttons
- Professional, clean design
- White background with blue accents

**Child Portal Layout** (`frontend/src/pages/child-portal/layout.tsx`):
- Top bar showing child's name
- Horizontal tab navigation
- Gradient backgrounds (purple/pink/blue)
- Large, child-friendly UI elements

## Key Files

### Portal Selection & Navigation

| File | Purpose |
|------|---------|
| `frontend/src/pages/portal-selection/index.tsx` | Landing page with two portal options |
| `frontend/src/pages/child-selection/index.tsx` | Children select themselves for child portal |
| `frontend/src/App.tsx` | Main routing configuration |

### Parent Portal

| File | Purpose |
|------|---------|
| `frontend/src/pages/parent-portal/layout.tsx` | Sidebar layout with navigation |
| `frontend/src/pages/parent-portal/children/index.tsx` | Manage children page (index route) |
| `frontend/src/pages/parent-portal/children/components/AddChildModal.tsx` | Add child modal |
| `frontend/src/pages/child-profile/index.tsx` | Single child profile view |
| `frontend/src/pages/task-list/index.tsx` | Task management for specific child |

### Child Portal

| File | Purpose |
|------|---------|
| `frontend/src/pages/child-portal/layout.tsx` | Tab layout with navigation |
| Child portal pages (Coming Soon) | Tasks, tools, chat, progress views |

### Shared Components

| File | Purpose |
|------|---------|
| `frontend/src/components/LanguageSwitcher.tsx` | Language toggle (used in both portals) |
| `frontend/src/pages/login/index.tsx` | Parent login |
| `frontend/src/pages/register/index.tsx` | Parent registration |

## API Endpoints

The portal system uses existing authentication and child management APIs:

### Authentication
- `POST /api/auth/login` - Parent login
- `POST /api/auth/register` - Parent registration

### Child Management (used by both portals)
- `GET /api/children` - List all children (for parent and child selection)
- `GET /api/children/{id}` - Get single child (for profiles)
- `POST /api/children` - Create child (parent portal only)
- `PUT /api/children/{id}` - Update child (parent portal only)
- `DELETE /api/children/{id}` - Delete child (parent portal only)
- `POST /api/children/{id}/verify-pin` - Verify child PIN (child portal only)

### Task Management (used by both portals)
- Task APIs in `backend/routes/tasks.py` (see Task Management documentation)

## State Management

### Redux (Client State)
- `authSlice`: Stores authentication state (token, user info)
- Used across both portals for auth status

### TanStack Query (Server State)
- `useChildren`: Fetch all children (used in both portal selection and child selection)
- `useChild`: Fetch single child (used in child profile)
- Portal-specific queries in respective pages

## UI/UX Design Patterns

### Parent Portal Design
- **Color Scheme**: Professional (white, gray, blue)
- **Layout**: Sidebar navigation (fixed left side)
- **Typography**: Standard size, professional
- **Icons**: `@tabler/icons-react` (IconUsers, IconChecklist, IconChartBar, IconSettings)
- **Navigation**: Vertical sidebar with active state highlighting

### Child Portal Design
- **Color Scheme**: Child-friendly gradients (purple, pink, blue)
- **Layout**: Top bar + horizontal tabs
- **Typography**: Larger, friendlier
- **Icons**: `@tabler/icons-react` (IconChecklist, IconSparkles, IconMessageCircle, IconChartBar)
- **Navigation**: Horizontal tabs with active state highlighting

## Navigation Patterns

### From Login to Portal
```typescript
// After successful login
navigate('/portal-selection')
```

### From Portal Selection to Parent Portal
```typescript
navigate('/parent-portal')
```

### From Portal Selection to Child Portal
```typescript
navigate('/child-selection')
// Then child selects themselves
navigate(`/child-portal/${childId}`)
```

### Back to Portal Selection
```typescript
// From parent portal layout footer
navigate('/portal-selection')

// From child portal layout
navigate('/child-selection')
// Then from child selection
navigate('/portal-selection')
```

### Within Portals
```typescript
// Parent portal navigation
navigate('/parent-portal/children/${childId}')
navigate('/parent-portal/children/${childId}/tasks')
navigate('/parent-portal/tasks')
navigate('/parent-portal/analytics')
navigate('/parent-portal/settings')

// Child portal navigation
navigate('/child-portal/${childId}/tasks')
navigate('/child-portal/${childId}/tools')
navigate('/child-portal/${childId}/chat')
navigate('/child-portal/${childId}/progress')
```

## Protected Routes

All portal routes are wrapped in `<ProtectedRoute>`:
```typescript
<Route path="/portal-selection" element={<ProtectedRoute><PortalSelectionPage /></ProtectedRoute>} />
<Route path="/parent-portal" element={<ProtectedRoute><ParentPortalLayout /></ProtectedRoute>}>
  {/* Nested routes */}
</Route>
<Route path="/child-portal/:childId" element={<ProtectedRoute><ChildPortalLayout /></ProtectedRoute>}>
  {/* Nested routes */}
</Route>
```

`ProtectedRoute` checks `authSlice.isAuthenticated` and redirects to `/login` if false.

## PIN Verification Context

### Parent Portal
- **No PIN verification needed** - Parent is already authenticated
- Child profile page (`/parent-portal/children/:childId`) does NOT show PIN modal
- Parent has full access to all child information

### Child Portal
- **PIN verification required (if enabled)** - When child selects themselves
- PIN verification happens after child selection, before entering child portal
- Component exists: `PinVerificationModal.tsx` (currently in child-profile/components)
- API: `POST /api/children/{id}/verify-pin`
- Hook: `useVerifyChildPin`
- **Status**: Not yet integrated into child portal flow (Coming Soon)

## i18n Translation Namespaces

### Existing Namespaces
- `common`: Shared text (back, loading, age, etc.)
- `auth`: Authentication text (login, register, logout)
- `errors`: Error messages
- `tasks`: Task-related text

### Portal-Specific Text
Portal navigation labels and descriptions are currently in `common` namespace but may benefit from a dedicated `portals` namespace in the future.

## Future Enhancements

### Planned Features
1. **Parent Portal PIN Protection** - Optional PIN when entering parent portal
2. **Child Portal Task View** - Child-oriented task completion interface
3. **Child Portal Tools** - Learning tools for children
4. **Child Portal AI Chat** - Age-appropriate AI chat
5. **Child Portal Progress** - Visual progress tracking
6. **Parent Portal Analytics** - Usage and progress analytics
7. **Parent Portal Settings** - Account and child settings
8. **Parent Portal All Tasks** - View tasks across all children

### Potential Improvements
- Add portal-specific theme configuration
- Add portal-specific notification systems
- Add portal switching animation/transition
- Add breadcrumb navigation in parent portal
- Add avatar customization in child selection

## Testing Considerations

### Unit Tests
- Portal selection navigation logic
- Layout component rendering
- Protected route behavior
- Navigation state management

### Integration Tests
- Full login → portal selection → portal flow
- Portal switching (parent ↔ child)
- Back navigation flows
- PIN verification flow (when implemented)

### E2E Tests
- Complete user journey through both portals
- Child selection and portal entry
- Parent portal child management flow
- Task management flow from both portals

## Related Documentation

- [CODE_ORGANIZATION.md](../../CODE_ORGANIZATION.md) - Portal-based file organization
- [api-registry.md](../../api-registry.md) - API endpoints used by portals
- [component-map.md](../../component-map.md) - Reusable components
- [Task Management](../task-management/context.md) - Task features used in both portals

## Change History

- 2024-XX-XX: Initial portal system implementation
  - Created portal selection page
  - Created parent portal layout with sidebar navigation
  - Created child selection page
  - Created child portal layout with tab navigation
  - Restructured routing to portal-based architecture
  - Removed PIN verification from parent portal child profile
