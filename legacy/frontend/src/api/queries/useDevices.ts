/**
 * Query hook to fetch all registered devices for current user
 */
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../client";
import { Device } from "../../types/device";

export function useDevices(enabled: boolean = true) {
  return useQuery({
    queryKey: ["devices"],
    queryFn: async (): Promise<Device[]> => {
      const response = await apiClient.get("/api/devices");
      return response.data;
    },
    enabled,
  });
}
