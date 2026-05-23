/**
 * School Calendar Query Hooks
 * TanStack Query hooks for fetching school calendar data
 */
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../client";
import { Term, SpecialDay, DayTypeResponse } from "@/types/schoolCalendar";

const API_BASE = "/api/school-calendar";

// Term Queries
export function useTerms(childId: string, includeInactive: boolean = false) {
  return useQuery({
    queryKey: ["terms", childId, includeInactive],
    queryFn: async (): Promise<Term[]> => {
      const response = await apiClient.get(`${API_BASE}/terms`, {
        params: { child_id: childId, include_inactive: includeInactive },
      });
      return response.data;
    },
    enabled: !!childId,
  });
}

export function useTerm(termId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ["term", termId],
    queryFn: async (): Promise<Term> => {
      const response = await apiClient.get(`${API_BASE}/terms/${termId}`);
      return response.data;
    },
    enabled: enabled && !!termId,
  });
}

// Special Day Queries
export function useSpecialDays(
  childId: string,
  startDate?: string,
  endDate?: string
) {
  return useQuery({
    queryKey: ["specialDays", childId, startDate, endDate],
    queryFn: async (): Promise<SpecialDay[]> => {
      const response = await apiClient.get(`${API_BASE}/special-days`, {
        params: {
          child_id: childId,
          start_date: startDate,
          end_date: endDate,
        },
      });
      return response.data;
    },
    enabled: !!childId,
  });
}

export function useSpecialDay(dayId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ["specialDay", dayId],
    queryFn: async (): Promise<SpecialDay> => {
      const response = await apiClient.get(`${API_BASE}/special-days/${dayId}`);
      return response.data;
    },
    enabled: enabled && !!dayId,
  });
}

// Day Type Queries
export function useDayType(childId: string, date: string) {
  return useQuery({
    queryKey: ["dayType", childId, date],
    queryFn: async (): Promise<DayTypeResponse> => {
      const response = await apiClient.get(`${API_BASE}/day-type`, {
        params: { child_id: childId, date },
      });
      return response.data;
    },
    enabled: !!childId && !!date,
  });
}

export function useDayTypesBatch(childId: string, startDate: string, endDate: string) {
  return useQuery({
    queryKey: ["dayTypes", childId, startDate, endDate],
    queryFn: async (): Promise<DayTypeResponse[]> => {
      const response = await apiClient.get(`${API_BASE}/day-types`, {
        params: { child_id: childId, start_date: startDate, end_date: endDate },
      });
      return response.data;
    },
    enabled: !!childId && !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000, // 5 minutes - day types don't change frequently
  });
}
