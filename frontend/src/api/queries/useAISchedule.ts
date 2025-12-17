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
    // Don't include currentTime in queryKey - it changes every second
    // We always want fresh data, not cached by time
    queryKey: ["aiRecommendation", childId],
    queryFn: async (): Promise<TaskRecommendation> => {
      // Build request body with only defined values
      const body: Record<string, any> = {};
      if (currentTime !== undefined) {
        body.current_time = currentTime;
      }
      if (childState !== undefined) {
        body.child_state = childState;
      }

      const response = await apiClient.post(
        `/api/ai/schedule/recommend?child_id=${childId}`,
        body
      );
      return response.data;
    },
    enabled: enabled && !!childId,
    staleTime: 0, // Always fetch fresh - recommendations change frequently
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
