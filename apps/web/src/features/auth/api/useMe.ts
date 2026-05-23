import { useQuery } from '@tanstack/react-query';
import type { MeResponse } from '@kidsprogress/shared';
import { apiClient } from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { useAuthStore } from '../store';

export function useMe() {
  const hasToken = useAuthStore((s) => !!s.accessToken);
  return useQuery({
    queryKey: queryKeys.me(),
    queryFn: () => apiClient.get<MeResponse>('/api/auth/me'),
    enabled: hasToken,
    staleTime: 60_000,
    retry: false,
  });
}
