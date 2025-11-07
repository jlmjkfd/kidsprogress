/**
 * Children query
 */
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../client';
import { Child } from '@types/child';

export function useChildren() {
  return useQuery({
    queryKey: ['children'],
    queryFn: async (): Promise<Child[]> => {
      const response = await apiClient.get('/api/children');
      return response.data;
    },
  });
}
