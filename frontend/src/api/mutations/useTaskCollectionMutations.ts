/**
 * TanStack Query mutation hooks for task collections
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../client";
import {
  TaskCollection,
  TaskCollectionCreate,
  TaskCollectionUpdate,
} from "@/types/task";

export const useCreateTaskCollection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: TaskCollectionCreate) => {
      const response = await apiClient.post<TaskCollection>(
        "/api/task-collections",
        data
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["taskCollections", data.child_id] });
    },
  });
};

export const useUpdateTaskCollection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ collectionId, data }: { collectionId: string; data: TaskCollectionUpdate }) => {
      const response = await apiClient.put<TaskCollection>(
        `/api/task-collections/${collectionId}`,
        data
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["taskCollections", data.child_id] });
      queryClient.invalidateQueries({ queryKey: ["taskCollection", data._id] });
    },
  });
};

export const useDeleteTaskCollection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (collectionId: string) => {
      await apiClient.delete(`/api/task-collections/${collectionId}`);
    },
    onSuccess: (_, collectionId) => {
      queryClient.invalidateQueries({ queryKey: ["taskCollections"] });
      queryClient.invalidateQueries({ queryKey: ["taskCollection", collectionId] });
    },
  });
};
