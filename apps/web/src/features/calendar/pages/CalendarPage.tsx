import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { ParentShell } from '@/app/layouts/ParentShell';
import { useChildrenList } from '@/features/children/hooks';
import { useTemplates } from '@/features/templates/hooks';
import { useCalendarRange } from '@/features/today/hooks';
import type { CalendarItem } from '@/features/today/api';

/**
 * Parent month-view calendar. Picks one child, expands their assignments
 * for the visible month via `/api/scheduling/calendar`, and renders a
 * 7-column grid with per-day occurrence counts. Tap a day → a panel
 * lists the occurrences (template name + status). Read-only for v2.5;
 * skip/reschedule actions land later.
 */
export function CalendarPage() {
  const { t, i18n } = useTranslation('common');
  const children = useChildrenList();
  const templates = useTemplates();
  const [childId, setChildId] = useState<string>('');
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  // Default to the first child once data lands.
  if (childId === '' && children.data && children.data.length > 0) {
    setChildId(children.data[0]!.id);
  }

  const { gridStart, gridEnd, monthLabel } = useMemo(() => {
    const start = new Date(cursor);
    // Walk back to the Sunday of the first row.
    start.setDate(1 - start.getDay());
    const end = new Date(start);
    end.setDate(end.getDate() + 41); // 6 weeks × 7 days
    end.setHours(23, 59, 59, 999);

    const label = new Intl.DateTimeFormat(
      i18n.language === 'zh' ? 'zh-CN' : 'en-US',
      { month: 'long', year: 'numeric' },
    ).format(cursor);
    return { gridStart: start, gridEnd: end, monthLabel: label };
  }, [cursor, i18n.language]);

  const cal = useCalendarRange(childId || null, gridStart, gridEnd);

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const item of cal.data ?? []) {
      const dateIso =
        item.kind === 'materialized' ? item.occurrenceDate : item.originalDate;
      const key = new Date(dateIso).toDateString();
      const existing = map.get(key) ?? [];
      existing.push(item);
      map.set(key, existing);
    }
    return map;
  }, [cal.data]);

  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const selectedItems =
    selectedDay !== null ? (byDay.get(selectedDay.toDateString()) ?? []) : [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    days.push(d);
  }

  const weekdayFmt = new Intl.DateTimeFormat(
    i18n.language === 'zh' ? 'zh-CN' : 'en-US',
    { weekday: 'short' },
  );

  const templateName = (id: string) =>
    templates.data?.find((tpl) => tpl.id === id)?.name ?? id.slice(0, 6);

  return (
    <ParentShell>
      <div className="max-w-5xl mx-auto py-6 px-4 space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-2xl font-display">{t('calendar.title')}</h1>
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
        </header>

        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              const c = new Date(cursor);
              c.setMonth(c.getMonth() - 1);
              setCursor(c);
              setSelectedDay(null);
            }}
            aria-label={t('calendar.previous_month')}
            className="p-2 rounded-full hover:bg-surface-muted min-h-touch min-w-touch"
          >
            <IconChevronLeft size={20} aria-hidden />
          </button>
          <h2 className="font-display text-lg">{monthLabel}</h2>
          <button
            type="button"
            onClick={() => {
              const c = new Date(cursor);
              c.setMonth(c.getMonth() + 1);
              setCursor(c);
              setSelectedDay(null);
            }}
            aria-label={t('calendar.next_month')}
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

        <div role="grid" aria-label={monthLabel} className="space-y-1">
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
                selectedDay !== null &&
                d.getTime() === selectedDay.getTime();
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
                  const tplId =
                    item.kind === 'materialized'
                      ? // We don't have templateId on the calendar item — use assignment for stability.
                        item.assignmentId
                      : item.assignmentId;
                  const status =
                    item.kind === 'materialized' ? item.status : 'pending';
                  return (
                    <li
                      key={`${tplId}-${idx}`}
                      className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-bg"
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {templateName(item.assignmentId)}
                        </p>
                        <p className="text-xs text-text-muted">
                          {t(`calendar.status_${status}`)}
                        </p>
                      </div>
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
