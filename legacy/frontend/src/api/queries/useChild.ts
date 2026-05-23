import { useQuery } from '@tanstack/react-query';
import { Child } from '@/types/child';
import { apiClient } from '../client';

export function useChild(childId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['child', childId],
    queryFn: async (): Promise<Child> => {
      const response = await apiClient.get(`/api/children/${childId}`);
      return response.data;
    },
    enabled: enabled && !!childId,
  });
}
