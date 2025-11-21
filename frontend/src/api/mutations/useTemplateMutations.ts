/**
 * Mutation hooks for task templates
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client";
import type {
  TaskTemplate,
  CreateTemplateRequest,
  UpdateTemplateRequest,
} from "../../types/template";

export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTemplateRequest) => {
      const response = await apiClient.post<TaskTemplate>("/api/templates", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      templateId,
      data,
    }: {
      templateId: string;
      data: UpdateTemplateRequest;
    }) => {
      const response = await apiClient.put<TaskTemplate>(
        `/api/templates/${templateId}`,
        data
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      queryClient.invalidateQueries({ queryKey: ["template", variables.templateId] });
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      await apiClient.delete(`/api/templates/${templateId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
  });
}

export function useAddTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      await apiClient.post(`/api/templates/${templateId}/add`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      queryClient.invalidateQueries({ queryKey: ["myTemplates"] });
    },
  });
}

export function useRemoveTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      await apiClient.delete(`/api/templates/${templateId}/remove`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      queryClient.invalidateQueries({ queryKey: ["myTemplates"] });
    },
  });
}
