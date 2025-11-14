/**
 * Protected route for Child Portal
 * Allows access via:
 * 1. Parent authentication (from child selection)
 * 2. Device token (trusted device without parent login)
 */
import { Navigate } from "react-router-dom";
import { useAppSelector } from "@/store/hooks";
import { getDeviceToken } from "@/utils/deviceToken";

interface ChildPortalRouteProps {
  children: React.ReactNode;
}

export function ChildPortalRoute({ children }: ChildPortalRouteProps) {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const deviceToken = getDeviceToken();

  // Allow access if either:
  // 1. Parent is authenticated (normal flow)
  // 2. Device has a valid device token (trusted device)
  if (!isAuthenticated && !deviceToken) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
