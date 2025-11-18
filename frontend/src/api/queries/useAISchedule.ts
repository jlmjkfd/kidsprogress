/**
 * Query hooks for AI scheduling
 */
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../client";
import {
  ChildState,
  ScheduleConflict,
  TaskRecommendation,
  DayTasksSummary,
} from "@/types/aiRecommendation";

/**
 * Get all tasks for a specific day
 */
export function useDayTasks(childId: string, targetDate?: string) {
  return useQuery({
    queryKey: ["dayTasks", childId, targetDate],
    queryFn: async (): Promise<DayTasksSummary> => {
      const params: Record<string, string> = { child_id: childId };
      if (targetDate) {
        params.target_date = targetDate;
      }
      const response = await apiClient.get("/api/ai/schedule/day-tasks", { params });
      return response.data;
    },
    enabled: !!childId,
  });
}

/**
 * Get AI task recommendation
 */
export function useAIRecommendation(
  childId: string,
  currentTime?: string,
  childState?: ChildState,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ["aiRecommendation", childId, currentTime, childState],
    queryFn: async (): Promise<TaskRecommendation> => {
      const response = await apiClient.post(
        `/api/ai/schedule/recommend`,
        {
          child_id: childId,
          current_time: currentTime,
          child_state: childState,
        }
      );
      // Backend returns {success: true, recommendation: {...}, timestamp: ...}
      // Extract just the recommendation object
      return response.data.recommendation || response.data;
    },
    enabled: enabled && !!childId,
    staleTime: 30000, // 30 seconds - recommendations can change quickly
  });
}

/**
 * Get schedule conflicts for a task or all tasks
 */
export function useScheduleConflicts(childId: string, taskId?: string) {
  return useQuery({
    queryKey: ["scheduleConflicts", childId, taskId],
    queryFn: async (): Promise<ScheduleConflict[]> => {
      const params: Record<string, string> = { child_id: childId };
      if (taskId) {
        params.task_id = taskId;
      }
      const response = await apiClient.get("/api/ai/schedule/conflicts", { params });
      return response.data;
    },
    enabled: !!childId,
  });
}
