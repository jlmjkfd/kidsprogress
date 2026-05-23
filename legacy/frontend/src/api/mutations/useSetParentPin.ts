/**
 * Mutation hook to set/change parent portal PIN
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client";
import { ParentPortalPIN } from "../../types/user";

export function useSetParentPin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ParentPortalPIN): Promise<{ message: string }> => {
      const response = await apiClient.post("/api/auth/parent-pin/set", data);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate PIN status query
      queryClient.invalidateQueries({ queryKey: ["parent-pin-status"] });
    },
  });
}
