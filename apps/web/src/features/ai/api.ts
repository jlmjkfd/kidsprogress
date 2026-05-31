import { apiClient } from '@/lib/apiClient';

interface AiStatus {
  accountEnabled: boolean;
  serverKeyConfigured: boolean;
}

interface WritingEvalResponse {
  feedback: string;
  totalTokens: number;
}

export const aiApi = {
  status: () => apiClient.get<AiStatus>('/api/ai/status'),
  writingEval: (req: { instanceId: string; text: string }) =>
    apiClient.post<WritingEvalResponse>('/api/ai/writing-eval', req),
  setAccountToggle: (enabled: boolean) =>
    apiClient.post('/api/auth/me/ai-features', { enabled }),
};
