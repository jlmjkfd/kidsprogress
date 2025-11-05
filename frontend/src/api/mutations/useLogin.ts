/**
 * Login mutation
 */
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../client';
import { UserLogin, Token } from '../../types/user';

export function useLogin() {
  return useMutation({
    mutationFn: async (credentials: UserLogin): Promise<Token> => {
      const response = await apiClient.post('/api/auth/login', credentials);
      return response.data;
    },
  });
}
