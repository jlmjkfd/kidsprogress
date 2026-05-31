import { useQuery } from '@tanstack/react-query';
import type { ParentMe } from '@kidsprogress/shared';
import { authApi } from './api';

/**
 * Tiny shared hook for the signed-in parent's "me" record. Used by the
 * PIN-gate flow + settings page. Cached for 5 minutes — the PIN-set flag
 * doesn't change often enough to need fresher data.
 */
export function useParentMe() {
  return useQuery<ParentMe>({
    queryKey: ['parent', 'me'],
    queryFn: () => authApi.parentMe(),
    staleTime: 5 * 60 * 1000,
  });
}
