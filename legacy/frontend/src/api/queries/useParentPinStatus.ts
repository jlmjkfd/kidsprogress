/**
 * Query hook to check if parent portal PIN is set
 */
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../client";

interface ParentPinStatus {
  has_pin: boolean;
}

export function useParentPinStatus(enabled: boolean = true) {
  return useQuery({
    queryKey: ["parent-pin-status"],
    queryFn: async (): Promise<ParentPinStatus> => {
      const response = await apiClient.get("/api/auth/parent-pin/status");
      return response.data;
    },
    enabled,
  });
}
