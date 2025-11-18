/**
 * Mutation hooks for AI scheduling (replanning)
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client";
import { ReplannedSchedule, ReplanRequest } from "@/types/aiRecommendation";

/**
 * Trigger dynamic replanning when a task takes longer than expected
 */
export const useReplanSchedule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ReplanRequest): Promise<ReplannedSchedule> => {
      const response = await apiClient.post("/api/ai/schedule/replan", data);
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate day tasks and tasks queries
      queryClient.invalidateQueries({ queryKey: ["dayTasks", variables.child_id] });
      queryClient.invalidateQueries({ queryKey: ["tasks", "child", variables.child_id] });
      queryClient.invalidateQueries({ queryKey: ["aiRecommendation", variables.child_id] });
    },
  });
};
