import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateTaskAssignmentRequest,
  TaskAssignment,
} from '@kidsprogress/shared';
import { assignmentsApi } from './api';

export const assignmentKeys = {
  all: ['assignments'] as const,
  list: (childId: string | null) => [...assignmentKeys.all, 'list', childId] as const,
};

export function useAssignments(childId: string | null = null) {
  return useQuery<TaskAssignment[]>({
    queryKey: assignmentKeys.list(childId),
    queryFn: () =>
      assignmentsApi.list(childId ?? undefined).then((r) => r.assignments),
  });
}

export function useCreateAssignment() {
  const qc = useQueryClient();
  return useMutation<TaskAssignment, Error, CreateTaskAssignmentRequest>({
    mutationFn: (req) => assignmentsApi.create(req),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: assignmentKeys.all });
    },
  });
}

export function useDeleteAssignment() {
  const qc = useQueryClient();
  return useMutation<unknown, Error, string>({
    mutationFn: (id) => assignmentsApi.delete(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: assignmentKeys.all });
    },
  });
}
