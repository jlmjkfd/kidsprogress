/**
 * Mutation hooks for AI-powered task recommendations
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client";
import {
  TaskRecommendation,
  DailyPlan,
  RecommendNowRequest,
  PlanDayRequest,
  ReplanRequest,
} from "../../types/ai";

/**
 * Get AI recommendation for "What should I do now?"
 */
export function useRecommendNow() {
  return useMutation({
    mutationFn: async (
      request: RecommendNowRequest
    ): Promise<TaskRecommendation> => {
      const response = await apiClient.post(
        "/api/ai/schedule/recommend",
        request
      );
      return response.data.recommendation;
    },
  });
}

/**
 * Generate complete daily schedule plan
 */
export function usePlanDay() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: PlanDayRequest): Promise<DailyPlan> => {
      const response = await apiClient.post(
        "/api/ai/schedule/plan-day",
        request
      );
      return response.data.plan;
    },
    onSuccess: () => {
      // Invalidate schedule-related queries
      queryClient.invalidateQueries({ queryKey: ["schedule"] });
    },
  });
}

/**
 * Replan schedule after changes
 */
export function useReplanSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: ReplanRequest): Promise<DailyPlan> => {
      const response = await apiClient.post(
        "/api/ai/schedule/replan",
        request
      );
      return response.data.updated_plan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule"] });
    },
  });
}
