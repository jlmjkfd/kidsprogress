import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../client';

interface VerifyPinRequest {
  childId: string;
  pin: string;
}

interface VerifyPinResponse {
  valid: boolean;
}

export function useVerifyChildPin() {
  return useMutation({
    mutationFn: async ({ childId, pin }: VerifyPinRequest): Promise<boolean> => {
      const response = await apiClient.post<VerifyPinResponse>(
        `/api/children/${childId}/verify-pin`,
        { pin }
      );
      return response.data.valid;
    },
  });
}
