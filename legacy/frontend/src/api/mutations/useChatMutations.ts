/**
 * Chat API mutations
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client";

interface ChatResponse {
  message: string;
  session_id: string;
}

interface SendMessageParams {
  message: string;
  language: string;
}

export function useSendMessage(childId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ message, language }: SendMessageParams): Promise<ChatResponse> => {
      const response = await apiClient.post(`/api/chat/${childId}/message`, {
        message,
        language,
      });
      return response.data;
    },
    onSuccess: () => {
      // Invalidate chat history to refresh
      queryClient.invalidateQueries({ queryKey: ["chat-history", childId] });
    },
  });
}

export function useClearChat(childId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<{ success: boolean }> => {
      const response = await apiClient.delete(`/api/chat/${childId}/clear`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-history", childId] });
    },
  });
}
