import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  Child,
  ChildListResponse,
  CreateChildRequest,
  UpdateChildRequest,
} from '@kidsprogress/shared';
import { apiClient } from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { useAuthStore } from '@/features/auth/store';

export function useChildren() {
  const hasToken = useAuthStore((s) => !!s.accessToken);
  return useQuery({
    queryKey: queryKeys.children.list(),
    queryFn: async () => {
      const data = await apiClient.get<ChildListResponse>('/api/children');
      return data.children;
    },
    enabled: hasToken,
  });
}

export function useCreateChild() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateChildRequest) => apiClient.post<Child>('/api/children', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.children.list() }),
  });
}

export function useUpdateChild(childId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateChildRequest) =>
      apiClient.patch<Child>(`/api/children/${childId}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.children.all() }),
  });
}

export function useDeleteChild() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (childId: string) => apiClient.delete<null>(`/api/children/${childId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.children.list() }),
  });
}
