/**
 * Query hooks for tool management
 */
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../client";
import { Tool } from "../../types/enhanced-tasks";

/**
 * Get all tools for a child
 */
export function useTools(childId: string, includeInactive: boolean = false) {
  return useQuery({
    queryKey: ["tools", childId, includeInactive],
    queryFn: async (): Promise<Tool[]> => {
      const response = await apiClient.get("/api/tools", {
        params: { child_id: childId, include_inactive: includeInactive },
      });
      return response.data;
    },
    enabled: !!childId,
  });
}

/**
 * Get single tool by ID
 */
export function useTool(toolId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ["tool", toolId],
    queryFn: async (): Promise<Tool> => {
      const response = await apiClient.get(`/api/tools/${toolId}`);
      return response.data;
    },
    enabled: enabled && !!toolId,
  });
}
