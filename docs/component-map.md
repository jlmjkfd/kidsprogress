# Component Map

> Catalog of reusable components
> Last updated: 2025-11-19

## UI Components

### LanguageSwitcher
- **Location**: `frontend/src/components/LanguageSwitcher.tsx`
- **Props**: None
- **Description**: Language toggle between English and Chinese
- **Used in**: Login, Register, Portal Selection, Parent Portal layout, Child Portal layout
- **Dependencies**: react-i18next

### AIRecommendationButton
- **Location**: `frontend/src/components/AIRecommendationButton.tsx`
- **Props**: `{ childId: string, currentTime?: string, onTaskStart?: (taskId: string) => void }`
- **Description**: AI-powered task recommendation with "What should I do now?" button
- **Features**:
  - Gradient "What should I do now?" button
  - Break suggestions with duration
  - Task recommendation with reasoning and priority score
  - Collapsible alternatives list
  - Conflict warnings
  - One-click start task
- **Used in**: Parent portal tasks page, Child portal tasks page
- **Dependencies**: TanStack Query, react-i18next, @tabler/icons-react

### BreakTimer
- **Location**: `frontend/src/components/BreakTimer.tsx`
- **Props**: `{ durationMinutes: number, onComplete?: () => void, onSkip?: () => void }`
- **Description**: Kid-friendly break timer with circular progress visualization
- **Features**:
  - SVG circular progress ring with animation
  - Countdown timer (MM:SS format)
  - Large 72px "Start Break" button
  - Motivational messages during break
  - Skip break option
- **Used in**: Child portal tasks page (when break is recommended)
- **Dependencies**: react, react-i18next, @tabler/icons-react

### OverdueView
- **Location**: `frontend/src/components/OverdueView.tsx`
- **Props**: `{ childId: string }`
- **Description**: Displays overdue tasks grouped by obligation level with smart expansion
- **Features**:
  - Three-tiered display: MUST_DO (always visible), SHOULD_DO (collapsible), OPTIONAL (collapsible)
  - Stats summary showing MUST_DO count
  - Integrates with useCompleteTask mutation for marking tasks done
  - Empty state with "All Done!" message
  - Mobile-responsive design
- **Used in**: Child portal tasks page (Overdue tab)
- **Dependencies**: react, react-i18next, @tabler/icons-react, TanStack Query

### OverdueTaskCard
- **Location**: `frontend/src/components/OverdueTaskCard.tsx`
- **Props**: `{ task: OverdueTask, onMarkDone?: (taskId: string) => void, onMarkAllDone?: (sourceId: string) => void }`
- **Description**: Renders individual overdue task cards with appropriate actions
- **Features**:
  - Separate rendering for one-off vs recurring tasks
  - Shows criteria icons (metrics, subtasks, photo, timer)
  - Action buttons based on completion_type: "Mark Done" (simple) or "Open Task" (with criteria)
  - Expandable details for recurring tasks showing last 7 missed dates
  - Smart grouping: recurring tasks show total_missed_days and date range
  - Mobile-responsive design
- **Used in**: OverdueView component
- **Dependencies**: react, react-i18next, react-router-dom, @tabler/icons-react

### RecurrencePicker
- **Location**: `frontend/src/components/RecurrencePicker.tsx`
- **Props**: `{ value: string, onChange: (rrule: string) => void }`
- **Description**: User-friendly UI for creating recurrence patterns (generates RRULE strings)
- **Features**:
  - Frequency selector (Daily/Weekly/Monthly/Yearly)
  - Interval input (repeat every N days/weeks)
  - Weekday picker buttons for weekly recurrence
  - End date options (Never/On date/After N occurrences)
  - Auto-generates valid RRULE format in background
- **Used in**: UnifiedTaskModal (parent portal)
- **Dependencies**: react, react-i18next, @tabler/icons-react

### Calendar Components (Multi-view System)
- **Location**: `frontend/src/components/calendar/`
- **Main Export**: `TaskCalendar` from `@/components/calendar`
- **Description**: Comprehensive calendar system with multiple views for task visualization

#### TaskCalendar (Main Component)
- **File**: `calendar/TaskCalendar.tsx`
- **Props**:
  ```typescript
  {
    tasks: Task[]
    childId: string
    onTaskClick?: (task: Task) => void
    onDayClick?: (date: string, tasks: Task[], dayType?: DayType) => void
    editable?: boolean
    defaultView?: "month" | "week" | "day"
  }
  ```
- **Features**:
  - Three view modes: Month, Week, Day (with view switcher)
  - Day type integration (school days, holidays, weekends)
  - Hide informational tasks toggle
  - Navigation adapts to view (month/week/day increments)
  - Mobile-responsive design
  - Full i18n support with locale-based date formatting
  - Timezone-safe date handling (uses local date constructors)

#### DayDetailModal
- **File**: `calendar/DayDetailModal.tsx`
- **Props**: `{ isOpen, onClose, date, tasks, dayType?, onTaskClick?, editable? }`
- **Features**:
  - Filter by task type (All/Actionable/Informational/Completed)
  - Hide breaks checkbox
  - Separates scheduled vs unscheduled tasks
  - Shows overdue tasks for past days
  - Task counts for each filter

#### DayView
- **File**: `calendar/DayView.tsx`
- **Props**: `{ date, tasks, dayType?, onTaskClick?, hideInformational? }`
- **Features**:
  - 24-hour timeline (0:00-23:00) with 80px per hour
  - Tasks positioned at scheduled times
  - Visual hierarchy (informational=grey, must-do=red, should-do=blue)
  - Green dot indicator for actual start times
  - Unscheduled tasks section
  - Mobile: vertical scroll through day

#### WeekView
- **File**: `calendar/WeekView.tsx`
- **Props**: `{ startDate, tasks, dayTypes?, onTaskClick?, hideInformational? }`
- **Features**:
  - 7-day grid (Sunday-Saturday)
  - 24-hour timeline per day (48px per hour)
  - Task blocks with color coding
  - Day type background colors
  - Mobile: horizontal scroll

- **Used in**: Parent portal tasks page, child portal tasks page
- **Dependencies**: react, react-i18next, @tabler/icons-react, TanStack Query
- **Key Technical Note**: All date parsing uses local date constructors to avoid timezone offsets

## Icons
- **Package**: `@tabler/icons-react`
- **Usage**: `import { IconName } from '@tabler/icons-react'`
- **Currently used**:
  - `IconLogin` - Login button
  - `IconUserPlus` - Register button, parent portal
  - `IconAlertCircle` - Error messages
  - `IconUser` - Child avatar fallback, user profiles
  - `IconUsers` - Parent portal navigation (children)
  - `IconPlus` - Add child button
  - `IconLogout` - Logout button
  - `IconLock` - PIN protection indicator
  - `IconArrowLeft` - Back buttons
  - `IconChecklist` - Tasks navigation (both portals)
  - `IconChartBar` - Analytics, progress navigation
  - `IconSettings` - Settings navigation
  - `IconSparkles` - Tools navigation (child portal)
  - `IconMessageCircle` - Chat navigation (child portal)

## Hooks

### Authentication Hooks

#### useLogin
- **Location**: `frontend/src/api/mutations/useLogin.ts`
- **Type**: TanStack Query mutation
- **Purpose**: Login mutation
- **Returns**: `{ mutateAsync, isPending, isError }`

#### useRegister
- **Location**: `frontend/src/api/mutations/useRegister.ts`
- **Type**: TanStack Query mutation
- **Purpose**: Registration mutation
- **Returns**: `{ mutateAsync, isPending, isError }`

#### useCurrentUser
- **Location**: `frontend/src/api/queries/useCurrentUser.ts`
- **Type**: TanStack Query query
- **Purpose**: Fetch current authenticated user
- **Params**: `enabled: boolean` (optional, default true)
- **Returns**: `{ data, refetch }`

### Children Hooks

#### useChildren
- **Location**: `frontend/src/api/queries/useChildren.ts`
- **Type**: TanStack Query query
- **Purpose**: Fetch all children for authenticated parent
- **Returns**: `{ data, isLoading, isError }`
- **Used in**: Portal selection, child selection, manage children page

#### useChild
- **Location**: `frontend/src/api/queries/useChild.ts`
- **Type**: TanStack Query query
- **Purpose**: Fetch single child profile by ID
- **Params**: `childId: string`
- **Returns**: `{ data, isLoading, error }`
- **Used in**: Child profile page, child portal layout

#### useCreateChild
- **Location**: `frontend/src/api/mutations/useCreateChild.ts`
- **Type**: TanStack Query mutation
- **Purpose**: Create new child profile
- **Returns**: `{ mutateAsync, isPending, isError }`
- **Auto-invalidates**: `['children']` query after success

#### useVerifyChildPin
- **Location**: `frontend/src/api/mutations/useVerifyChildPin.ts`
- **Type**: TanStack Query mutation
- **Purpose**: Verify child's PIN for access
- **Params**: `{ childId: string, pin: string }`
- **Returns**: `{ mutateAsync }` (returns boolean)
- **Context**: Used in child portal (not parent portal)

### Task Hooks

#### useTasks
- **Location**: `frontend/src/api/queries/useTasks.ts`
- **Type**: TanStack Query query
- **Purpose**: Fetch tasks for a specific child
- **Params**: `childId: string`
- **Returns**: `{ data, isLoading, error }`
- **Used in**: Task list page (parent portal)

#### useCreateTask
- **Location**: `frontend/src/api/mutations/useCreateTask.ts`
- **Type**: TanStack Query mutation
- **Purpose**: Create new task for a child
- **Returns**: `{ mutateAsync, isPending, isError }`
- **Auto-invalidates**: `['tasks', childId]` query after success

### Enhanced Task Management Hooks

#### AI Hooks (Phase 3)

##### useDayTasks
- **Location**: `frontend/src/api/queries/useAISchedule.ts`
- **Type**: TanStack Query query
- **Purpose**: Get comprehensive day summary (tasks, time blocks, statistics)
- **Params**: `childId: string, targetDate?: string, parentId?: string`
- **Returns**: `DayTasksSummary`

##### useAIRecommendation
- **Location**: `frontend/src/api/queries/useAISchedule.ts`
- **Type**: TanStack Query query
- **Purpose**: Get AI recommendation for "What should I do now?"
- **Params**: `childId: string, currentTime?: string, childState?: ChildState, enabled?: boolean`
- **Returns**: `TaskRecommendation` (suggested_task, reasoning, priority_score, break_suggested, alternatives, conflicts)
- **Used in**: AIRecommendationButton

##### useScheduleConflicts
- **Location**: `frontend/src/api/queries/useAISchedule.ts`
- **Type**: TanStack Query query
- **Purpose**: Detect time block overlaps, prerequisites, break needs
- **Params**: `childId: string, targetDate?: string, parentId?: string, enabled?: boolean`
- **Returns**: `ScheduleConflict[]`
- **Used in**: Parent portal tasks page (conflict warnings)

##### useReplanSchedule
- **Location**: `frontend/src/api/mutations/useAIScheduleMutations.ts`
- **Type**: TanStack Query mutation
- **Purpose**: Dynamic replanning when tasks run longer than expected
- **Params**: `ReplanRequest` (child_id, parent_id, current_task_id, actual_duration, estimated_duration, current_time?)
- **Returns**: `ReplannedSchedule` (changes, moved_tasks, reason)
- **Auto-invalidates**: `['dayTasks']`, `['tasks']`, `['aiRecommendation']`
- **Used in**: Parent portal tasks page (auto-triggered on completion)

#### Routine Hooks

##### useRoutines
- **Location**: `frontend/src/api/queries/useRoutines.ts`
- **Type**: TanStack Query query
- **Purpose**: Fetch all routines for a child
- **Params**: `childId: string, includeInactive?: boolean`
- **Returns**: `Routine[]`

##### useRoutine
- **Location**: `frontend/src/api/queries/useRoutines.ts`
- **Type**: TanStack Query query
- **Purpose**: Fetch single routine by ID
- **Params**: `routineId: string, enabled?: boolean`
- **Returns**: `Routine`

##### useRoutinePreview
- **Location**: `frontend/src/api/queries/useRoutines.ts`
- **Type**: TanStack Query query
- **Purpose**: Preview next occurrences of routine
- **Params**: `routineId: string, count: number`
- **Returns**: `{ dates: string[] }`

##### useCreateRoutine
- **Location**: `frontend/src/api/mutations/useRoutineMutations.ts`
- **Type**: TanStack Query mutation
- **Purpose**: Create new routine
- **Returns**: `Routine`
- **Auto-invalidates**: `['routines', child_id]`

##### useUpdateRoutine
- **Location**: `frontend/src/api/mutations/useRoutineMutations.ts`
- **Type**: TanStack Query mutation
- **Purpose**: Update existing routine
- **Auto-invalidates**: `['routines', child_id]`, `['routine', id]`

##### useDeleteRoutine
- **Location**: `frontend/src/api/mutations/useRoutineMutations.ts`
- **Type**: TanStack Query mutation
- **Purpose**: Delete routine
- **Auto-invalidates**: `['routines']`

##### useGenerateRoutineTask
- **Location**: `frontend/src/api/mutations/useRoutineMutations.ts`
- **Type**: TanStack Query mutation
- **Purpose**: Manually generate task from routine
- **Auto-invalidates**: `['tasks']`

##### useCancelRoutine
- **Location**: `frontend/src/api/mutations/useRoutineMutations.ts`
- **Type**: TanStack Query mutation
- **Purpose**: Cancel routine occurrence for specific date
- **Auto-invalidates**: `['tasks']`

#### Activity Hooks

##### useActivities
- **Location**: `frontend/src/api/queries/useActivities.ts`
- **Type**: TanStack Query query
- **Purpose**: Fetch all activities for a child
- **Params**: `childId: string, includeInactive?: boolean`
- **Returns**: `Activity[]`

##### useActivity
- **Location**: `frontend/src/api/queries/useActivities.ts`
- **Type**: TanStack Query query
- **Purpose**: Fetch single activity by ID
- **Params**: `activityId: string, enabled?: boolean`
- **Returns**: `Activity`

##### useAvailableActivities
- **Location**: `frontend/src/api/queries/useActivities.ts`
- **Type**: TanStack Query query
- **Purpose**: Get available activities for specific time
- **Params**: `childId: string, currentTime: string, currentDay: string`
- **Returns**: `Activity[]`

##### useCreateActivity
- **Location**: `frontend/src/api/mutations/useActivityMutations.ts`
- **Type**: TanStack Query mutation
- **Purpose**: Create new activity
- **Auto-invalidates**: `['activities', child_id]`

##### useUpdateActivity
- **Location**: `frontend/src/api/mutations/useActivityMutations.ts`
- **Type**: TanStack Query mutation
- **Purpose**: Update existing activity
- **Auto-invalidates**: `['activities', child_id]`, `['activity', id]`

##### useDeleteActivity
- **Location**: `frontend/src/api/mutations/useActivityMutations.ts`
- **Type**: TanStack Query mutation
- **Purpose**: Delete activity
- **Auto-invalidates**: `['activities']`

#### Time Block Hooks

##### useTimeBlocks
- **Location**: `frontend/src/api/queries/useTimeBlocks.ts`
- **Type**: TanStack Query query
- **Purpose**: Fetch all time blocks for a child
- **Params**: `childId: string, includeInactive?: boolean`
- **Returns**: `TimeBlock[]`

##### useTimeBlock
- **Location**: `frontend/src/api/queries/useTimeBlocks.ts`
- **Type**: TanStack Query query
- **Purpose**: Fetch single time block by ID
- **Params**: `timeBlockId: string, enabled?: boolean`
- **Returns**: `TimeBlock`

##### useActiveTimeBlocks
- **Location**: `frontend/src/api/queries/useTimeBlocks.ts`
- **Type**: TanStack Query query
- **Purpose**: Get active time blocks for specific date
- **Params**: `childId: string, date: string`
- **Returns**: `TimeBlock[]`

##### useCreateTimeBlock
- **Location**: `frontend/src/api/mutations/useTimeBlockMutations.ts`
- **Type**: TanStack Query mutation
- **Purpose**: Create new time block
- **Auto-invalidates**: `['timeBlocks', child_id]`

##### useUpdateTimeBlock
- **Location**: `frontend/src/api/mutations/useTimeBlockMutations.ts`
- **Type**: TanStack Query mutation
- **Purpose**: Update existing time block
- **Auto-invalidates**: `['timeBlocks', child_id]`, `['timeBlock', id]`

##### useDeleteTimeBlock
- **Location**: `frontend/src/api/mutations/useTimeBlockMutations.ts`
- **Type**: TanStack Query mutation
- **Purpose**: Delete time block
- **Auto-invalidates**: `['timeBlocks']`

#### Schedule Hooks

##### useDailySchedule
- **Location**: `frontend/src/api/queries/useSchedule.ts`
- **Type**: TanStack Query query
- **Purpose**: Get daily schedule for a child
- **Params**: `childId: string, date: string`
- **Returns**: `DailySchedule`

##### useScheduleConflicts
- **Location**: `frontend/src/api/queries/useSchedule.ts`
- **Type**: TanStack Query query
- **Purpose**: Detect schedule conflicts for a child
- **Params**: `childId: string, date: string`
- **Returns**: `ScheduleConflict[]`

#### Tool Hooks

##### useTools
- **Location**: `frontend/src/api/queries/useTools.ts`
- **Type**: TanStack Query query
- **Purpose**: Fetch all tools for a child
- **Params**: `childId: string, includeInactive?: boolean`
- **Returns**: `Tool[]`

##### useTool
- **Location**: `frontend/src/api/queries/useTools.ts`
- **Type**: TanStack Query query
- **Purpose**: Fetch single tool by ID
- **Params**: `toolId: string, enabled?: boolean`
- **Returns**: `Tool`

##### useCreateTool
- **Location**: `frontend/src/api/mutations/useToolMutations.ts`
- **Type**: TanStack Query mutation
- **Purpose**: Create new tool
- **Auto-invalidates**: `['tools', child_id]`

##### useUpdateTool
- **Location**: `frontend/src/api/mutations/useToolMutations.ts`
- **Type**: TanStack Query mutation
- **Purpose**: Update existing tool
- **Auto-invalidates**: `['tools', child_id]`, `['tool', id]`

##### useDeleteTool
- **Location**: `frontend/src/api/mutations/useToolMutations.ts`
- **Type**: TanStack Query mutation
- **Purpose**: Delete tool
- **Auto-invalidates**: `['tools']`

### Redux Hooks

#### useAppDispatch
- **Location**: `frontend/src/store/hooks.ts`
- **Purpose**: Typed dispatch hook
- **Usage**: `const dispatch = useAppDispatch()`

#### useAppSelector
- **Location**: `frontend/src/store/hooks.ts`
- **Purpose**: Typed selector hook
- **Usage**: `const user = useAppSelector((state) => state.auth.user)`

## Pages

### Authentication Pages

#### LoginPage
- **Location**: `frontend/src/pages/login/index.tsx`
- **Route**: `/login`
- **Features**: Email/password login, error handling, language switcher
- **Redirects**: Authenticated users to `/portal-selection`

#### RegisterPage
- **Location**: `frontend/src/pages/register/index.tsx`
- **Route**: `/register`
- **Features**: Parent registration, autocomplete prevention, language switcher
- **Redirects**: Authenticated users to `/portal-selection`

### Portal Selection Pages

#### PortalSelectionPage
- **Location**: `frontend/src/pages/portal-selection/index.tsx`
- **Route**: `/portal-selection` (protected)
- **Features**: Two large cards - Parent Portal or Child Portal choice
- **Navigation**:
  - Parent Portal → `/parent-portal`
  - Child Portal → `/child-selection`
- **Components**: Language switcher, logout button

#### ChildSelectionPage
- **Location**: `frontend/src/pages/child-selection/index.tsx`
- **Route**: `/child-selection` (protected)
- **Features**: Children select themselves to enter child portal
- **Navigation**:
  - Back → `/portal-selection`
  - Child selected → `/child-portal/:childId`
- **Components**: Large child avatar cards, PIN badges

### Parent Portal Pages

#### ParentPortalLayout
- **Location**: `frontend/src/pages/parent-portal/layout.tsx`
- **Route**: `/parent-portal` (protected, layout only)
- **Features**: Sidebar navigation, portal selection link, logout button
- **Navigation Items**:
  - Children (`/parent-portal`)
  - Tasks (`/parent-portal/tasks`)
  - Analytics (`/parent-portal/analytics`)
  - Settings (`/parent-portal/settings`)
- **Layout**: Sidebar (left) + Main content area (right with `<Outlet />`)

#### ManageChildrenPage
- **Location**: `frontend/src/pages/parent-portal/children/index.tsx`
- **Route**: `/parent-portal` (index route)
- **Features**: Grid of children, add child button
- **Components**: AddChildModal
- **Navigation**: Click child → `/parent-portal/children/:childId`

#### AddChildModal
- **Location**: `frontend/src/pages/parent-portal/children/components/AddChildModal.tsx`
- **Props**: `{ isOpen: boolean, onClose: () => void }`
- **Features**: Name, date of birth (date picker), optional PIN protection with conditional input
- **Validation**: Name required, date of birth (cannot be future), PIN 4-6 digits (if enabled)

#### ChildProfilePage
- **Location**: `frontend/src/pages/child-profile/index.tsx`
- **Route**: `/parent-portal/children/:childId` (protected)
- **Features**: Child profile display, navigation to tasks
- **Navigation**:
  - Back → `/parent-portal`
  - View Tasks → `/parent-portal/children/:childId/tasks`
- **Note**: No PIN verification (parent already authenticated)

#### TaskListPage
- **Location**: `frontend/src/pages/task-list/index.tsx`
- **Route**: `/parent-portal/children/:childId/tasks` (protected)
- **Features**: Task management for specific child
- **Components**: Task collections, task items, add task functionality

### Child Portal Pages

#### ChildPortalLayout
- **Location**: `frontend/src/pages/child-portal/layout.tsx`
- **Route**: `/child-portal/:childId` (protected, layout only)
- **Features**: Top bar with child's name, horizontal tab navigation, back button
- **Navigation Items**:
  - My Tasks (`/child-portal/:childId/tasks`)
  - Tools (`/child-portal/:childId/tools`)
  - Chat with AI (`/child-portal/:childId/chat`)
  - My Progress (`/child-portal/:childId/progress`)
- **Layout**: Top bar + Tab nav + Main content area (`<Outlet />`)
- **Style**: Gradient backgrounds (purple/pink/blue)

#### ChildPortalTasksPage
- **Location**: `frontend/src/pages/child-portal/tasks/index.tsx`
- **Route**: `/child-portal/:childId/tasks` (protected)
- **Features**: Kid-friendly task interface with large buttons, AI recommendations, points display
- **Components**: TaskCard, AIRecommendationButton, BreakTimer
- **Layout**: Gradient background, separated task sections (In Progress, Paused, To Do)
- **Filter**: Today / All Tasks tabs
- **Actions**: Start task (64px button), pause task, complete task, resume task

#### Child Portal Pages (Coming Soon)
- **Tools**: `/child-portal/:childId/tools`
- **Chat**: `/child-portal/:childId/chat`
- **Progress**: `/child-portal/:childId/progress`

### Shared Components

#### PinVerificationModal
- **Location**: `frontend/src/pages/child-profile/components/PinVerificationModal.tsx`
- **Props**: `{ isOpen: boolean, childName: string, onVerify: (pin: string) => Promise<boolean>, onClose: () => void }`
- **Features**: PIN entry (4-6 digits), verification with backend
- **Behavior**: Blocks access until PIN verified or user cancels
- **Context**: Will be used in child portal flow (not currently used in parent portal)

## Design Patterns

### Nested Routes with Layouts
- **Pattern**: Layout component with `<Outlet />` for nested routes
- **Used in**: Parent portal, child portal
- **Example**:
  ```typescript
  <Route path="/parent-portal" element={<ParentPortalLayout />}>
    <Route index element={<ManageChildrenPage />} />
    <Route path="children/:childId" element={<ChildProfilePage />} />
  </Route>
  ```

### Responsive Grid
- **Mobile**: 1 column
- **Tablet**: 2 columns
- **Desktop**: 3 columns
- **Used in**: Manage children page, child selection page

### Error Display
- **Pattern**: Local state for persistent error messages
- **Behavior**: Clears on user input
- **Used in**: Login, register pages

### Protected Routes
- **Component**: `ProtectedRoute` in `App.tsx`
- **Checks**: `isAuthenticated` from Redux
- **Redirects**: Unauthenticated to `/login`
- **Used in**: All portal routes, portal selection

### Portal-Specific UI Patterns

#### Parent Portal
- **Color Scheme**: White background, blue accents
- **Navigation**: Vertical sidebar (left)
- **Typography**: Professional, standard size
- **Spacing**: Clean, organized

#### Child Portal
- **Color Scheme**: Gradient backgrounds (purple/pink/blue)
- **Navigation**: Horizontal tabs (top)
- **Typography**: Larger, friendlier
- **Icons**: Larger, more colorful
- **Spacing**: More generous, playful

## Navigation Flows

### Login to Portal Selection
```
/login → (authenticate) → /portal-selection
```

### Portal Selection to Parent Portal
```
/portal-selection → /parent-portal → /parent-portal/children/:childId → /parent-portal/children/:childId/tasks
```

### Portal Selection to Child Portal
```
/portal-selection → /child-selection → /child-portal/:childId → /child-portal/:childId/tasks
```

### Back to Portal Selection
```
Parent Portal: Click "Portal Selection" in sidebar footer → /portal-selection
Child Portal: Click back → /child-selection → Click back → /portal-selection
```

## State Management Patterns

### Redux (Client State)
- **Authentication**: `authSlice` stores user, token, isAuthenticated
- **Usage**: Check auth status, store auth data
- **Used in**: ProtectedRoute, logout functions

### TanStack Query (Server State)
- **Queries**: Fetch data (children, tasks, user)
- **Mutations**: Create/update/delete operations
- **Cache invalidation**: Auto-invalidate related queries after mutations
- **Usage**: All API interactions

### Local Component State
- **Form data**: useState for form inputs
- **UI state**: Modal open/close, loading states
- **Temporary state**: Error messages, validation

## Utility Functions

### calculateAge
- **Location**: `frontend/src/types/child.ts`
- **Purpose**: Calculate age from date_of_birth string
- **Params**: `dateOfBirth: string` (ISO format)
- **Returns**: `number` (age in years)
- **Usage**: Display child age in UI
