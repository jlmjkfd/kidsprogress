import { useTranslation } from 'react-i18next';
import type { CalendarItem } from '@/features/today/api';

interface WeekViewProps {
  /** Monday-anchored start of the week (00:00 local). */
  weekStart: Date;
  items: CalendarItem[];
  /** Index of the day cell the parent has tapped (0–6). null = none. */
  selectedIndex: number | null;
  onSelectDay: (idx: number) => void;
}

/**
 * Compact week strip showing a 7-column grid. Each column lists the day's
 * occurrences as colored chips (one per item, status-keyed). Tap a column
 * to surface the day's detail panel — same panel the MonthView uses, so
 * skip/reschedule actions are shared across views.
 *
 * v2.5 launch scope: no per-hour 7×24 grid. That's deferred to a later
 * polish pass; the parent's primary need is "what is this week looking
 * like" which the chip strip answers.
 */
export function WeekView({
  weekStart,
  items,
  selectedIndex,
  onSelectDay,
}: WeekViewProps) {
  const { i18n } = useTranslation('common');
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const dayFmt = new Intl.DateTimeFormat(
    i18n.language === 'zh' ? 'zh-CN' : 'en-US',
    { weekday: 'short' },
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const itemsByDay: CalendarItem[][] = days.map((d) =>
    items.filter((item) => {
      const iso =
        item.kind === 'materialized'
          ? item.occurrenceDate
          : ((item as unknown as { rescheduledTo?: string }).rescheduledTo ??
            item.originalDate);
      const at = new Date(iso);
      return (
        at.getFullYear() === d.getFullYear() &&
        at.getMonth() === d.getMonth() &&
        at.getDate() === d.getDate()
      );
    }),
  );

  const chipClass = (item: CalendarItem): string => {
    const status = item.kind === 'materialized' ? item.status : 'pending';
    switch (status) {
      case 'completed':
        return 'bg-success/15 text-success border border-success/40';
      case 'in_progress':
        return 'bg-accent/15 text-accent border border-accent/40';
      case 'skipped':
        return 'bg-text-muted/15 text-text-muted border border-text-muted/30';
      case 'abandoned':
        return 'bg-danger/15 text-danger border border-danger/40';
      case 'pending':
      default:
        return 'bg-bg border border-text-muted/30 text-text';
    }
  };

  return (
    <div role="grid" className="grid grid-cols-7 gap-1">
      {days.map((d, i) => {
        const isToday = d.getTime() === today.getTime();
        const isSelected = selectedIndex === i;
        return (
          <button
            key={d.toISOString()}
            type="button"
            onClick={() => onSelectDay(i)}
            role="gridcell"
            aria-current={isToday ? 'date' : undefined}
            aria-selected={isSelected}
            className={
              'min-h-[7rem] sm:min-h-[10rem] p-2 rounded-2xl text-left ' +
              'flex flex-col gap-1 transition-colors ' +
              (isSelected
                ? 'bg-accent text-white '
                : 'bg-surface hover:bg-surface-muted ') +
              (isToday && !isSelected ? 'ring-2 ring-accent ' : '')
            }
          >
            <div className="flex items-baseline justify-between">
              <span className="text-xs opacity-80">{dayFmt.format(d)}</span>
              <span className="text-sm font-medium">{d.getDate()}</span>
            </div>
            <div className="flex flex-col gap-1 overflow-hidden">
              {itemsByDay[i]!.slice(0, 4).map((item) => {
                const key =
                  item.kind === 'materialized'
                    ? item.instanceId
                    : `${item.assignmentId}|${item.originalDate}`;
                return (
                  <span
                    key={key}
                    className={
                      'truncate text-xs px-2 py-0.5 rounded-full ' +
                      (isSelected
                        ? 'bg-white/20 text-white border border-white/30'
                        : chipClass(item))
                    }
                  >
                    {new Date(
                      item.kind === 'materialized'
                        ? item.occurrenceDate
                        : ((item as unknown as { rescheduledTo?: string })
                            .rescheduledTo ?? item.originalDate),
                    ).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                );
              })}
              {itemsByDay[i]!.length > 4 && (
                <span className="text-xs opacity-70">
                  +{itemsByDay[i]!.length - 4}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
