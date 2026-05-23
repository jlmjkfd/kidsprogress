/**
 * Mutation hooks for day type calendar management
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client";
import {
  DayTypeEntry,
  DayTypeCreate,
  DayTypeUpdate,
  DefaultDayPattern,
  DefaultDayPatternUpdate,
} from "@/types/dayType";

/**
 * Create a day type entry
 */
export const useCreateDayType = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: DayTypeCreate): Promise<DayTypeEntry> => {
      const response = await apiClient.post("/api/day-types", data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["dayType", data.child_id] });
      queryClient.invalidateQueries({ queryKey: ["dayTypes", data.child_id] });
      queryClient.invalidateQueries({ queryKey: ["effectiveDayType", data.child_id] });
    },
  });
};

/**
 * Update a day type entry
 */
export const useUpdateDayType = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ entryId, data }: { entryId: string; data: DayTypeUpdate }): Promise<DayTypeEntry> => {
      const response = await apiClient.put(`/api/day-types/${entryId}`, data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["dayType", data.child_id] });
      queryClient.invalidateQueries({ queryKey: ["dayTypes", data.child_id] });
      queryClient.invalidateQueries({ queryKey: ["effectiveDayType", data.child_id] });
    },
  });
};

/**
 * Delete a day type entry
 */
export const useDeleteDayType = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ entryId, childId }: { entryId: string; childId: string }): Promise<void> => {
      await apiClient.delete(`/api/day-types/${entryId}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["dayType", variables.childId] });
      queryClient.invalidateQueries({ queryKey: ["dayTypes", variables.childId] });
      queryClient.invalidateQueries({ queryKey: ["effectiveDayType", variables.childId] });
    },
  });
};

/**
 * Update default day pattern
 */
export const useUpdateDefaultPattern = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      childId,
      data,
    }: {
      childId: string;
      data: DefaultDayPatternUpdate;
    }): Promise<DefaultDayPattern> => {
      const response = await apiClient.put(`/api/day-types/pattern/${childId}`, data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["defaultDayPattern", data.child_id] });
      queryClient.invalidateQueries({ queryKey: ["effectiveDayType", data.child_id] });
    },
  });
};
