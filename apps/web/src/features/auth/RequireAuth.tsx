import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useMe } from './api/useMe';
import { useAuthStore } from './store';

/**
 * Protected route guard. Renders children only when a token AND a successful
 * /me query confirm the session. While verifying, shows a thin loading state.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const hasToken = useAuthStore((s) => !!s.accessToken);
  const me = useMe();
  const location = useLocation();

  if (!hasToken) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (me.isLoading) {
    return <div className="p-6 text-sm text-slate-500">…</div>;
  }
  if (me.isError) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}
