import { useMutation, useQuery } from '@tanstack/react-query';
import type {
  ChildLoginRequest,
  ChildLoginResponse,
  DeviceLookupResponse,
  LoginRequest,
} from '@kidsprogress/shared';
import { authApi } from './api';
import { useAuthStore } from './store';

const queryKeys = {
  deviceLookup: (token: string) => ['deviceLookup', token] as const,
};

/**
 * Public roster lookup. Disabled when no device token is set — frontend
 * code branches to the device-registration screen in that case.
 */
export function useDeviceLookup(deviceToken: string | null) {
  return useQuery<DeviceLookupResponse>({
    queryKey: queryKeys.deviceLookup(deviceToken ?? ''),
    queryFn: () => authApi.deviceLookup({ deviceToken: deviceToken! }),
    enabled: deviceToken !== null && deviceToken.length >= 16,
    // Roster changes only when parent edits — but if the device is revoked
    // we want to know quickly. Refetch on focus only.
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useChildLogin() {
  const setChildAccess = useAuthStore((s) => s.setChildAccess);
  const setCurrentChild = useAuthStore((s) => s.setCurrentChild);
  return useMutation<ChildLoginResponse, Error, ChildLoginRequest>({
    mutationFn: (req) => authApi.childLogin(req),
    onSuccess: (res) => {
      setChildAccess(res.tokens.accessToken, res.tokens.expiresAt);
      setCurrentChild({
        id: res.child.id,
        familyId: res.child.familyId,
        displayName: res.child.displayName,
        avatarKey: res.child.avatarKey,
        ageBand: res.child.ageBand,
      });
    },
  });
}

export function useParentLogin() {
  const setParentAccess = useAuthStore((s) => s.setParentAccess);
  return useMutation({
    mutationFn: (req: LoginRequest) => authApi.parentLogin(req),
    onSuccess: (res) => {
      setParentAccess(res.tokens.accessToken, res.tokens.expiresAt);
    },
  });
}
