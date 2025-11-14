/**
 * Mutation hooks for time block management
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client";
import {
  TimeBlock,
  TimeBlockCreate,
  TimeBlockUpdate,
} from "../../types/enhanced-tasks";

/**
 * Create new time block
 */
export function useCreateTimeBlock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: TimeBlockCreate): Promise<TimeBlock> => {
      const response = await apiClient.post("/api/time-blocks", data);
      return response.data.time_block;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["timeBlocks", data.child_id] });
    },
  });
}

/**
 * Update existing time block
 */
export function useUpdateTimeBlock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      timeBlockId,
      data,
    }: {
      timeBlockId: string;
      data: TimeBlockUpdate;
    }): Promise<TimeBlock> => {
      const response = await apiClient.put(`/api/time-blocks/${timeBlockId}`, data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["timeBlocks", data.child_id] });
      queryClient.invalidateQueries({ queryKey: ["timeBlock", data._id] });
    },
  });
}

/**
 * Delete time block
 */
export function useDeleteTimeBlock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (timeBlockId: string): Promise<{ success: boolean }> => {
      const response = await apiClient.delete(`/api/time-blocks/${timeBlockId}`);
      return response.data;
    },
    onSuccess: (_data, timeBlockId) => {
      queryClient.invalidateQueries({ queryKey: ["timeBlocks"] });
      queryClient.removeQueries({ queryKey: ["timeBlock", timeBlockId] });
    },
  });
}
