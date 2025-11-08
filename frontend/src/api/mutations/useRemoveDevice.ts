/**
 * Mutation hook to remove/deactivate a device
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client";

export function useRemoveDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (device_token: string): Promise<void> => {
      await apiClient.delete(`/api/devices/${device_token}`);
    },
    onSuccess: () => {
      // Invalidate devices list
      queryClient.invalidateQueries({ queryKey: ["devices"] });
    },
  });
}
