/**
 * Query hook to check if a device is registered
 */
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../client";
import { Device } from "../../types/device";

export function useDeviceByToken(device_token: string | null, enabled: boolean = true) {
  return useQuery({
    queryKey: ["device", device_token],
    queryFn: async (): Promise<Device> => {
      const response = await apiClient.get(`/api/devices/${device_token}`);
      return response.data;
    },
    enabled: enabled && !!device_token,
  });
}
