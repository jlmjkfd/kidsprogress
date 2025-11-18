/**
 * School Calendar Mutation Hooks
 * TanStack Query mutations for school calendar operations
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client";
import {
  Term,
  TermCreate,
  TermUpdate,
  SpecialDay,
  SpecialDayCreate,
  SpecialDayUpdate,
} from "@/types/schoolCalendar";

const API_BASE = "/api/school-calendar";

// Term Mutations
export function useCreateTerm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: TermCreate): Promise<Term> => {
      const response = await apiClient.post(`${API_BASE}/terms`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["terms", variables.child_id] });
      queryClient.invalidateQueries({ queryKey: ["dayTypes", variables.child_id] });
    },
  });
}

export function useUpdateTerm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ termId, data }: { termId: string; data: TermUpdate }): Promise<Term> => {
      const response = await apiClient.put(`${API_BASE}/terms/${termId}`, data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["terms", data.child_id] });
      queryClient.invalidateQueries({ queryKey: ["term", data._id] });
      queryClient.invalidateQueries({ queryKey: ["dayTypes", data.child_id] });
    },
  });
}

export function useDeleteTerm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ termId, childId }: { termId: string; childId: string }): Promise<void> => {
      await apiClient.delete(`${API_BASE}/terms/${termId}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["terms", variables.childId] });
      queryClient.invalidateQueries({ queryKey: ["dayTypes", variables.childId] });
    },
  });
}

// Special Day Mutations
export function useCreateSpecialDay() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SpecialDayCreate): Promise<SpecialDay> => {
      const response = await apiClient.post(`${API_BASE}/special-days`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["specialDays", variables.child_id] });
      queryClient.invalidateQueries({ queryKey: ["dayTypes", variables.child_id] });
    },
  });
}

export function useUpdateSpecialDay() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      dayId,
      data,
    }: {
      dayId: string;
      data: SpecialDayUpdate;
    }): Promise<SpecialDay> => {
      const response = await apiClient.put(`${API_BASE}/special-days/${dayId}`, data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["specialDays", data.child_id] });
      queryClient.invalidateQueries({ queryKey: ["specialDay", data._id] });
      queryClient.invalidateQueries({ queryKey: ["dayTypes", data.child_id] });
    },
  });
}

export function useDeleteSpecialDay() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ dayId, childId }: { dayId: string; childId: string }): Promise<void> => {
      await apiClient.delete(`${API_BASE}/special-days/${dayId}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["specialDays", variables.childId] });
      queryClient.invalidateQueries({ queryKey: ["dayTypes", variables.childId] });
    },
  });
}
