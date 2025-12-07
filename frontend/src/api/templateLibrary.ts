/**
 * Template Library API - Browse and manage user's template collection
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import { TaskTemplate } from "@/types/template";

// Get all public templates in library
export function useTemplateLibrary() {
  return useQuery<TaskTemplate[]>({
    queryKey: ["template-library"],
    queryFn: async () => {
      const response = await apiClient.get<TaskTemplate[]>("/api/templates/library");
      return response.data;
    },
  });
}

// Get user's added templates
export function useMyTemplates() {
  return useQuery<TaskTemplate[]>({
    queryKey: ["my-templates"],
    queryFn: async () => {
      const response = await apiClient.get<TaskTemplate[]>("/api/templates/my-templates");
      return response.data;
    },
  });
}

// Check if template is added
export function useCheckTemplateAdded(templateId: string) {
  return useQuery<{ is_added: boolean }>({
    queryKey: ["template-added", templateId],
    queryFn: async () => {
      const response = await apiClient.get<{ is_added: boolean }>(
        `/api/templates/check-added/${templateId}`
      );
      return response.data;
    },
    enabled: !!templateId,
  });
}

// Add template to collection
export function useAddTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      const response = await apiClient.post(`/api/templates/add/${templateId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-templates"] });
      queryClient.invalidateQueries({ queryKey: ["template-added"] });
    },
  });
}

// Remove template from collection
export function useRemoveTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      const response = await apiClient.delete(`/api/templates/remove/${templateId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-templates"] });
      queryClient.invalidateQueries({ queryKey: ["template-added"] });
    },
  });
}
