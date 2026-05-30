import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateTaskTemplateRequest,
  TaskTemplate,
  UpdateTaskTemplateRequest,
} from '@kidsprogress/shared';
import { templatesApi } from './api';

export const templateKeys = {
  all: ['templates'] as const,
  list: () => [...templateKeys.all, 'list'] as const,
  detail: (id: string) => [...templateKeys.all, 'detail', id] as const,
};

export function useTemplates() {
  return useQuery({
    queryKey: templateKeys.list(),
    queryFn: () => templatesApi.list().then((r) => r.templates),
  });
}

export function useTemplate(id: string | null) {
  return useQuery({
    queryKey: templateKeys.detail(id ?? ''),
    queryFn: () => templatesApi.get(id!),
    enabled: id !== null,
  });
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation<TaskTemplate, Error, CreateTaskTemplateRequest>({
    mutationFn: (req) => templatesApi.create(req),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: templateKeys.list() });
    },
  });
}

export function useUpdateTemplate(id: string) {
  const qc = useQueryClient();
  return useMutation<TaskTemplate, Error, UpdateTaskTemplateRequest>({
    mutationFn: (patch) => templatesApi.update(id, patch),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: templateKeys.list() });
      void qc.invalidateQueries({ queryKey: templateKeys.detail(id) });
    },
  });
}

export function useArchiveTemplate() {
  const qc = useQueryClient();
  return useMutation<TaskTemplate, Error, string>({
    mutationFn: (id) => templatesApi.archive(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: templateKeys.list() });
    },
  });
}

export function useRestoreTemplate() {
  const qc = useQueryClient();
  return useMutation<TaskTemplate, Error, string>({
    mutationFn: (id) => templatesApi.restore(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: templateKeys.list() });
    },
  });
}
