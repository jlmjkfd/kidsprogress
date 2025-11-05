/**
 * Register mutation
 */
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../client';
import { UserCreate, User } from '../../types/user';

export function useRegister() {
  return useMutation({
    mutationFn: async (userData: UserCreate): Promise<User> => {
      const response = await apiClient.post('/api/auth/register', userData);
      return response.data;
    },
  });
}
