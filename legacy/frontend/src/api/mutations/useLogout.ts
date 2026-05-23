/**
 * Logout mutation
 */
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "../client";

export function useLogout() {
  return useMutation({
    mutationFn: async (): Promise<{ message: string }> => {
      const response = await apiClient.post("/api/auth/logout");
      return response.data;
    },
  });
}
