/**
 * Create child mutation
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';
import { Child, ChildCreate } from '@types/child';

export function useCreateChild() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (childData: ChildCreate): Promise<Child> => {
      const response = await apiClient.post('/api/children', childData);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate children query to refetch the list
      queryClient.invalidateQueries({ queryKey: ['children'] });
    },
  });
}
