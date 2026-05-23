/**
 * Query hook to get children registered to a device (for trusted device flow)
 */
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../client";
import { Child } from "../../types/child";

export function useDeviceChildren(device_token: string | null, enabled: boolean = true) {
  return useQuery({
    queryKey: ["deviceChildren", device_token],
    queryFn: async (): Promise<Child[]> => {
      const response = await apiClient.get(`/api/devices/${device_token}/children`);
      return response.data;
    },
    enabled: enabled && !!device_token,
  });
}
