/**
 * Mutation hooks for task completions
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client";
import type {
  SubmitCompletionRequest,
  SubmitCompletionResponse,
  PrepareExecutionResponse,
} from "../../types/template";

export function usePrepareExecution() {
  return useMutation({
    mutationFn: async (taskId: string) => {
      const response = await apiClient.get<PrepareExecutionResponse>(
        `/api/completions/${taskId}/prepare`
      );
      return response.data;
    },
  });
}

export function useSubmitCompletion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      data,
    }: {
      taskId: string;
      data: SubmitCompletionRequest;
    }) => {
      const response = await apiClient.post<SubmitCompletionResponse>(
        `/api/completions/${taskId}/submit`,
        data
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      // Invalidate completions queries
      queryClient.invalidateQueries({ queryKey: ["completions"] });
      // Invalidate task queries (status changed to completed)
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task", variables.taskId] });
    },
  });
}
