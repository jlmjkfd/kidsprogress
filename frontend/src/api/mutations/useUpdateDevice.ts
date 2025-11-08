/**
 * Mutation hook to update device information
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client";
import { DeviceUpdate, Device } from "../../types/device";

interface UpdateDeviceParams {
  device_token: string;
  updates: DeviceUpdate;
}

export function useUpdateDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ device_token, updates }: UpdateDeviceParams): Promise<Device> => {
      const response = await apiClient.put(`/api/devices/${device_token}`, updates);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate devices list
      queryClient.invalidateQueries({ queryKey: ["devices"] });
    },
  });
}
