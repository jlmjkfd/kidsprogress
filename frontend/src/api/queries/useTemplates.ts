/**
 * Query hook for fetching task templates
 */
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../client";
import type { TaskTemplate } from "../../types/template";

interface UseTemplatesParams {
  category?: string;
  execution_handler?: string;
  is_public?: boolean;
  page?: number;
  limit?: number;
}

export function useTemplates(params: UseTemplatesParams = {}) {
  return useQuery({
    queryKey: ["templates", params],
    queryFn: async () => {
      const response = await apiClient.get<TaskTemplate[]>("/api/templates", {
        params,
      });
      return response.data;
    },
  });
}

export function useTemplate(templateId: string | undefined) {
  return useQuery({
    queryKey: ["template", templateId],
    queryFn: async () => {
      if (!templateId) throw new Error("Template ID is required");
      const response = await apiClient.get<TaskTemplate>(
        `/api/templates/${templateId}`
      );
      return response.data;
    },
    enabled: !!templateId,
  });
}

export function useMyTemplates() {
  return useQuery({
    queryKey: ["myTemplates"],
    queryFn: async () => {
      const response = await apiClient.get<TaskTemplate[]>("/api/templates/my/list");
      return response.data;
    },
  });
}
