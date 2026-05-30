import { apiClient } from '@/lib/apiClient';

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
};
