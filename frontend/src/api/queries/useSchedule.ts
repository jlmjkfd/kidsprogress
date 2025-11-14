/**
 * Query hooks for schedule management
 */
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../client";
import { DailySchedule, ScheduleConflict } from "../../types/enhanced-tasks";

/**
 * Get daily schedule for a child
 */
export function useDailySchedule(childId: string, date: string) {
  return useQuery({
    queryKey: ["schedule", childId, date],
    queryFn: async (): Promise<DailySchedule> => {
      const response = await apiClient.get("/api/schedule/daily", {
        params: { child_id: childId, date },
      });
      return response.data;
    },
    enabled: !!childId && !!date,
  });
}

/**
 * Detect schedule conflicts for a child
 */
export function useScheduleConflicts(childId: string, date: string) {
  return useQuery({
    queryKey: ["scheduleConflicts", childId, date],
    queryFn: async (): Promise<ScheduleConflict[]> => {
      const response = await apiClient.get("/api/schedule/conflicts", {
        params: { child_id: childId, date },
      });
      return response.data.conflicts;
    },
    enabled: !!childId && !!date,
  });
}
