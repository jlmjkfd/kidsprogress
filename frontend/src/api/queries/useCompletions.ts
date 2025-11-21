/**
 * Query hooks for task completions
 */
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../client";
import type { TaskCompletion, PrepareExecutionResponse } from "../../types/template";

interface UseCompletionsParams {
  task_id?: string;
  child_id?: string;
  template_id?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
}

export function useCompletions(params: UseCompletionsParams = {}) {
  return useQuery({
    queryKey: ["completions", params],
    queryFn: async () => {
      const response = await apiClient.get<{
        completions: TaskCompletion[];
        total: number;
      }>("/api/completions", { params });
      return response.data;
    },
  });
}

export function useCompletion(completionId: string | undefined) {
  return useQuery({
    queryKey: ["completion", completionId],
    queryFn: async () => {
      if (!completionId) throw new Error("Completion ID is required");
      const response = await apiClient.get<TaskCompletion>(
        `/api/completions/${completionId}`
      );
      return response.data;
    },
    enabled: !!completionId,
  });
}

export function usePrepareExecution(taskId: string | undefined) {
  return useQuery({
    queryKey: ["prepare-execution", taskId],
    queryFn: async () => {
      if (!taskId) throw new Error("Task ID is required");
      const response = await apiClient.get<PrepareExecutionResponse>(
        `/api/completions/${taskId}/prepare`
      );
      return response.data;
    },
    enabled: !!taskId,
  });
}
