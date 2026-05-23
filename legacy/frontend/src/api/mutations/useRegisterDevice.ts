/**
 * Mutation hook to register a new device
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client";
import { DeviceRegistration, Device } from "../../types/device";

export function useRegisterDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: DeviceRegistration): Promise<Device> => {
      const response = await apiClient.post("/api/devices/register", data);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate devices list
      queryClient.invalidateQueries({ queryKey: ["devices"] });
    },
  });
}
