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
