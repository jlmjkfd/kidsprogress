/**
 * Mutation hooks for activity management
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client";
import {
  Activity,
  ActivityCreate,
  ActivityUpdate,
} from "../../types/enhanced-tasks";

/**
 * Create new activity
 */
export function useCreateActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ActivityCreate): Promise<Activity> => {
      const response = await apiClient.post("/api/activities", data);
      return response.data.activity;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["activities", data.child_id] });
    },
  });
}

/**
 * Update existing activity
 */
export function useUpdateActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      activityId,
      data,
    }: {
      activityId: string;
      data: ActivityUpdate;
    }): Promise<Activity> => {
      const response = await apiClient.put(`/api/activities/${activityId}`, data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["activities", data.child_id] });
      queryClient.invalidateQueries({ queryKey: ["activity", data._id] });
    },
  });
}

/**
 * Delete activity
 */
export function useDeleteActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (activityId: string): Promise<{ success: boolean }> => {
      const response = await apiClient.delete(`/api/activities/${activityId}`);
      return response.data;
    },
    onSuccess: (_data, activityId) => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      queryClient.removeQueries({ queryKey: ["activity", activityId] });
    },
  });
}
