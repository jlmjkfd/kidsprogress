import { apiClient } from '@/lib/apiClient';
import type {
  ChildLoginRequest,
  ChildLoginResponse,
  DeviceLookupRequest,
  DeviceLookupResponse,
  LoginRequest,
  LoginResponse,
  ParentMe,
  RegisterRequest,
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

  /** Parent registration. Same response shape as login. */
  parentRegister: (req: RegisterRequest) =>
    apiClient.post<LoginResponse>('/api/auth/register', req),

  parentMe: () => apiClient.get<ParentMe>('/api/auth/me'),

  parentLogout: () => apiClient.post<void>('/api/auth/logout'),

  parentRefresh: () => apiClient.post<AuthTokens>('/api/auth/refresh'),

  /**
   * View-as-child: parent uses their portal PIN to mint a `child-readonly`
   * JWT for the named child. Returns the same shape as child login so the
   * UI can pivot straight into the Today view.
   */
  viewAsChild: (childId: string, parentPin: string) =>
    apiClient.post<ChildLoginResponse>('/api/auth/me/view-as-child', {
      childId,
      parentPin,
    }),

  setParentPortalPin: (pin: string) =>
    apiClient.post<void>('/api/auth/me/parent-pin', { pin }),

  verifyParentPortalPin: (pin: string) =>
    apiClient.post<void>('/api/auth/me/parent-pin/verify', { pin }),
};
