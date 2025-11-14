/**
 * Mutation hooks for tool management
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client";
import { Tool, ToolCreate, ToolUpdate } from "../../types/enhanced-tasks";

/**
 * Create new tool
 */
export function useCreateTool() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ToolCreate): Promise<Tool> => {
      const response = await apiClient.post("/api/tools", data);
      return response.data.tool;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tools", data.child_id] });
    },
  });
}

/**
 * Update existing tool
 */
export function useUpdateTool() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      toolId,
      data,
    }: {
      toolId: string;
      data: ToolUpdate;
    }): Promise<Tool> => {
      const response = await apiClient.put(`/api/tools/${toolId}`, data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tools", data.child_id] });
      queryClient.invalidateQueries({ queryKey: ["tool", data._id] });
    },
  });
}

/**
 * Delete tool
 */
export function useDeleteTool() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (toolId: string): Promise<{ success: boolean }> => {
      const response = await apiClient.delete(`/api/tools/${toolId}`);
      return response.data;
    },
    onSuccess: (_data, toolId) => {
      queryClient.invalidateQueries({ queryKey: ["tools"] });
      queryClient.removeQueries({ queryKey: ["tool", toolId] });
    },
  });
}
