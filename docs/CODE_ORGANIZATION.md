# Code Organization Guide

## Purpose
This document helps locate all related files when adding or modifying features in the **portal-based architecture**. Use this as a **quick reference map** to understand code dependencies and find what needs to be changed.

## Portal-Based Architecture Overview

The application uses a **two-portal system** after parent authentication:

1. **Portal Selection** - Landing page after parent login with two choices:
   - Parent Portal (management interface)
   - Child Selection → Child Portal (child-friendly interface)

2. **Parent Portal** - Professional interface for parents to:
   - Manage children (view, add, edit, delete)
   - Manage tasks for children
   - View analytics
   - Configure settings

3. **Child Portal** - Child-friendly interface for children to:
   - Complete tasks
   - Use learning tools
   - Chat with AI
   - View their progress

## Routing Structure

```
/                           → Redirect to /portal-selection or /login
/login                      → Parent login
/register                   → Parent registration

/portal-selection          → Landing page (choose portal)

/parent-portal             → Parent portal layout
  ├── /                    → Manage children (index)
  ├── /children/:childId   → Child profile view
  ├── /children/:childId/tasks → Task management for child
  ├── /tasks               → All tasks view
  ├── /analytics           → Analytics dashboard
  └── /settings            → Settings

/child-selection           → Children select themselves

/child-portal/:childId     → Child portal layout
  ├── /tasks               → Child's tasks (default)
  ├── /tools               → Learning tools
  ├── /chat                → AI chat
  └── /progress            → Progress tracking
```

---

## How to Use This Guide

### When Adding a New Feature:
1. Determine which **portal** the feature belongs to (Parent or Child)
2. Check the **Feature Categories** section to understand similar features
3. Review the **File Pattern Reference** to know where files should go
4. Use the **Cross-Cutting Concerns** section to identify shared code that might be affected
5. Follow the **Change Checklist** to ensure all related files are updated

### When Modifying Existing Features:
1. Find the feature in **Feature Inventory**
2. Follow the file paths to locate all related code
3. Check **Dependencies** to find other features that might be affected

---

## Feature Categories

### 1. Authentication & Authorization
Features related to parent login, registration, and access control.

**Pattern**: Parent authentication flows
**Key Files**:
- Backend: `backend/routes/auth.py`, `backend/services/auth_service.py`, `backend/models/user.py`
- Frontend: `frontend/src/pages/login/`, `frontend/src/pages/register/`, `frontend/src/store/slices/authSlice.ts`

### 2. Portal Navigation
Features for portal selection and navigation between parent/child portals.

**Pattern**: Portal switching, layout navigation
**Key Files**:
- Frontend: `frontend/src/pages/portal-selection/`, `frontend/src/pages/parent-portal/layout.tsx`, `frontend/src/pages/child-portal/layout.tsx`
- Routing: `frontend/src/App.tsx`

### 3. Parent Portal - Child Management
Features for parents to manage children (CRUD operations).

**Pattern**: List children, add/edit/delete child profiles
**Key Files**:
- Backend: `backend/routes/children.py`, `backend/services/child_service.py`, `backend/models/child.py`
- Frontend: `frontend/src/pages/parent-portal/children/`, `frontend/src/pages/child-profile/`

### 4. Parent Portal - Task Management
Features for parents to create and manage tasks for children.

**Pattern**: CRUD operations on tasks, assign to children
**Key Files**:
- Backend: `backend/routes/tasks.py`, `backend/services/task_service.py`, `backend/models/task.py`
- Frontend: `frontend/src/pages/task-list/`

### 5. Child Portal - Task Completion
Features for children to view and complete their tasks.

**Pattern**: View tasks, start/pause/complete tasks
**Key Files**:
- Backend: Same task routes with different context
- Frontend: `frontend/src/pages/child-portal/` (task views)

### 6. Child Portal - Interactive Features
Features for children to use tools, chat with AI, track progress.

**Pattern**: Child-friendly interactive interfaces
**Key Files**:
- Backend: `backend/workflows/` (AI workflows)
- Frontend: `frontend/src/pages/child-portal/` (tools, chat, progress)

---

## File Pattern Reference

### Backend Files

#### When adding a new **entity/resource** (e.g., Task, Collection, Activity):

```
backend/
├── models/
│   └── {entity}.py                    # Data models (DB schema, Pydantic models)
├── services/
│   └── {entity}_service.py            # Business logic (CRUD operations)
├── routes/
│   └── {entity}.py                    # API endpoints (HTTP routes)
└── (optional) workflows/
    └── {entity}_workflow.py           # LangGraph workflows for complex logic
```

**Example**: Adding "Reward" feature
- `backend/models/reward.py` - RewardCreate, Reward, RewardInDB models
- `backend/services/reward_service.py` - create_reward(), get_rewards(), etc.
- `backend/routes/reward.py` - POST /api/rewards, GET /api/rewards, etc.

#### When modifying an existing entity:

**Find locations**:
1. Model: `backend/models/{entity}.py` - Update schema
2. Service: `backend/services/{entity}_service.py` - Update business logic
3. Routes: `backend/routes/{entity}.py` - Update API endpoints
4. **Related services**: Search for `{entity}_service` imports across codebase

### Frontend Files - Portal Structure

#### Parent Portal Pages:

```
frontend/src/pages/parent-portal/
├── layout.tsx                         # Parent portal sidebar layout
├── {feature}/
│   ├── index.tsx                      # Main feature page
│   └── components/                    # Feature-specific components
│       ├── {Component}Modal.tsx       # Modals
│       └── {Component}Card.tsx        # Cards, sub-components
```

**Example**: Parent portal "Analytics" page
- `frontend/src/pages/parent-portal/analytics/index.tsx` - Main analytics page
- `frontend/src/pages/parent-portal/analytics/components/ChartCard.tsx` - Chart component
- Uses parent portal layout (sidebar nav provided)

#### Child Portal Pages:

```
frontend/src/pages/child-portal/
├── layout.tsx                         # Child portal tab layout
├── {feature}/
│   ├── index.tsx                      # Main feature page
│   └── components/                    # Feature-specific components
```

**Example**: Child portal "Tools" page
- `frontend/src/pages/child-portal/tools/index.tsx` - Main tools page
- `frontend/src/pages/child-portal/tools/components/ToolCard.tsx` - Tool card component
- Uses child portal layout (tab nav provided)

#### Shared Pages (Outside Portals):

```
frontend/src/pages/
├── portal-selection/
│   └── index.tsx                      # Portal selection landing page
├── child-selection/
│   └── index.tsx                      # Child selection for child portal
├── login/
│   └── index.tsx                      # Parent login
└── register/
    └── index.tsx                      # Parent registration
```

#### API, Types, and Shared Code:

```
frontend/src/
├── api/
│   ├── queries/
│   │   └── use{Entity}.ts             # TanStack Query hooks (GET)
│   └── mutations/
│       └── use{Action}{Entity}.ts     # TanStack Query mutations (POST/PUT/DELETE)
├── types/
│   └── {entity}.ts                    # TypeScript interfaces
└── components/                        # Shared reusable components
    └── {Component}.tsx
```

---

## Cross-Cutting Concerns

These files/patterns affect **multiple features**. Always check if your changes impact these:

### 1. Portal Layouts

**Location**:
- `frontend/src/pages/parent-portal/layout.tsx` - Parent portal sidebar nav
- `frontend/src/pages/child-portal/layout.tsx` - Child portal tab nav

**When to check**:
- Adding new navigation items to portal
- Changing portal navigation structure
- Adding portal-wide features (e.g., notifications)

**Files to update**:
- Layout component (add nav item)
- Route in `App.tsx` (add route)
- New page under appropriate portal folder

### 2. Routing Configuration

**Location**: `frontend/src/App.tsx`

**When to check**:
- Adding new pages
- Changing URL structure
- Adding protected routes

**Files to update**:
- `frontend/src/App.tsx` (add route under correct portal)
- Any components with navigation links
- Any components with `navigate()` calls

### 3. Data Types & Interfaces

**Location**:
- Backend: `backend/models/*.py`
- Frontend: `frontend/src/types/*.ts`

**When to check**:
- Adding/removing/renaming fields in any entity
- Changing data types

**Files to update**:
- Model definition (backend)
- Type definition (frontend)
- All services that create/update the entity
- All API routes that return the entity
- All frontend components that display the entity (both portals)

### 4. API Endpoints

**Location**: `backend/routes/*.py`, `frontend/src/api/`

**When to check**:
- Adding new endpoints
- Changing request/response format
- Changing URL paths

**Files to update**:
- Route file (backend)
- API hook file (frontend)
- `docs/api-registry.md` (documentation)

### 5. Authentication & Authorization

**Location**:
- Backend: `backend/dependencies/auth.py`, `backend/routes/auth.py`
- Frontend: `frontend/src/store/slices/authSlice.ts`, `frontend/src/api/client.ts`

**When to check**:
- Adding protected routes
- Changing JWT token structure
- Adding portal-specific authorization

**Files to update**:
- Auth dependencies (if token changes)
- Protected routes (add `Depends(get_current_user)`)
- Frontend auth slice (if stored user data changes)
- API client interceptors (if auth header changes)

### 6. Internationalization (i18n)

**Location**: `frontend/src/i18n/locales/{lang}/*.json`

**When to check**:
- Adding new UI text in either portal
- Adding new pages
- Adding new form fields

**Files to update**:
- `frontend/src/i18n/config.ts` (if adding new namespace)
- `frontend/src/i18n/locales/en/*.json` (English)
- `frontend/src/i18n/locales/zh/*.json` (Chinese)

---

## Feature Inventory

Quick reference of **existing features** and their file locations.

### Portal Selection & Navigation

- **Purpose**: Landing page after login, choose between parent/child portal
- **Frontend**:
  - Page: `frontend/src/pages/portal-selection/index.tsx`
  - Child Selection: `frontend/src/pages/child-selection/index.tsx`
  - Routing: `frontend/src/App.tsx`
- **Flow**: Login → Portal Selection → (Parent Portal OR Child Selection → Child Portal)

### Parent Portal - Layout & Navigation

- **Purpose**: Sidebar navigation for parent portal features
- **Frontend**:
  - Layout: `frontend/src/pages/parent-portal/layout.tsx`
  - Nav Items: Children, Tasks, Analytics, Settings
  - Footer: Portal Selection, Logout buttons

### Parent Portal - Manage Children

- **Purpose**: View all children, add/edit/delete children
- **Backend**:
  - Routes: `backend/routes/children.py` (GET /api/children, POST /api/children, etc.)
  - Service: `backend/services/child_service.py`
  - Models: `backend/models/child.py`
- **Frontend**:
  - Page: `frontend/src/pages/parent-portal/children/index.tsx`
  - Components: `frontend/src/pages/parent-portal/children/components/AddChildModal.tsx`
  - Hooks: `frontend/src/api/queries/useChildren.ts`, `frontend/src/api/mutations/useCreateChild.ts`
- **Types**: `frontend/src/types/child.ts`
- **Routes**: `/parent-portal` (index), `/parent-portal/children/:childId`

### Parent Portal - Child Profile

- **Purpose**: View single child details, navigate to child's tasks
- **Backend**:
  - Routes: `backend/routes/children.py` (GET /api/children/{id})
  - Service: `backend/services/child_service.py`
- **Frontend**:
  - Page: `frontend/src/pages/child-profile/index.tsx`
  - Hooks: `frontend/src/api/queries/useChild.ts`
- **Types**: `frontend/src/types/child.ts`
- **Routes**: `/parent-portal/children/:childId`
- **Note**: No PIN verification in parent portal (parent is authenticated)

### Parent Portal - Task Management

- **Purpose**: Manage tasks for a specific child
- **Backend**:
  - Routes: `backend/routes/tasks.py`
  - Service: `backend/services/task_service.py`
  - Models: `backend/models/task.py`, `backend/models/task_collection.py`
- **Frontend**:
  - Page: `frontend/src/pages/task-list/index.tsx`
  - Hooks: `frontend/src/api/queries/useTasks.ts`, `frontend/src/api/mutations/useCreateTask.ts`
- **Types**: `frontend/src/types/task.ts`
- **Routes**: `/parent-portal/children/:childId/tasks`

### Child Portal - Layout & Navigation

- **Purpose**: Tab navigation for child portal features
- **Frontend**:
  - Layout: `frontend/src/pages/child-portal/layout.tsx`
  - Nav Items: My Tasks, Tools, Chat with AI, My Progress
  - Top Bar: Shows child's name, back button
  - Style: Child-friendly gradient backgrounds

### Child Portal - Task Views

- **Purpose**: Children view and complete their tasks
- **Backend**: Same task APIs as parent portal
- **Frontend**: `frontend/src/pages/child-portal/` (task pages)
- **Routes**: `/child-portal/:childId/tasks`
- **Status**: Placeholder (Coming Soon)

### Child Portal - Tools, Chat, Progress

- **Purpose**: Interactive features for children
- **Frontend**: `frontend/src/pages/child-portal/` (tools, chat, progress pages)
- **Routes**:
  - `/child-portal/:childId/tools`
  - `/child-portal/:childId/chat`
  - `/child-portal/:childId/progress`
- **Status**: Placeholders (Coming Soon)

### Parent Authentication

- **Purpose**: Parent login, registration, logout
- **Backend**:
  - Routes: `backend/routes/auth.py` (POST /api/auth/login, POST /api/auth/register)
  - Service: `backend/services/auth_service.py`
  - Models: `backend/models/user.py`
- **Frontend**:
  - Pages: `frontend/src/pages/login/`, `frontend/src/pages/register/`
  - Hooks: `frontend/src/api/mutations/useLogin.ts`, `frontend/src/api/mutations/useRegister.ts`
  - Store: `frontend/src/store/slices/authSlice.ts`
- **Types**: `frontend/src/types/user.ts`
- **Flow**: Login → Portal Selection

### PIN Verification

- **Purpose**: Verify child PIN when entering child portal
- **Backend**:
  - Routes: `backend/routes/children.py` (POST /api/children/{id}/verify-pin)
  - Service: `backend/services/child_service.py` (verify_child_pin method)
- **Frontend**:
  - Component: `frontend/src/pages/child-profile/components/PinVerificationModal.tsx`
  - Hook: `frontend/src/api/mutations/useVerifyChildPin.ts`
- **Context**: Used in child portal when child selects themselves (if pin_required=true)
- **Note**: NOT used in parent portal (parent already authenticated)

### Language Switching

- **Purpose**: Switch between English and Chinese
- **Frontend**:
  - Component: `frontend/src/components/LanguageSwitcher.tsx`
  - Config: `frontend/src/i18n/config.ts`
  - Translations: `frontend/src/i18n/locales/{lang}/*.json`
  - Namespaces: common, auth, errors, tasks

---

## Change Checklist

Use this checklist when making changes to ensure you don't miss related files.

### ✅ Adding a Parent Portal Feature

Example: Adding "Reports" page to parent portal

- [ ] Frontend page: Create `frontend/src/pages/parent-portal/reports/index.tsx`
- [ ] Frontend route: Add route to `frontend/src/App.tsx` under `/parent-portal` routes
- [ ] Layout nav: Add nav item to `frontend/src/pages/parent-portal/layout.tsx`
- [ ] Backend endpoints: Create `backend/routes/reports.py` if new API needed
- [ ] Backend service: Create `backend/services/report_service.py` if needed
- [ ] Frontend API hooks: Create hooks in `frontend/src/api/queries/` or `mutations/`
- [ ] Types: Create `frontend/src/types/report.ts` if new entity
- [ ] i18n: Add translations to `locales/{lang}/common.json` or new namespace
- [ ] Documentation: Create `docs/features/reports/context.md`
- [ ] Documentation: Update `docs/api-registry.md` if new endpoints
- [ ] Documentation: Update `docs/component-map.md` if new components

### ✅ Adding a Child Portal Feature

Example: Adding "Rewards" page to child portal

- [ ] Frontend page: Create `frontend/src/pages/child-portal/rewards/index.tsx`
- [ ] Frontend route: Add route to `frontend/src/App.tsx` under `/child-portal/:childId` routes
- [ ] Layout nav: Add nav item to `frontend/src/pages/child-portal/layout.tsx`
- [ ] Child-friendly UI: Use gradient backgrounds, large icons, simple language
- [ ] Backend endpoints: Create `backend/routes/rewards.py` if new API needed
- [ ] Backend service: Create `backend/services/reward_service.py` if needed
- [ ] Frontend API hooks: Create hooks in `frontend/src/api/queries/` or `mutations/`
- [ ] Types: Create `frontend/src/types/reward.ts` if new entity
- [ ] i18n: Add child-friendly translations
- [ ] Documentation: Create `docs/features/rewards/context.md`

### ✅ Adding a Feature Used in Both Portals

Example: Task feature (parent manages, child completes)

- [ ] Backend: Create single API that serves both contexts
- [ ] Backend service: Add methods for both parent and child actions
- [ ] Frontend parent view: Create in `frontend/src/pages/parent-portal/`
- [ ] Frontend child view: Create in `frontend/src/pages/child-portal/`
- [ ] Shared types: Define in `frontend/src/types/`
- [ ] Shared API hooks: Create in `frontend/src/api/`
- [ ] i18n: Add translations for both contexts (parent and child language)
- [ ] Documentation: Document both use cases in feature context

### ✅ Adding a New Field to an Entity

Example: Adding `favorite_color` to Child

- [ ] Backend model: `backend/models/child.py` - Add field to `Child`, `ChildCreate`
- [ ] Backend service: `backend/services/child_service.py` - Update methods
- [ ] Frontend types: `frontend/src/types/child.ts` - Add field
- [ ] Frontend forms: Update add/edit child modals in parent portal
- [ ] Frontend displays: Update child profile, child cards in both portals
- [ ] Database: Update seed script: `backend/scripts/seed_test_data.py`
- [ ] i18n: Add translations for field label
- [ ] Documentation: Update feature context docs

### ✅ Adding a New API Endpoint

Example: Adding `GET /api/children/{id}/statistics`

- [ ] Backend route: Add endpoint to `backend/routes/children.py`
- [ ] Backend service: Add method to `backend/services/child_service.py`
- [ ] Frontend API hook: Create `frontend/src/api/queries/useChildStatistics.ts`
- [ ] Frontend component: Use hook in appropriate portal page
- [ ] Types: Define response type in `frontend/src/types/child.ts`
- [ ] Documentation: Add to `docs/api-registry.md`
- [ ] Test: Test the endpoint

### ✅ Changing Navigation Structure

Example: Moving task management to top-level parent portal nav

- [ ] App.tsx: Update route paths in `frontend/src/App.tsx`
- [ ] Parent layout: Update nav items in `frontend/src/pages/parent-portal/layout.tsx`
- [ ] Update all navigate() calls: Search for old paths and update
- [ ] Update all link href: Search for old paths and update
- [ ] Test all navigation flows: Click through all nav items
- [ ] Documentation: Update routing documentation

---

## Search Strategies

### Finding All Files Related to a Feature

**Method 1: Grep by portal + feature**
```bash
# Parent portal feature
cd frontend/src
grep -r "parent-portal" --include="*.tsx" --include="*.ts" .

# Child portal feature
cd frontend/src
grep -r "child-portal" --include="*.tsx" --include="*.ts" .
```

**Method 2: Grep by entity name**
```bash
# Backend
cd backend
grep -r "task" --include="*.py" .

# Frontend
cd frontend
grep -r "task" --include="*.tsx" --include="*.ts" src/
```

**Method 3: Use documentation**
1. Check `docs/features/{feature-name}/context.md` for file locations
2. Check `docs/api-registry.md` for API endpoints
3. Check `docs/component-map.md` for components/hooks

### Finding Portal-Specific Code

**Parent portal pages:**
```bash
ls frontend/src/pages/parent-portal/
```

**Child portal pages:**
```bash
ls frontend/src/pages/child-portal/
```

**Shared pages (selection, auth):**
```bash
ls frontend/src/pages/portal-selection/
ls frontend/src/pages/child-selection/
```

### Finding Navigation Changes

**All navigate() calls:**
```bash
grep -r "navigate(" --include="*.tsx" frontend/src/
```

**All route definitions:**
```bash
grep -r "<Route" frontend/src/App.tsx
```

---

## Common Patterns

### Pattern 1: Portal-Specific Page

When adding a page to a specific portal:

**Parent Portal Page**:
1. Create page: `frontend/src/pages/parent-portal/{feature}/index.tsx`
2. Page renders content only (layout provides sidebar nav)
3. Add route to App.tsx under `/parent-portal` nested routes
4. Add nav item to parent layout if needed
5. Use professional UI (clean, data-focused)

**Child Portal Page**:
1. Create page: `frontend/src/pages/child-portal/{feature}/index.tsx`
2. Page renders content only (layout provides tab nav)
3. Add route to App.tsx under `/child-portal/:childId` nested routes
4. Add nav item to child layout if needed
5. Use child-friendly UI (gradients, large icons, simple language)

### Pattern 2: Nested Routes with Layouts

Both portals use nested routing:

```typescript
// App.tsx
<Route path="/parent-portal" element={<ParentPortalLayout />}>
  <Route index element={<ManageChildrenPage />} />
  <Route path="children/:childId" element={<ChildProfilePage />} />
  {/* Layout provides sidebar nav, pages render in <Outlet /> */}
</Route>

<Route path="/child-portal/:childId" element={<ChildPortalLayout />}>
  <Route index element={<Navigate to="tasks" />} />
  <Route path="tasks" element={<TasksPage />} />
  {/* Layout provides tab nav, pages render in <Outlet /> */}
</Route>
```

### Pattern 3: Portal Navigation

**From portal selection to portal:**
- Parent portal: `navigate('/parent-portal')`
- Child portal: `navigate('/child-portal/${childId}')`

**Back to portal selection:**
- From either portal: `navigate('/portal-selection')`

**Within portal:**
- Use relative paths or full paths
- Parent: `navigate('/parent-portal/children/${childId}')`
- Child: `navigate('/child-portal/${childId}/tasks')`

### Pattern 4: Shared Backend, Different Frontend

Tasks, children, and other entities have shared backend APIs but different frontend views:

**Backend**: Single API serves both portals
**Frontend Parent View**: Management interface (create, edit, delete, assign)
**Frontend Child View**: Usage interface (view, complete, interact)

---

## Quick Reference: Where to Put Files

| If you're adding... | Put it here... |
|---------------------|---------------|
| Parent portal page | `frontend/src/pages/parent-portal/{feature}/index.tsx` |
| Child portal page | `frontend/src/pages/child-portal/{feature}/index.tsx` |
| Portal selection feature | `frontend/src/pages/portal-selection/` or `frontend/src/pages/child-selection/` |
| Portal layout nav item | `frontend/src/pages/{portal}/layout.tsx` |
| Portal route | `frontend/src/App.tsx` (under correct portal nested routes) |
| New entity model | `backend/models/{entity}.py` |
| Business logic | `backend/services/{entity}_service.py` |
| API endpoints | `backend/routes/{entity}.py` |
| Complex workflows | `backend/workflows/{workflow}.py` |
| TypeScript types | `frontend/src/types/{entity}.ts` |
| TanStack Query (GET) | `frontend/src/api/queries/use{Entity}.ts` |
| TanStack Mutation | `frontend/src/api/mutations/use{Action}{Entity}.ts` |
| Shared component | `frontend/src/components/{Component}.tsx` |
| Portal-specific component | `frontend/src/pages/{portal}/{feature}/components/{Component}.tsx` |
| Redux slice | `frontend/src/store/slices/{feature}Slice.ts` |
| UI translations | `frontend/src/i18n/locales/{lang}/{namespace}.json` |
| Feature documentation | `docs/features/{feature}/context.md` |

---

## Additional Resources

- **API Registry**: `docs/api-registry.md` - All API endpoints
- **Component Map**: `docs/component-map.md` - All reusable components and hooks
- **Roadmap**: `docs/roadmap/README.md` - Project progress tracker
- **CLAUDE.md**: Development guidelines and rules
