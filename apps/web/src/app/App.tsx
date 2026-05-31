import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { SelectionPage } from '@/features/auth/pages/SelectionPage';
import { SetupDevicePage } from '@/features/auth/pages/SetupDevicePage';
import { ParentLoginPage } from '@/features/auth/pages/ParentLoginPage';
import { ParentSignUpPage } from '@/features/auth/pages/ParentSignUpPage';
import { ParentSettingsPage } from '@/features/auth/pages/ParentSettingsPage';
import { AssignmentsListPage } from '@/features/assignments/pages/AssignmentsListPage';
import { TemplatesListPage } from '@/features/templates/pages/TemplatesListPage';
import { NewTemplatePage } from '@/features/templates/pages/NewTemplatePage';
import { AssignTemplatePage } from '@/features/assignments/pages/AssignTemplatePage';
import { DevicesListPage } from '@/features/devices/pages/DevicesListPage';
import { ChildrenListPage } from '@/features/children/pages/ChildrenListPage';
import { TodayPage } from '@/features/today/pages/TodayPage';
import { ExecutionPage } from '@/features/today/pages/ExecutionPage';
import { ParentHomePlaceholder } from './pages/ParentHomePlaceholder';
import { WelcomePage } from './pages/WelcomePage';

/**
 * Phase 1 router. Real parent / child home screens land in Phase 3 / 9.
 * Today (`/today`) and parent home (`/parent`) currently show a confirmation
 * page so the e2e auth flow can be exercised end-to-end.
 */
export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/kids" element={<SelectionPage />} />
        <Route path="/setup-device" element={<SetupDevicePage />} />
        <Route path="/parent-login" element={<ParentLoginPage />} />
        <Route path="/parent-signup" element={<ParentSignUpPage />} />
        <Route path="/parent/settings" element={<ParentSettingsPage />} />
        <Route path="/parent/assignments" element={<AssignmentsListPage />} />
        <Route path="/today/execute/:instanceId" element={<ExecutionPage />} />
        <Route path="/today" element={<TodayPage />} />
        <Route path="/parent" element={<ParentHomePlaceholder />} />
        <Route path="/parent/children" element={<ChildrenListPage />} />
        <Route path="/parent/devices" element={<DevicesListPage />} />
        <Route path="/parent/templates" element={<TemplatesListPage />} />
        <Route
          path="/parent/templates/:templateId/assign"
          element={<AssignTemplatePage />}
        />
        <Route path="/parent/templates/new" element={<NewTemplatePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
