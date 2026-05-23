/**
 * Query hook to get AI explanation for task scheduling
 */
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../client";
import { TaskExplanation } from "../../types/ai";

export function useTaskExplanation(
  childId: string,
  taskId: string,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ["taskExplanation", childId, taskId],
    queryFn: async (): Promise<TaskExplanation> => {
      const response = await apiClient.get("/api/ai/schedule/explanation", {
        params: { child_id: childId, task_id: taskId },
      });
      return response.data;
    },
    enabled: enabled && !!childId && !!taskId,
  });
}
