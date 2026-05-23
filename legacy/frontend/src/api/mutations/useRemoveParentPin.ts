/**
 * Mutation hook to remove parent portal PIN
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client";

export function useRemoveParentPin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<{ message: string }> => {
      const response = await apiClient.delete("/api/auth/parent-pin");
      return response.data;
    },
    onSuccess: () => {
      // Invalidate PIN status query
      queryClient.invalidateQueries({ queryKey: ["parent-pin-status"] });
    },
  });
}
