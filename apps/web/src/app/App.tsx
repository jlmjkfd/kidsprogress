import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { SelectionPage } from '@/features/auth/pages/SelectionPage';
import { SetupDevicePage } from '@/features/auth/pages/SetupDevicePage';
import { ParentLoginPage } from '@/features/auth/pages/ParentLoginPage';
import { TemplatesListPage } from '@/features/templates/pages/TemplatesListPage';
import { NewTemplatePage } from '@/features/templates/pages/NewTemplatePage';
import { AssignTemplatePage } from '@/features/assignments/pages/AssignTemplatePage';
import { TodayPage } from '@/features/today/pages/TodayPage';
import { ParentHomePlaceholder } from './pages/ParentHomePlaceholder';

/**
 * Phase 1 router. Real parent / child home screens land in Phase 3 / 9.
 * Today (`/today`) and parent home (`/parent`) currently show a confirmation
 * page so the e2e auth flow can be exercised end-to-end.
 */
export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SelectionPage />} />
        <Route path="/setup-device" element={<SetupDevicePage />} />
        <Route path="/parent-login" element={<ParentLoginPage />} />
        <Route path="/today" element={<TodayPage />} />
        <Route path="/parent" element={<ParentHomePlaceholder />} />
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
