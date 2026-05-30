import { apiClient } from '@/lib/apiClient';
import type {
  ChildLoginRequest,
  ChildLoginResponse,
  DeviceLookupRequest,
  DeviceLookupResponse,
  LoginRequest,
  LoginResponse,
  ParentMe,
  AuthTokens,
} from '@kidsprogress/shared';

export const authApi = {
  /** Public: hit /api/devices/lookup to render the kid-portal roster. */
  deviceLookup: (req: DeviceLookupRequest) =>
    apiClient.post<DeviceLookupResponse>('/api/devices/lookup', req),

  /** Public: device-bound child login. Refresh cookie is set server-side. */
  childLogin: (req: ChildLoginRequest) =>
    apiClient.post<ChildLoginResponse>('/api/devices/child-login', req),

  /** Parent login. Returns access token in body; refresh as HttpOnly cookie. */
  parentLogin: (req: LoginRequest) =>
    apiClient.post<LoginResponse>('/api/auth/login', req),

  parentMe: () => apiClient.get<ParentMe>('/api/auth/me'),

  parentLogout: () => apiClient.post<void>('/api/auth/logout'),

  parentRefresh: () => apiClient.post<AuthTokens>('/api/auth/refresh'),
};
