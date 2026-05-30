import { apiClient } from '@/lib/apiClient';
import type {
  CreateTaskTemplateRequest,
  TaskTemplate,
  UpdateTaskTemplateRequest,
} from '@kidsprogress/shared';

interface TemplatesListResponse {
  templates: TaskTemplate[];
}

export const templatesApi = {
  list: () => apiClient.get<TemplatesListResponse>('/api/templates'),
  get: (id: string) => apiClient.get<TaskTemplate>(`/api/templates/${id}`),
  create: (req: CreateTaskTemplateRequest) =>
    apiClient.post<TaskTemplate>('/api/templates', req),
  update: (id: string, patch: UpdateTaskTemplateRequest) =>
    apiClient.patch<TaskTemplate>(`/api/templates/${id}`, patch),
  archive: (id: string) =>
    apiClient.post<TaskTemplate>(`/api/templates/${id}/archive`),
  restore: (id: string) =>
    apiClient.post<TaskTemplate>(`/api/templates/${id}/restore`),
};
