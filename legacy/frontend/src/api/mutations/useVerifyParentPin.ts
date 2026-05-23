/**
 * Mutation hook to verify parent portal PIN
 */
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "../client";
import { ParentPortalPIN } from "../../types/user";

export function useVerifyParentPin() {
  return useMutation({
    mutationFn: async (data: ParentPortalPIN): Promise<{ valid: boolean }> => {
      const response = await apiClient.post("/api/auth/parent-pin/verify", data);
      return response.data;
    },
  });
}
