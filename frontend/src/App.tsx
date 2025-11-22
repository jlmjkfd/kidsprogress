/**
 * Main App component with new portal-based routing structure
 *
 * Flow:
 * 1. Parent Login → Portal Selection
 * 2. Parent Portal → Manage children, tasks, settings
 * 3. Child Selection → Child Portal → Do tasks, use tools, chat
 */
import {
  Routes,
  Route,
  BrowserRouter as Router,
  Navigate,
} from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Provider } from "react-redux";
import store from "@/store";
import { queryClient } from "@/api/queryClient";
import { useAppSelector } from "@/store/hooks";
import { ChildPortalRoute } from "@/components/ChildPortalRoute";

// Auth pages
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";

// Portal selection
import PortalSelectionPage from "@/pages/portal-selection";
import ChildSelectionPage from "@/pages/child-selection";

// Parent Portal
import ParentPortalLayout from "@/pages/parent-portal/layout";
import ManageChildrenPage from "@/pages/parent-portal/children";
import ChildManagementLayout from "@/pages/parent-portal/children/[id]/layout";
import ChildBasicInfoPage from "@/pages/parent-portal/children/[id]/index";
import ChildTasksPage from "@/pages/parent-portal/children/[id]/tasks";
// Removed obsolete imports - now using unified task model in tasks page
// import ChildRoutinesPage from "@/pages/parent-portal/children/[id]/routines";
// import ChildActivitiesPage from "@/pages/parent-portal/children/[id]/activities";
// import ChildTimeBlocksPage from "@/pages/parent-portal/children/[id]/time-blocks";
import ChildAnalysisPage from "@/pages/parent-portal/children/[id]/analysis";
import ParentPortalSettings from "@/pages/parent-portal/settings";
import ParentDashboardPage from "@/pages/parent-portal/dashboard";
import TemplatesPage from "@/pages/parent-portal/templates";
import TemplateLibraryPage from "@/pages/parent-portal/templates/library";
import AnalysisReportPage from "@/pages/parent-portal/analysis/[templateId]";

// Child Portal
import ChildPortalLayout from "@/pages/child-portal/layout";
import ChildPortalTasksPage from "@/pages/child-portal/tasks";
import TaskExecutePage from "@/pages/child-portal/tasks/execute/[taskId]";
import TaskResultPage from "@/pages/child-portal/tasks/result/[taskId]";
import ChildChatPage from "@/pages/child-portal/chat";

import "@/i18n/config";
import "./App.css";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={
          isAuthenticated ? <Navigate to="/portal-selection" replace /> : <LoginPage />
        }
      />
      <Route
        path="/register"
        element={
          isAuthenticated ? (
            <Navigate to="/portal-selection" replace />
          ) : (
            <RegisterPage />
          )
        }
      />

      {/* Portal Selection - Landing after login */}
      <Route
        path="/portal-selection"
        element={
          <ProtectedRoute>
            <PortalSelectionPage />
          </ProtectedRoute>
        }
      />

      {/* Child Selection - For children to pick themselves */}
      <Route
        path="/child-selection"
        element={
          <ChildPortalRoute>
            <ChildSelectionPage />
          </ChildPortalRoute>
        }
      />

      {/* Parent Portal - For parents to manage everything */}
      <Route
        path="/parent-portal"
        element={
          <ProtectedRoute>
            <ParentPortalLayout />
          </ProtectedRoute>
        }
      >
        {/* Default: Dashboard */}
        <Route index element={<ParentDashboardPage />} />

        {/* Children List */}
        <Route path="children" element={<ManageChildrenPage />} />

        {/* Child Management - Nested routes with tabs */}
        <Route path="children/:childId" element={<ChildManagementLayout />}>
          <Route index element={<ChildBasicInfoPage />} />
          <Route path="tasks" element={<ChildTasksPage />} />
          {/* Removed obsolete routes - now using unified task model */}
          {/* <Route path="routines" element={<ChildRoutinesPage />} /> */}
          {/* <Route path="activities" element={<ChildActivitiesPage />} /> */}
          {/* <Route path="time-blocks" element={<ChildTimeBlocksPage />} /> */}
          <Route path="analysis" element={<ChildAnalysisPage />} />
          <Route path="analysis/:templateId" element={<AnalysisReportPage />} />
        </Route>

        {/* Templates */}
        <Route path="templates" element={<TemplatesPage />} />
        <Route path="templates/library" element={<TemplateLibraryPage />} />

        {/* Settings */}
        <Route path="settings" element={<ParentPortalSettings />} />
      </Route>

      {/* Child Portal - For children to use */}
      <Route
        path="/child-portal/:childId"
        element={
          <ChildPortalRoute>
            <ChildPortalLayout />
          </ChildPortalRoute>
        }
      >
        {/* Default: redirect to tasks */}
        <Route
          index
          element={<Navigate to="tasks" replace />}
        />

        {/* Child's Tasks */}
        <Route
          path="tasks"
          element={<ChildPortalTasksPage />}
        />

        {/* Task Execution */}
        <Route
          path="tasks/execute/:taskId"
          element={<TaskExecutePage />}
        />

        {/* Task Result */}
        <Route
          path="tasks/result/:taskId"
          element={<TaskResultPage />}
        />

        {/* Tools */}
        <Route
          path="tools"
          element={<div className="p-8">Learning Tools - Coming Soon</div>}
        />

        {/* AI Chat */}
        <Route
          path="chat"
          element={<ChildChatPage />}
        />

        {/* Progress */}
        <Route
          path="progress"
          element={<div className="p-8">My Progress - Coming Soon</div>}
        />
      </Route>

      {/* Root redirect */}
      <Route
        path="/"
        element={
          <Navigate to={isAuthenticated ? "/portal-selection" : "/login"} replace />
        }
      />

      {/* Catch all - redirect to root */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <Router>
          <AppRoutes />
        </Router>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </Provider>
  );
}

export default App;
