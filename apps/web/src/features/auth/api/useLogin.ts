import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { LoginRequest, LoginResponse, RegisterRequest } from '@kidsprogress/shared';
import { apiClient } from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { useAuthStore } from '../store';

export function useLogin() {
  const qc = useQueryClient();
  const setToken = useAuthStore((s) => s.setToken);
  return useMutation({
    mutationFn: (body: LoginRequest) =>
      apiClient.post<LoginResponse>('/api/auth/login', body, { anonymous: true }),
    onSuccess: (data) => {
      setToken(data.tokens.accessToken, data.tokens.expiresAt);
      qc.setQueryData(queryKeys.me(), data.user);
    },
  });
}

export function useRegister() {
  const qc = useQueryClient();
  const setToken = useAuthStore((s) => s.setToken);
  return useMutation({
    mutationFn: (body: RegisterRequest) =>
      apiClient.post<LoginResponse>('/api/auth/register', body, { anonymous: true }),
    onSuccess: (data) => {
      setToken(data.tokens.accessToken, data.tokens.expiresAt);
      qc.setQueryData(queryKeys.me(), data.user);
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  const clear = useAuthStore((s) => s.clear);
  return useMutation({
    mutationFn: () => apiClient.post<null>('/api/auth/logout', undefined, { anonymous: true }),
    onSettled: () => {
      clear();
      qc.clear();
    },
  });
}
