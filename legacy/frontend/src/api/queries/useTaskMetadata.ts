/**
 * TanStack Query hooks for task metadata (task types and metric types)
 */
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../client";
import {
  TaskTypeDefinition,
  MetricTypeDefinition,
} from "@/types/task";

// ==================== Task Types ====================

export const useTaskTypes = (activeOnly: boolean = true) => {
  return useQuery({
    queryKey: ["taskTypes", activeOnly],
    queryFn: async () => {
      const response = await apiClient.get<TaskTypeDefinition[]>(
        "/api/task-metadata/task-types",
        { params: { active_only: activeOnly } }
      );
      return response.data;
    },
  });
};

export const useTaskType = (code: string) => {
  return useQuery({
    queryKey: ["taskType", code],
    queryFn: async () => {
      const response = await apiClient.get<TaskTypeDefinition>(
        `/api/task-metadata/task-types/${code}`
      );
      return response.data;
    },
    enabled: !!code,
  });
};

// ==================== Metric Types ====================

export const useMetricTypes = (activeOnly: boolean = true) => {
  return useQuery({
    queryKey: ["metricTypes", activeOnly],
    queryFn: async () => {
      const response = await apiClient.get<MetricTypeDefinition[]>(
        "/api/task-metadata/metric-types",
        { params: { active_only: activeOnly } }
      );
      return response.data;
    },
  });
};

export const useMetricType = (code: string) => {
  return useQuery({
    queryKey: ["metricType", code],
    queryFn: async () => {
      const response = await apiClient.get<MetricTypeDefinition>(
        `/api/task-metadata/metric-types/${code}`
      );
      return response.data;
    },
    enabled: !!code,
  });
};
