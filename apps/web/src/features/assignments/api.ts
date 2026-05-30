import { apiClient } from '@/lib/apiClient';
import type {
  CreateTaskAssignmentRequest,
  TaskAssignment,
} from '@kidsprogress/shared';

interface AssignmentsListResponse {
  assignments: TaskAssignment[];
}

export const assignmentsApi = {
  list: (childId?: string) =>
    apiClient.get<AssignmentsListResponse>(
      childId ? `/api/assignments?childId=${childId}` : '/api/assignments',
    ),
  create: (req: CreateTaskAssignmentRequest) =>
    apiClient.post<TaskAssignment>('/api/assignments', req),
  delete: (id: string) => apiClient.delete(`/api/assignments/${id}`),
};
