import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { todayApi, type CalendarItem } from './api';

export const todayKeys = {
  all: ['today'] as const,
  calendar: (childId: string, from: string, to: string) =>
    [...todayKeys.all, 'calendar', childId, from, to] as const,
};

/** Calendar window covering one local calendar day. */
export function dayRange(day: Date = new Date()): { from: string; to: string } {
  const start = new Date(day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(day);
  end.setHours(23, 59, 59, 999);
  return { from: start.toISOString(), to: end.toISOString() };
}

/** Inclusive multi-day range — used by the parent MonthView. */
export function rangeFor(from: Date, to: Date): { from: string; to: string } {
  const lo = new Date(from);
  lo.setHours(0, 0, 0, 0);
  const hi = new Date(to);
  hi.setHours(23, 59, 59, 999);
  return { from: lo.toISOString(), to: hi.toISOString() };
}

export function useTodayCalendar(childId: string | null, day: Date = new Date()) {
  const { from, to } = dayRange(day);
  return useQuery({
    queryKey: todayKeys.calendar(childId ?? '', from, to),
    queryFn: () => todayApi.calendar(childId!, from, to).then((r) => r.items),
    enabled: childId !== null,
    staleTime: 30_000,
  });
}

export function useCalendarRange(
  childId: string | null,
  from: Date,
  to: Date,
) {
  const range = rangeFor(from, to);
  return useQuery({
    queryKey: todayKeys.calendar(childId ?? '', range.from, range.to),
    queryFn: () =>
      todayApi.calendar(childId!, range.from, range.to).then((r) => r.items),
    enabled: childId !== null,
    staleTime: 60_000,
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
