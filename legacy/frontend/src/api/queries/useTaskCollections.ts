/**
 * TanStack Query hooks for task collections
 */
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../client";
import { TaskCollection } from "@/types/task";

export const useTaskCollections = (childId: string, includeArchived: boolean = false) => {
  return useQuery({
    queryKey: ["taskCollections", childId, includeArchived],
    queryFn: async () => {
      const response = await apiClient.get<TaskCollection[]>(
        `/api/task-collections/child/${childId}`,
        { params: { include_archived: includeArchived } }
      );
      return response.data;
    },
    enabled: !!childId,
  });
};

export const useTaskCollection = (collectionId: string) => {
  return useQuery({
    queryKey: ["taskCollection", collectionId],
    queryFn: async () => {
      const response = await apiClient.get<TaskCollection>(
        `/api/task-collections/${collectionId}`
      );
      return response.data;
    },
    enabled: !!collectionId,
  });
};

export const useDefaultTaskCollection = (childId: string) => {
  return useQuery({
    queryKey: ["defaultTaskCollection", childId],
    queryFn: async () => {
      const response = await apiClient.get<TaskCollection>(
        `/api/task-collections/child/${childId}/default`
      );
      return response.data;
    },
    enabled: !!childId,
  });
};
