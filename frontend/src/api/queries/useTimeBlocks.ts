/**
 * Query hooks for time block management
 */
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../client";
import { TimeBlock } from "../../types/enhanced-tasks";

/**
 * Get all time blocks for a child
 */
export function useTimeBlocks(childId: string, includeInactive: boolean = false) {
  return useQuery({
    queryKey: ["timeBlocks", childId, includeInactive],
    queryFn: async (): Promise<TimeBlock[]> => {
      const response = await apiClient.get("/api/time-blocks", {
        params: { child_id: childId, include_inactive: includeInactive },
      });
      return response.data;
    },
    enabled: !!childId,
  });
}

/**
 * Get single time block by ID
 */
export function useTimeBlock(timeBlockId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ["timeBlock", timeBlockId],
    queryFn: async (): Promise<TimeBlock> => {
      const response = await apiClient.get(`/api/time-blocks/${timeBlockId}`);
      return response.data;
    },
    enabled: enabled && !!timeBlockId,
  });
}

/**
 * Get active time blocks for specific date
 */
export function useActiveTimeBlocks(childId: string, date: string) {
  return useQuery({
    queryKey: ["activeTimeBlocks", childId, date],
    queryFn: async (): Promise<TimeBlock[]> => {
      const response = await apiClient.get("/api/time-blocks/active", {
        params: { child_id: childId, date },
      });
      return response.data;
    },
    enabled: !!childId && !!date,
  });
}
