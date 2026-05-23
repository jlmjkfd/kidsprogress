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
  ChildTaskCreate,
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

export const useCreateTaskAsChild = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ childId, data }: { childId: string; data: ChildTaskCreate }) => {
      const response = await apiClient.post<Task>(
        `/api/tasks/child/${childId}/create`,
        data
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", "collection", data.collection_id] });
      queryClient.invalidateQueries({ queryKey: ["tasks", "child", data.child_id] });
      queryClient.invalidateQueries({ queryKey: ["tasks", "child", data.child_id, "overdue"] });
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
      return taskId;
    },
    onSuccess: (taskId) => {
      // Invalidate all task-related queries to ensure UI updates
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task", taskId] });
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
      queryClient.invalidateQueries({ queryKey: ["tasks", "child", data.child_id, "overdue"] });
      queryClient.invalidateQueries({ queryKey: ["activeTasks", data.child_id] });
    },
  });
};

export const useCompleteRecurringTasksBulk = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sourceId,
      childId,
      dateList,
    }: {
      sourceId: string;
      childId: string;
      dateList: string[];
    }) => {
      const response = await apiClient.post<{
        completed_count: number;
        failed_count: number;
        errors: string[];
      }>(
        `/api/tasks/bulk/complete-recurring`,
        null,
        {
          params: {
            source_id: sourceId,
            child_id: childId,
            date_list: dateList,
          },
        }
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", "child", variables.childId] });
      queryClient.invalidateQueries({ queryKey: ["tasks", "child", variables.childId, "overdue"] });
      queryClient.invalidateQueries({ queryKey: ["activeTasks", variables.childId] });
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

// ==================== Parent Actions ====================

export const useCompleteTaskWithTimes = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      childId,
      startTime,
      endTime,
    }: {
      taskId: string;
      childId: string;
      startTime: string;
      endTime: string;
    }) => {
      const response = await apiClient.post<Task>(
        `/api/tasks/${taskId}/complete-with-times`,
        null,
        {
          params: {
            child_id: childId,
            start_time: startTime,
            end_time: endTime,
          },
        }
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

export const useUncompleteTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const response = await apiClient.post<Task>(`/api/tasks/${taskId}/uncomplete`);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["task", data._id] });
      queryClient.invalidateQueries({ queryKey: ["tasks", "collection", data.collection_id] });
      queryClient.invalidateQueries({ queryKey: ["tasks", "child", data.child_id] });
    },
  });
};

export const useSkipTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const response = await apiClient.post<Task>(`/api/tasks/${taskId}/skip`);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["task", data._id] });
      queryClient.invalidateQueries({ queryKey: ["tasks", "collection", data.collection_id] });
      queryClient.invalidateQueries({ queryKey: ["tasks", "child", data.child_id] });
    },
  });
};

export const useRestoreSkippedTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const response = await apiClient.post<Task>(`/api/tasks/${taskId}/restore-skipped`);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["task", data._id] });
      queryClient.invalidateQueries({ queryKey: ["tasks", "collection", data.collection_id] });
      queryClient.invalidateQueries({ queryKey: ["tasks", "child", data.child_id] });
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

export const useRemoveRecurrenceException = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      exceptionDate,
    }: {
      taskId: string;
      exceptionDate: string; // YYYY-MM-DD
    }) => {
      const response = await apiClient.delete<Task>(
        `/api/tasks/${taskId}/exceptions`,
        {
          params: {
            exception_date: exceptionDate,
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
