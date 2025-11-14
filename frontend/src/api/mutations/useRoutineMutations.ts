/**
 * Mutation hooks for routine management
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client";
import {
  Routine,
  RoutineCreate,
  RoutineUpdate,
} from "../../types/enhanced-tasks";

/**
 * Create new routine
 */
export function useCreateRoutine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: RoutineCreate): Promise<Routine> => {
      const response = await apiClient.post("/api/routines", data);
      return response.data.routine;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["routines", data.child_id] });
    },
  });
}

/**
 * Update existing routine
 */
export function useUpdateRoutine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      routineId,
      data,
    }: {
      routineId: string;
      data: RoutineUpdate;
    }): Promise<Routine> => {
      const response = await apiClient.put(`/api/routines/${routineId}`, data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["routines", data.child_id] });
      queryClient.invalidateQueries({ queryKey: ["routine", data._id] });
    },
  });
}

/**
 * Delete routine
 */
export function useDeleteRoutine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (routineId: string): Promise<{ success: boolean }> => {
      const response = await apiClient.delete(`/api/routines/${routineId}`);
      return response.data;
    },
    onSuccess: (_data, routineId) => {
      queryClient.invalidateQueries({ queryKey: ["routines"] });
      queryClient.removeQueries({ queryKey: ["routine", routineId] });
    },
  });
}

/**
 * Generate task from routine for specific date
 */
export function useGenerateRoutineTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      routineId,
      date,
    }: {
      routineId: string;
      date: string;
    }): Promise<any> => {
      const response = await apiClient.post(
        `/api/routines/${routineId}/generate`,
        { date }
      );
      return response.data.task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["schedule"] });
    },
  });
}

/**
 * Cancel routine for specific date
 */
export function useCancelRoutine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      routineId,
      date,
    }: {
      routineId: string;
      date: string;
    }): Promise<{ success: boolean }> => {
      const response = await apiClient.post(
        `/api/routines/${routineId}/cancel`,
        { date }
      );
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["routine", variables.routineId],
      });
    },
  });
}
