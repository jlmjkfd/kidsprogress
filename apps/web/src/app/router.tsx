import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { RegisterPage } from '@/features/auth/pages/RegisterPage';
import { RequireAuth } from '@/features/auth/RequireAuth';
import { ChildrenPage } from '@/features/children/pages/ChildrenPage';
import { TasksPage } from '@/features/tasks/pages/TasksPage';
import { ParentLayout } from './layouts/ParentLayout';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <ParentLayout>
                <ChildrenPage />
              </ParentLayout>
            </RequireAuth>
          }
        />
        <Route
          path="/tasks"
          element={
            <RequireAuth>
              <ParentLayout>
                <TasksPage />
              </ParentLayout>
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
