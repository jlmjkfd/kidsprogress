import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CompleteTaskRequest,
  CreateTaskRequest,
  SkipTaskRequest,
  Task,
  TaskInstance,
  TaskListResponse,
  UpdateTaskRequest,
} from '@kidsprogress/shared';
import { apiClient } from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { useAuthStore } from '@/features/auth/store';

export function useTasksForChild(childId: string | undefined) {
  const hasToken = useAuthStore((s) => !!s.accessToken);
  return useQuery({
    queryKey: queryKeys.tasks.listByChild(childId ?? '_'),
    queryFn: async () => {
      const data = await apiClient.get<TaskListResponse>(
        `/api/tasks?childId=${childId}`,
      );
      return data.tasks;
    },
    enabled: hasToken && !!childId,
  });
}

export function useTaskInstances(childId: string | undefined, fromDate: string, toDate: string) {
  const hasToken = useAuthStore((s) => !!s.accessToken);
  return useQuery({
    queryKey: queryKeys.tasks.instances(childId ?? '_', fromDate, toDate),
    queryFn: async () => {
      const res = await apiClient.get<{ instances: TaskInstance[] }>(
        `/api/tasks/instances?childId=${childId}&fromDate=${fromDate}&toDate=${toDate}`,
      );
      return res.instances;
    },
    enabled: hasToken && !!childId,
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateTaskRequest) => apiClient.post<Task>('/api/tasks', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.tasks.all() }),
  });
}

export function useUpdateTask(taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateTaskRequest) => apiClient.patch<Task>(`/api/tasks/${taskId}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.tasks.all() }),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => apiClient.delete<null>(`/api/tasks/${taskId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.tasks.all() }),
  });
}

export function useStartTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => apiClient.post<Task>(`/api/tasks/${taskId}/start`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.tasks.all() }),
  });
}

export function useCompleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, body }: { taskId: string; body: CompleteTaskRequest }) =>
      apiClient.post<{ task: Task; completionId: string }>(`/api/tasks/${taskId}/complete`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.tasks.all() });
      qc.invalidateQueries({ queryKey: queryKeys.completions.list() });
    },
  });
}

export function useSkipTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, body }: { taskId: string; body: SkipTaskRequest }) =>
      apiClient.post<Task>(`/api/tasks/${taskId}/skip`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.tasks.all() }),
  });
}
