/**
 * TanStack Query hooks for tasks
 */
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../client";
import { Task, TaskStatus, ConcurrentTaskWarning } from "@/types/task";

export const useTasksByCollection = (collectionId: string, status?: TaskStatus) => {
  return useQuery({
    queryKey: ["tasks", "collection", collectionId, status],
    queryFn: async () => {
      const response = await apiClient.get<Task[]>(
        `/api/tasks/collection/${collectionId}`,
        { params: status ? { status } : {} }
      );
      return response.data;
    },
    enabled: !!collectionId,
  });
};

export const useTasksByChild = (childId: string, status?: TaskStatus) => {
  return useQuery({
    queryKey: ["tasks", "child", childId, status],
    queryFn: async () => {
      const response = await apiClient.get<Task[]>(
        `/api/tasks/child/${childId}`,
        { params: status ? { status } : {} }
      );
      return response.data;
    },
    enabled: !!childId,
  });
};

export const useTask = (taskId: string) => {
  return useQuery({
    queryKey: ["task", taskId],
    queryFn: async () => {
      const response = await apiClient.get<Task>(`/api/tasks/${taskId}`);
      return response.data;
    },
    enabled: !!taskId,
  });
};

export const useActiveTasks = (childId: string) => {
  return useQuery({
    queryKey: ["activeTasks", childId],
    queryFn: async () => {
      const response = await apiClient.get<ConcurrentTaskWarning[]>(
        `/api/tasks/child/${childId}/active`
      );
      return response.data;
    },
    enabled: !!childId,
  });
};

export const useOverdueTasks = (childId: string, mustDoOnly: boolean = false) => {
  return useQuery({
    queryKey: ["tasks", "child", childId, "overdue", mustDoOnly],
    queryFn: async () => {
      const response = await apiClient.get<import("@/types/task").OverdueTasksResponse>(
        `/api/tasks/child/${childId}/overdue`,
        { params: { must_do_only: mustDoOnly } }
      );
      return response.data;
    },
    enabled: !!childId,
  });
};

export const useOverdueStats = (childId: string) => {
  return useQuery({
    queryKey: ["tasks", "child", childId, "overdue", "stats"],
    queryFn: async () => {
      const response = await apiClient.get<{
        total_overdue: number;
        must_do_overdue: number;
        by_date: Record<string, number>;
      }>(`/api/tasks/child/${childId}/overdue/stats`);
      return response.data;
    },
    enabled: !!childId,
  });
};
