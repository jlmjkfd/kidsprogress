import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  Child,
  CreateChildRequest,
  IssueChildPinResetResponse,
  UpdateChildRequest,
} from '@kidsprogress/shared';
import { apiClient } from '@/lib/apiClient';
import { childrenApi } from './api';

export const childrenKeys = {
  all: ['children'] as const,
  list: () => [...childrenKeys.all, 'list'] as const,
  detail: (id: string) => [...childrenKeys.all, 'detail', id] as const,
};

export function useChildrenList() {
  return useQuery({
    queryKey: childrenKeys.list(),
    queryFn: () => childrenApi.list().then((r) => r.children),
  });
}

export function useChild(id: string | null) {
  return useQuery({
    queryKey: childrenKeys.detail(id ?? ''),
    queryFn: () => childrenApi.get(id!),
    enabled: id !== null,
  });
}

export function useCreateChild() {
  const qc = useQueryClient();
  return useMutation<Child, Error, CreateChildRequest>({
    mutationFn: (req) => apiClient.post<Child>('/api/children', req),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: childrenKeys.list() });
    },
  });
}

export function useUpdateChild(id: string) {
  const qc = useQueryClient();
  return useMutation<Child, Error, UpdateChildRequest>({
    mutationFn: (patch) => apiClient.patch<Child>(`/api/children/${id}`, patch),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: childrenKeys.list() });
      void qc.invalidateQueries({ queryKey: childrenKeys.detail(id) });
    },
  });
}

export function useArchiveChild() {
  const qc = useQueryClient();
  return useMutation<Child, Error, string>({
    mutationFn: (id) => apiClient.post<Child>(`/api/children/${id}/archive`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: childrenKeys.list() });
    },
  });
}

export function useRestoreChild() {
  const qc = useQueryClient();
  return useMutation<Child, Error, string>({
    mutationFn: (id) => apiClient.post<Child>(`/api/children/${id}/restore`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: childrenKeys.list() });
    },
  });
}

export function useSetChildPin() {
  const qc = useQueryClient();
  return useMutation<Child, Error, { id: string; pin: string }>({
    mutationFn: ({ id, pin }) => apiClient.post<Child>(`/api/children/${id}/pin`, { pin }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: childrenKeys.list() });
    },
  });
}

export function useClearChildPin() {
  const qc = useQueryClient();
  return useMutation<Child, Error, string>({
    mutationFn: (id) => apiClient.delete<Child>(`/api/children/${id}/pin`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: childrenKeys.list() });
    },
  });
}

export function useIssuePinReset() {
  return useMutation<IssueChildPinResetResponse, Error, string>({
    mutationFn: (id) =>
      apiClient.post<IssueChildPinResetResponse>(`/api/children/${id}/pin/issue-reset`),
  });
}
