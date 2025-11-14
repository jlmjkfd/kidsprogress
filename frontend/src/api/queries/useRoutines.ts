/**
 * Query hooks for routine management
 */
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../client";
import { Routine } from "../../types/enhanced-tasks";

/**
 * Get all routines for a child
 */
export function useRoutines(childId: string, includeInactive: boolean = false) {
  return useQuery({
    queryKey: ["routines", childId, includeInactive],
    queryFn: async (): Promise<Routine[]> => {
      const response = await apiClient.get("/api/routines", {
        params: { child_id: childId, include_inactive: includeInactive },
      });
      return response.data;
    },
    enabled: !!childId,
  });
}

/**
 * Get single routine by ID
 */
export function useRoutine(routineId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ["routine", routineId],
    queryFn: async (): Promise<Routine> => {
      const response = await apiClient.get(`/api/routines/${routineId}`);
      return response.data;
    },
    enabled: enabled && !!routineId,
  });
}

/**
 * Preview next occurrences of a routine
 */
export function useRoutinePreview(routineId: string, count: number = 10) {
  return useQuery({
    queryKey: ["routinePreview", routineId, count],
    queryFn: async (): Promise<{
      routine_id: string;
      recurrence_pattern: string;
      occurrences: string[];
      count: number;
    }> => {
      const response = await apiClient.get(
        `/api/routines/${routineId}/preview`,
        { params: { count } }
      );
      return response.data;
    },
    enabled: !!routineId,
  });
}
