/**
 * Query hooks for activity management
 */
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../client";
import { Activity } from "../../types/enhanced-tasks";

/**
 * Get all activities for a child
 */
export function useActivities(childId: string, includeInactive: boolean = false) {
  return useQuery({
    queryKey: ["activities", childId, includeInactive],
    queryFn: async (): Promise<Activity[]> => {
      const response = await apiClient.get("/api/activities", {
        params: { child_id: childId, include_inactive: includeInactive },
      });
      return response.data;
    },
    enabled: !!childId,
  });
}

/**
 * Get single activity by ID
 */
export function useActivity(activityId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ["activity", activityId],
    queryFn: async (): Promise<Activity> => {
      const response = await apiClient.get(`/api/activities/${activityId}`);
      return response.data;
    },
    enabled: enabled && !!activityId,
  });
}

/**
 * Get available activities for specific time
 */
export function useAvailableActivities(
  childId: string,
  currentTime: string,
  currentDay: string
) {
  return useQuery({
    queryKey: ["availableActivities", childId, currentTime, currentDay],
    queryFn: async (): Promise<Activity[]> => {
      const response = await apiClient.get("/api/activities/available", {
        params: {
          child_id: childId,
          current_time: currentTime,
          current_day: currentDay,
        },
      });
      return response.data;
    },
    enabled: !!childId && !!currentTime && !!currentDay,
  });
}
