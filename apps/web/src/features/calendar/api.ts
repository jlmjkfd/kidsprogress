import { apiClient } from '@/lib/apiClient';

interface ExceptionResponse {
  assignmentId: string;
  occurrenceDate: string;
  action: 'skip' | 'reschedule' | 'override' | 'materialized';
  rescheduledTo: string | null;
}

export type ExceptionAction =
  | { assignmentId: string; originalDate: string; action: 'skip' }
  | {
      assignmentId: string;
      originalDate: string;
      action: 'reschedule';
      rescheduledTo: string;
    };

export const calendarExceptionsApi = {
  apply: (req: ExceptionAction) =>
    apiClient.post<ExceptionResponse>('/api/scheduling/exceptions', req),
  remove: (assignmentId: string, originalDate: string) =>
    apiClient.delete(
      `/api/scheduling/exceptions?assignmentId=${assignmentId}&originalDate=${encodeURIComponent(originalDate)}`,
    ),
};
