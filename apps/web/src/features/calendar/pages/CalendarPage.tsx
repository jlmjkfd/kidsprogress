import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  IconArrowsExchange,
  IconChevronLeft,
  IconChevronRight,
  IconX,
} from '@tabler/icons-react';
import { ParentShell } from '@/app/layouts/ParentShell';
import { useChildrenList } from '@/features/children/hooks';
import { useTemplates } from '@/features/templates/hooks';
import { useCalendarRange } from '@/features/today/hooks';
import type { CalendarItem } from '@/features/today/api';
import { todayKeys } from '@/features/today/hooks';
import { calendarExceptionsApi } from '../api';
import { WeekView } from '../components/WeekView';

type ViewMode = 'month' | 'week';

/**
 * Parent calendar — Month + Week views over the same data. Day-detail
 * panel reuses the same component for both modes. Per-occurrence Skip and
 * Reschedule actions hit `/api/scheduling/exceptions` and invalidate the
 * cache so the view repaints immediately.
 */
export function CalendarPage() {
  const { t, i18n } = useTranslation('common');
  const qc = useQueryClient();
  const children = useChildrenList();
  const templates = useTemplates();
  const [childId, setChildId] = useState<string>('');
  const [view, setView] = useState<ViewMode>('month');
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    if (view === 'month') d.setDate(1);
    return d;
  });

  if (childId === '' && children.data && children.data.length > 0) {
    setChildId(children.data[0]!.id);
  }

  const { gridStart, gridEnd, label } = useMemo(() => {
    if (view === 'month') {
      const monthStart = new Date(cursor);
      monthStart.setDate(1);
      const start = new Date(monthStart);
      start.setDate(1 - start.getDay()); // back to the Sunday before
      const end = new Date(start);
      end.setDate(end.getDate() + 41); // 6 weeks × 7 days
      end.setHours(23, 59, 59, 999);
      const lbl = new Intl.DateTimeFormat(
        i18n.language === 'zh' ? 'zh-CN' : 'en-US',
        { month: 'long', year: 'numeric' },
      ).format(monthStart);
      return { gridStart: start, gridEnd: end, label: lbl };
    }
    // week
    const start = new Date(cursor);
    start.setDate(start.getDate() - start.getDay());
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    const lbl =
      new Intl.DateTimeFormat(i18n.language === 'zh' ? 'zh-CN' : 'en-US', {
        month: 'short',
        day: 'numeric',
      }).format(start) +
      ' – ' +
      new Intl.DateTimeFormat(i18n.language === 'zh' ? 'zh-CN' : 'en-US', {
        month: 'short',
        day: 'numeric',
      }).format(end);
    return { gridStart: start, gridEnd: end, label: lbl };
  }, [cursor, view, i18n.language]);

  const cal = useCalendarRange(childId || null, gridStart, gridEnd);

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const item of cal.data ?? []) {
      const iso =
        item.kind === 'materialized'
          ? item.occurrenceDate
          : ((item as unknown as { rescheduledTo?: string }).rescheduledTo ??
            item.originalDate);
      const key = new Date(iso).toDateString();
      const existing = map.get(key) ?? [];
      existing.push(item);
      map.set(key, existing);
    }
    return map;
  }, [cal.data]);

  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const selectedItems =
    selectedDay !== null ? (byDay.get(selectedDay.toDateString()) ?? []) : [];

  // Cache invalidation helper — burn every calendar query for this child.
  const invalidate = () => {
    if (childId) {
      void qc.invalidateQueries({
        queryKey: [...todayKeys.all, 'calendar', childId],
      });
    }
  };

  const skipMut = useMutation({
    mutationFn: (args: { assignmentId: string; originalDate: string }) =>
      calendarExceptionsApi.apply({
        ...args,
        action: 'skip',
      }),
    onSuccess: () => invalidate(),
  });

  const rescheduleMut = useMutation({
    mutationFn: (args: {
      assignmentId: string;
      originalDate: string;
      rescheduledTo: string;
    }) =>
      calendarExceptionsApi.apply({
        ...args,
        action: 'reschedule',
      }),
    onSuccess: () => invalidate(),
  });

  const undoMut = useMutation({
    mutationFn: (args: { assignmentId: string; originalDate: string }) =>
      calendarExceptionsApi.remove(args.assignmentId, args.originalDate),
    onSuccess: () => invalidate(),
  });

  const stepCursor = (delta: number) => {
    const c = new Date(cursor);
    if (view === 'month') c.setMonth(c.getMonth() + delta);
    else c.setDate(c.getDate() + delta * 7);
    setCursor(c);
    setSelectedDay(null);
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const templateName = (id: string) =>
    templates.data?.find((tpl) => tpl.id === id)?.name ?? id.slice(0, 6);

  return (
    <ParentShell>
      <div className="max-w-5xl mx-auto py-6 px-4 space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-2xl font-display">{t('calendar.title')}</h1>
          <div className="flex gap-2">
            <select
              value={childId}
              onChange={(e) => {
                setChildId(e.target.value);
                setSelectedDay(null);
              }}
              aria-label={t('calendar.child_picker')}
              className="min-h-touch rounded-2xl border border-text-muted/30 bg-surface p-3"
            >
              {(children.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.displayName}
                </option>
              ))}
              {(children.data ?? []).length === 0 && (
                <option value="">{t('calendar.no_children')}</option>
              )}
            </select>
            <div
              role="tablist"
              aria-label={t('calendar.view_switcher')}
              className="inline-flex rounded-2xl border border-text-muted/30 overflow-hidden"
            >
              {(['month', 'week'] as ViewMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={view === m}
                  onClick={() => {
                    setView(m);
                    setSelectedDay(null);
                  }}
                  className={
                    'px-4 min-h-touch text-sm ' +
                    (view === m
                      ? 'bg-accent text-white'
                      : 'bg-surface hover:bg-surface-muted')
                  }
                >
                  {t(`calendar.view_${m}`)}
                </button>
              ))}
            </div>
          </div>
        </header>

        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => stepCursor(-1)}
            aria-label={
              view === 'month'
                ? t('calendar.previous_month')
                : t('calendar.previous_week')
            }
            className="p-2 rounded-full hover:bg-surface-muted min-h-touch min-w-touch"
          >
            <IconChevronLeft size={20} aria-hidden />
          </button>
          <h2 className="font-display text-lg">{label}</h2>
          <button
            type="button"
            onClick={() => stepCursor(1)}
            aria-label={
              view === 'month'
                ? t('calendar.next_month')
                : t('calendar.next_week')
            }
            className="p-2 rounded-full hover:bg-surface-muted min-h-touch min-w-touch"
          >
            <IconChevronRight size={20} aria-hidden />
          </button>
        </div>

        {cal.isError && (
          <p role="alert" className="text-danger">
            {t('calendar.load_failed')}
          </p>
        )}

        {view === 'month' && <MonthGrid {...{ cursor, byDay, selectedDay, setSelectedDay, today, label, i18n }} />}
        {view === 'week' && (
          <WeekView
            weekStart={gridStart}
            items={cal.data ?? []}
            selectedIndex={
              selectedDay
                ? Math.floor(
                    (selectedDay.getTime() - gridStart.getTime()) / 86_400_000,
                  )
                : null
            }
            onSelectDay={(i) => {
              const d = new Date(gridStart);
              d.setDate(d.getDate() + i);
              setSelectedDay(d);
            }}
          />
        )}

        {selectedDay && (
          <section
            aria-live="polite"
            className="p-4 rounded-3xl bg-surface space-y-3"
          >
            <h3 className="font-display text-lg">
              {new Intl.DateTimeFormat(
                i18n.language === 'zh' ? 'zh-CN' : 'en-US',
                { weekday: 'long', month: 'long', day: 'numeric' },
              ).format(selectedDay)}
            </h3>
            {selectedItems.length === 0 ? (
              <p className="text-text-muted text-sm">{t('calendar.day_empty')}</p>
            ) : (
              <ul className="space-y-2">
                {selectedItems.map((item, idx) => {
                  const status =
                    item.kind === 'materialized' ? item.status : 'pending';
                  const isRescheduled =
                    item.kind === 'virtual' &&
                    (item as unknown as { rescheduledTo?: string })
                      .rescheduledTo;
                  const canMutate =
                    item.kind === 'virtual' && status === 'pending';
                  return (
                    <li
                      key={`${item.assignmentId}-${idx}`}
                      className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-bg"
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {templateName(item.assignmentId)}
                        </p>
                        <p className="text-xs text-text-muted">
                          {t(`calendar.status_${status}`)}
                          {isRescheduled && ` · ${t('calendar.rescheduled_badge')}`}
                        </p>
                      </div>
                      {canMutate && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              const orig = item.originalDate;
                              const newDate = window.prompt(
                                t('calendar.reschedule_prompt'),
                                new Date(orig).toISOString().slice(0, 10),
                              );
                              if (!newDate) return;
                              // Reuse the time-of-day from the original.
                              const base = new Date(orig);
                              const [yyyy, mm, dd] = newDate.split('-');
                              if (!yyyy || !mm || !dd) return;
                              const next = new Date(base);
                              next.setUTCFullYear(
                                Number(yyyy),
                                Number(mm) - 1,
                                Number(dd),
                              );
                              rescheduleMut.mutate({
                                assignmentId: item.assignmentId,
                                originalDate: orig,
                                rescheduledTo: next.toISOString(),
                              });
                            }}
                            disabled={rescheduleMut.isPending}
                            aria-label={t('calendar.reschedule_button')}
                            className="p-2 rounded-full hover:bg-surface-muted min-h-touch min-w-touch"
                          >
                            <IconArrowsExchange size={18} aria-hidden />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              skipMut.mutate({
                                assignmentId: item.assignmentId,
                                originalDate: item.originalDate,
                              })
                            }
                            disabled={skipMut.isPending}
                            aria-label={t('calendar.skip_button')}
                            className="p-2 rounded-full hover:bg-surface-muted min-h-touch min-w-touch text-danger"
                          >
                            <IconX size={18} aria-hidden />
                          </button>
                        </div>
                      )}
                      {isRescheduled && (
                        <button
                          type="button"
                          onClick={() =>
                            undoMut.mutate({
                              assignmentId: item.assignmentId,
                              originalDate: item.originalDate,
                            })
                          }
                          disabled={undoMut.isPending}
                          className="text-xs underline text-accent"
                        >
                          {t('calendar.undo_button')}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}
      </div>
    </ParentShell>
  );
}

function MonthGrid(props: {
  cursor: Date;
  byDay: Map<string, CalendarItem[]>;
  selectedDay: Date | null;
  setSelectedDay: (d: Date | null) => void;
  today: Date;
  label: string;
  i18n: { language: string };
}) {
  const { t } = useTranslation('common');
  const { cursor, byDay, selectedDay, setSelectedDay, today, label, i18n } = props;

  const monthStart = new Date(cursor);
  monthStart.setDate(1);
  const start = new Date(monthStart);
  start.setDate(1 - start.getDay());

  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }

  const weekdayFmt = new Intl.DateTimeFormat(
    i18n.language === 'zh' ? 'zh-CN' : 'en-US',
    { weekday: 'short' },
  );

  return (
    <div role="grid" aria-label={label} className="space-y-1">
      <div role="row" className="grid grid-cols-7 text-xs text-text-muted">
        {days.slice(0, 7).map((d) => (
          <div key={d.toISOString()} role="columnheader" className="px-2 py-1">
            {weekdayFmt.format(d)}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const inMonth = d.getMonth() === cursor.getMonth();
          const isToday = d.getTime() === today.getTime();
          const items = byDay.get(d.toDateString()) ?? [];
          const isSelected =
            selectedDay !== null && d.getTime() === selectedDay.getTime();
          return (
            <button
              key={d.toISOString()}
              type="button"
              onClick={() => setSelectedDay(d)}
              role="gridcell"
              aria-current={isToday ? 'date' : undefined}
              aria-selected={isSelected}
              className={
                'h-20 sm:h-24 p-2 rounded-2xl text-left flex flex-col gap-1 ' +
                'transition-colors ' +
                (isSelected
                  ? 'bg-accent text-white '
                  : inMonth
                    ? 'bg-surface hover:bg-surface-muted '
                    : 'bg-surface/50 text-text-muted hover:bg-surface-muted ') +
                (isToday && !isSelected ? 'ring-2 ring-accent ' : '')
              }
            >
              <span className="text-sm font-medium">{d.getDate()}</span>
              {items.length > 0 && (
                <span
                  className={
                    'text-xs ' +
                    (isSelected ? 'opacity-90' : 'text-accent font-medium')
                  }
                >
                  {t('calendar.count_tasks', { count: items.length })}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
