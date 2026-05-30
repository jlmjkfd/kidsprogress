import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { todayApi, type CalendarItem } from './api';

export const todayKeys = {
  all: ['today'] as const,
  calendar: (childId: string, from: string, to: string) =>
    [...todayKeys.all, 'calendar', childId, from, to] as const,
};

/** Calendar window for the kid's "today" — start-of-day → end-of-day local. */
export function dayRange(now: Date = new Date()): { from: string; to: string } {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return { from: start.toISOString(), to: end.toISOString() };
}

export function useTodayCalendar(childId: string | null) {
  const { from, to } = dayRange();
  return useQuery({
    queryKey: todayKeys.calendar(childId ?? '', from, to),
    queryFn: () => todayApi.calendar(childId!, from, to).then((r) => r.items),
    enabled: childId !== null,
    staleTime: 30_000,
  });
}

export function useTransition(childId: string | null) {
  const qc = useQueryClient();
  return useMutation<
    unknown,
    Error,
    {
      assignmentId: string;
      originalDate: string;
      action: 'start' | 'complete' | 'skip' | 'abandon';
    }
  >({
    mutationFn: (req) => todayApi.transition(req),
    onSuccess: () => {
      if (childId) {
        // Invalidate every calendar window for this child.
        void qc.invalidateQueries({
          queryKey: [...todayKeys.all, 'calendar', childId],
        });
      }
    },
  });
}

export function itemStatus(item: CalendarItem): 'pending' | 'in_progress' | 'completed' | 'skipped' | 'abandoned' {
  return item.kind === 'materialized' ? item.status : 'pending';
}
