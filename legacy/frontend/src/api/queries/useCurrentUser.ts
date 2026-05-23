/**
 * Current user query
 */
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../client';
import { User } from '../../types/user';

export function useCurrentUser(enabled: boolean = true) {
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: async (): Promise<User> => {
      const response = await apiClient.get('/api/auth/me');
      return response.data;
    },
    enabled,
  });
}
