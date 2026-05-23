/**
 * Query hooks for day type calendar management
 */
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../client";
import {
  DayTypeEntry,
  DefaultDayPattern,
  DayTypeEnum,
} from "@/types/dayType";

/**
 * Get day type entry for a specific date
 */
export function useDayType(childId: string, date: string) {
  return useQuery({
    queryKey: ["dayType", childId, date],
    queryFn: async (): Promise<DayTypeEntry | null> => {
      const response = await apiClient.get("/api/day-types/date", {
        params: { child_id: childId, date },
      });
      return response.data;
    },
    enabled: !!childId && !!date,
  });
}

/**
 * Get all day type entries in a date range
 */
export function useDayTypesRange(
  childId: string,
  startDate: string,
  endDate: string
) {
  return useQuery({
    queryKey: ["dayTypes", childId, startDate, endDate],
    queryFn: async (): Promise<DayTypeEntry[]> => {
      const response = await apiClient.get("/api/day-types/range", {
        params: {
          child_id: childId,
          start_date: startDate,
          end_date: endDate,
        },
      });
      return response.data;
    },
    enabled: !!childId && !!startDate && !!endDate,
  });
}

/**
 * Get effective day type for a date (specific entry or default pattern)
 */
export function useEffectiveDayType(childId: string, date: string) {
  return useQuery({
    queryKey: ["effectiveDayType", childId, date],
    queryFn: async (): Promise<{ date: string; day_type: string }> => {
      const response = await apiClient.get("/api/day-types/effective", {
        params: { child_id: childId, date },
      });
      return response.data;
    },
    enabled: !!childId && !!date,
  });
}

/**
 * Get default day pattern for a child
 */
export function useDefaultDayPattern(childId: string) {
  return useQuery({
    queryKey: ["defaultDayPattern", childId],
    queryFn: async (): Promise<DefaultDayPattern> => {
      const response = await apiClient.get(`/api/day-types/pattern/${childId}`);
      return response.data;
    },
    enabled: !!childId,
  });
}
