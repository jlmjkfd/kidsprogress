import { apiClient } from '@/lib/apiClient';
import type { Child, ChildrenListResponse } from '@kidsprogress/shared';

export const childrenApi = {
  list: () => apiClient.get<ChildrenListResponse>('/api/children'),
  get: (id: string) => apiClient.get<Child>(`/api/children/${id}`),
};
