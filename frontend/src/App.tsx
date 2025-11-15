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
import ChildRoutinesPage from "@/pages/parent-portal/children/[id]/routines";
import ChildAnalysisPage from "@/pages/parent-portal/children/[id]/analysis";
import ParentPortalSettings from "@/pages/parent-portal/settings";

// Child Portal
import ChildPortalLayout from "@/pages/child-portal/layout";

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
        {/* Default: Manage Children List */}
        <Route index element={<ManageChildrenPage />} />

        {/* Child Management - Nested routes with tabs */}
        <Route path="children/:childId" element={<ChildManagementLayout />}>
          <Route index element={<ChildBasicInfoPage />} />
          <Route path="tasks" element={<ChildTasksPage />} />
          <Route path="routines" element={<ChildRoutinesPage />} />
          <Route path="analysis" element={<ChildAnalysisPage />} />
        </Route>

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
          element={<div className="p-8">Child Tasks View - Coming Soon</div>}
        />

        {/* Tools */}
        <Route
          path="tools"
          element={<div className="p-8">Learning Tools - Coming Soon</div>}
        />

        {/* AI Chat */}
        <Route
          path="chat"
          element={<div className="p-8">Chat with AI - Coming Soon</div>}
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
