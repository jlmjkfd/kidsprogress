/**
 * TanStack Query mutation hooks for task metadata
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client";
import {
  TaskTypeDefinition,
  TaskTypeCreate,
  TaskTypeUpdate,
  MetricTypeDefinition,
  MetricTypeCreate,
  MetricTypeUpdate,
} from "@/types/task";

// ==================== Task Types ====================

export const useCreateTaskType = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: TaskTypeCreate) => {
      const response = await apiClient.post<TaskTypeDefinition>(
        "/api/task-metadata/task-types",
        data
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["taskTypes"] });
    },
  });
};

export const useUpdateTaskType = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ code, data }: { code: string; data: TaskTypeUpdate }) => {
      const response = await apiClient.put<TaskTypeDefinition>(
        `/api/task-metadata/task-types/${code}`,
        data
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["taskTypes"] });
      queryClient.invalidateQueries({ queryKey: ["taskType", variables.code] });
    },
  });
};

export const useDeleteTaskType = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (code: string) => {
      await apiClient.delete(`/api/task-metadata/task-types/${code}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["taskTypes"] });
    },
  });
};

// ==================== Metric Types ====================

export const useCreateMetricType = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: MetricTypeCreate) => {
      const response = await apiClient.post<MetricTypeDefinition>(
        "/api/task-metadata/metric-types",
        data
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metricTypes"] });
    },
  });
};

export const useUpdateMetricType = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ code, data }: { code: string; data: MetricTypeUpdate }) => {
      const response = await apiClient.put<MetricTypeDefinition>(
        `/api/task-metadata/metric-types/${code}`,
        data
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["metricTypes"] });
      queryClient.invalidateQueries({ queryKey: ["metricType", variables.code] });
    },
  });
};

export const useDeleteMetricType = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (code: string) => {
      await apiClient.delete(`/api/task-metadata/metric-types/${code}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metricTypes"] });
    },
  });
};
