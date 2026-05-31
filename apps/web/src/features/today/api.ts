import { apiClient } from '@/lib/apiClient';
import type { ProgressState, TaskSession } from '@kidsprogress/shared';

/**
 * One item on the calendar list. Returned by GET /api/scheduling/calendar.
 * The discriminator is `kind`: `materialized` rows carry a real
 * `instanceId` + a `status`; `virtual` rows only know their
 * `(assignmentId, originalDate)` key.
 */
export type CalendarItem =
  | {
      kind: 'materialized';
      instanceId: string;
      assignmentId: string;
      childId: string;
      originalDate: string;
      occurrenceDate: string;
      status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'abandoned';
    }
  | {
      kind: 'virtual';
      assignmentId: string;
      childId: string;
      originalDate: string;
    };

interface CalendarResponse {
  items: CalendarItem[];
}

interface TransitionResponse {
  id: string;
  assignmentId: string;
  childId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'abandoned';
  originalDate: string;
  occurrenceDate: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface InstanceRunPayload {
  instance: TransitionResponse & {
    effectiveTitle: string;
    effectiveDescription: string | null;
  };
  template: {
    id: string;
    handlerId: string;
    schemaVersion: number;
    pluginVersion: number;
    name: string;
    config: Record<string, unknown>;
  };
}

export const todayApi = {
  calendar: (childId: string, from: string, to: string) =>
    apiClient.get<CalendarResponse>(
      `/api/scheduling/calendar?childId=${childId}&from=${encodeURIComponent(
        from,
      )}&to=${encodeURIComponent(to)}`,
    ),

  transition: (req: {
    assignmentId: string;
    originalDate: string;
    occurrenceDate?: string;
    action: 'start' | 'complete' | 'skip' | 'abandon';
  }) => apiClient.post<TransitionResponse>('/api/instances/transition', req),

  /** Composite read for the kid's execution surface. */
  run: (instanceId: string) =>
    apiClient.get<InstanceRunPayload>(`/api/instances/${instanceId}/run`),

  /** Read the active session (resume). Returns null if there's none. */
  getSession: (instanceId: string) =>
    apiClient.get<TaskSession | null>(`/api/instances/${instanceId}/session`),

  saveSession: (
    instanceId: string,
    pluginVersion: number,
    progressState: ProgressState,
  ) =>
    apiClient.put<TaskSession>(`/api/instances/${instanceId}/session`, {
      pluginVersion,
      progressState,
    }),
};
