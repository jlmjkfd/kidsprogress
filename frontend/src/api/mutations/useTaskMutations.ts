/**
 * TanStack Query mutation hooks for tasks (CRUD and lifecycle operations)
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client";
import {
  Task,
  TaskCreate,
  TaskUpdate,
  StartTaskResponse,
} from "@/types/task";

// ==================== CRUD Operations ====================

export const useCreateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: TaskCreate) => {
      const response = await apiClient.post<Task>("/api/tasks", data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", "collection", data.collection_id] });
      queryClient.invalidateQueries({ queryKey: ["tasks", "child", data.child_id] });
    },
  });
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, data }: { taskId: string; data: TaskUpdate }) => {
      const response = await apiClient.put<Task>(`/api/tasks/${taskId}`, data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["task", data._id] });
      queryClient.invalidateQueries({ queryKey: ["tasks", "collection", data.collection_id] });
      queryClient.invalidateQueries({ queryKey: ["tasks", "child", data.child_id] });
    },
  });
};

export const useDeleteTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      await apiClient.delete(`/api/tasks/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
};

// ==================== Lifecycle Operations ====================

export const useActivateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const response = await apiClient.post<Task>(`/api/tasks/${taskId}/activate`);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["task", data._id] });
      queryClient.invalidateQueries({ queryKey: ["tasks", "collection", data.collection_id] });
      queryClient.invalidateQueries({ queryKey: ["tasks", "child", data.child_id] });
    },
  });
};

export const useStartTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, childId }: { taskId: string; childId: string }) => {
      const response = await apiClient.post<StartTaskResponse>(
        `/api/tasks/${taskId}/start`,
        null,
        { params: { child_id: childId } }
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["task", data.task._id] });
      queryClient.invalidateQueries({ queryKey: ["tasks", "collection", data.task.collection_id] });
      queryClient.invalidateQueries({ queryKey: ["tasks", "child", data.task.child_id] });
      queryClient.invalidateQueries({ queryKey: ["activeTasks", data.task.child_id] });
    },
  });
};

export const usePauseTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      pausedBy,
      reason,
    }: {
      taskId: string;
      pausedBy: "PARENT" | "CHILD";
      reason?: string;
    }) => {
      const response = await apiClient.post<Task>(
        `/api/tasks/${taskId}/pause`,
        null,
        { params: { paused_by: pausedBy, reason } }
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["task", data._id] });
      queryClient.invalidateQueries({ queryKey: ["tasks", "collection", data.collection_id] });
      queryClient.invalidateQueries({ queryKey: ["tasks", "child", data.child_id] });
      queryClient.invalidateQueries({ queryKey: ["activeTasks", data.child_id] });
    },
  });
};

export const useResumeTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const response = await apiClient.post<Task>(`/api/tasks/${taskId}/resume`);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["task", data._id] });
      queryClient.invalidateQueries({ queryKey: ["tasks", "collection", data.collection_id] });
      queryClient.invalidateQueries({ queryKey: ["tasks", "child", data.child_id] });
      queryClient.invalidateQueries({ queryKey: ["activeTasks", data.child_id] });
    },
  });
};

export const useCompleteTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, childId }: { taskId: string; childId: string }) => {
      const response = await apiClient.post<Task>(
        `/api/tasks/${taskId}/complete`,
        null,
        { params: { child_id: childId } }
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["task", data._id] });
      queryClient.invalidateQueries({ queryKey: ["tasks", "collection", data.collection_id] });
      queryClient.invalidateQueries({ queryKey: ["tasks", "child", data.child_id] });
      queryClient.invalidateQueries({ queryKey: ["activeTasks", data.child_id] });
    },
  });
};

export const useCancelTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const response = await apiClient.post<Task>(`/api/tasks/${taskId}/cancel`);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["task", data._id] });
      queryClient.invalidateQueries({ queryKey: ["tasks", "collection", data.collection_id] });
      queryClient.invalidateQueries({ queryKey: ["tasks", "child", data.child_id] });
      queryClient.invalidateQueries({ queryKey: ["activeTasks", data.child_id] });
    },
  });
};

export const useAddRecurrenceException = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      exceptionDate,
      exceptionType,
      overrides,
    }: {
      taskId: string;
      exceptionDate: string; // YYYY-MM-DD
      exceptionType: "deleted" | "modified";
      overrides?: Record<string, any>;
    }) => {
      const response = await apiClient.post<Task>(
        `/api/tasks/${taskId}/exceptions`,
        overrides || {},
        {
          params: {
            exception_date: exceptionDate,
            exception_type: exceptionType,
          },
        }
      );
      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate all tasks queries to refresh virtual instances
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task", data._id] });
    },
  });
};
