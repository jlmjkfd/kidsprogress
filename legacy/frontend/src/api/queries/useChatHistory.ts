/**
 * Chat history query
 */
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../client";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
}

export function useChatHistory(childId: string, limit: number = 50) {
  return useQuery({
    queryKey: ["chat-history", childId],
    queryFn: async (): Promise<ChatMessage[]> => {
      const response = await apiClient.get(`/api/chat/${childId}/history`, {
        params: { limit },
      });
      return response.data;
    },
    enabled: !!childId,
  });
}
