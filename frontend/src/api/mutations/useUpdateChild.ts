/**
 * Update child mutation
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';
import { Child } from '../../types/child';

interface UpdateChildParams {
  childId: string;
  name: string;
  date_of_birth: string;
  language?: string;
  pin_required?: boolean;
  pin?: string;
}

export function useUpdateChild() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: UpdateChildParams): Promise<Child> => {
      const { childId, ...childData } = params;
      const response = await apiClient.put(`/api/children/${childId}`, childData);
      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate children list
      queryClient.invalidateQueries({ queryKey: ['children'] });
      // Invalidate specific child
      queryClient.invalidateQueries({ queryKey: ['child', data._id] });
    },
  });
}
