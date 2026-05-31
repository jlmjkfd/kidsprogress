import { useTranslation } from 'react-i18next';

interface WeekStripProps {
  /** Currently selected day (local time). */
  selected: Date;
  onSelect: (d: Date) => void;
}

/**
 * Seven-day chip strip — yesterday/today/tomorrow context the kid can tap.
 * Centred on `selected`; today is always highlighted with a ring so a kid
 * scrolling forward knows where "now" is.
 */
export function WeekStrip({ selected, onSelect }: WeekStripProps) {
  const { i18n } = useTranslation('common');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(selected);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 3);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });

  const fmtDay = new Intl.DateTimeFormat(i18n.language === 'zh' ? 'zh-CN' : 'en-US', {
    weekday: 'short',
  });

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  return (
    <nav
      className="flex justify-between gap-1"
      aria-label={i18n.language === 'zh' ? '选择日期' : 'Pick a day'}
    >
      {days.map((d) => {
        const isSelected = sameDay(d, selected);
        const isToday = sameDay(d, today);
        return (
          <button
            key={d.toISOString()}
            type="button"
            onClick={() => onSelect(d)}
            aria-pressed={isSelected}
            aria-current={isToday ? 'date' : undefined}
            className={
              'flex flex-col items-center justify-center gap-0.5 ' +
              'flex-1 min-h-touch rounded-2xl transition-colors ' +
              (isSelected
                ? 'bg-accent text-white shadow-md'
                : 'bg-surface hover:bg-surface-muted ') +
              (isToday && !isSelected ? ' ring-2 ring-accent' : '')
            }
          >
            <span className="text-xs opacity-80">{fmtDay.format(d)}</span>
            <span className="text-lg font-display leading-none">{d.getDate()}</span>
          </button>
        );
      })}
    </nav>
  );
}
