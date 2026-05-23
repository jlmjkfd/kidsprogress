import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TaskKind, type CreateTaskRequest, type RecurrenceRule } from '@kidsprogress/shared';
import { useCreateTask } from '../api/useTasks';

const WEEKDAYS: Array<'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU'> = [
  'MO',
  'TU',
  'WE',
  'TH',
  'FR',
  'SA',
  'SU',
];

interface Props {
  childId: string;
  onClose: () => void;
}

export function CreateTaskForm({ childId, onClose }: Props) {
  const { t } = useTranslation('tasks');
  const create = useCreateTask();

  const [title, setTitle] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [duration, setDuration] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [freq, setFreq] = useState<RecurrenceRule['freq']>('daily');
  const [interval, setInterval] = useState(1);
  const [byWeekday, setByWeekday] = useState<typeof WEEKDAYS>(['MO']);
  const [error, setError] = useState<string | null>(null);

  const toggleWeekday = (d: (typeof WEEKDAYS)[number]) => {
    setByWeekday((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let recurrenceRule: RecurrenceRule | undefined;
    if (isRecurring) {
      if (freq === 'daily') {
        recurrenceRule = { freq: 'daily', interval };
      } else if (freq === 'weekly') {
        if (byWeekday.length === 0) {
          setError(t('by_weekday'));
          return;
        }
        recurrenceRule = { freq: 'weekly', interval, byWeekday };
      } else {
        recurrenceRule = { freq: 'monthly', interval, byMonthday: [1] };
      }
    }

    const body: CreateTaskRequest = {
      childId,
      title,
      kind: TaskKind.Generic,
      isRecurring,
      ...(scheduledDate ? { scheduledDate } : {}),
      ...(duration ? { durationMinutes: Number.parseInt(duration, 10) } : {}),
      ...(recurrenceRule ? { recurrenceRule } : {}),
    };

    try {
      await create.mutateAsync(body);
      onClose();
    } catch {
      setError(t('save'));
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
    >
      <h3 className="mb-3 text-lg font-medium">{t('create_title')}</h3>
      <div className="space-y-3">
        <label className="block text-sm">
          <span className="mb-1 block text-slate-700">{t('task_title')}</span>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full min-h-[44px] rounded border border-slate-300 px-3 py-2"
          />
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isRecurring}
            onChange={(e) => setIsRecurring(e.target.checked)}
            className="h-5 w-5"
          />
          <span>{t('recurring')}</span>
        </label>

        {!isRecurring && (
          <label className="block text-sm">
            <span className="mb-1 block text-slate-700">{t('scheduled_date')}</span>
            <input
              type="date"
              required={!isRecurring}
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="w-full min-h-[44px] rounded border border-slate-300 px-3 py-2"
            />
          </label>
        )}

        {isRecurring && (
          <div className="space-y-3 rounded border border-slate-100 bg-slate-50 p-3">
            <label className="block text-sm">
              <span className="mb-1 block text-slate-700">{t('frequency')}</span>
              <select
                value={freq}
                onChange={(e) => setFreq(e.target.value as RecurrenceRule['freq'])}
                className="w-full min-h-[44px] rounded border border-slate-300 bg-white px-3 py-2"
              >
                <option value="daily">{t('freq_daily')}</option>
                <option value="weekly">{t('freq_weekly')}</option>
                <option value="monthly">{t('freq_monthly')}</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-700">{t('interval')}</span>
              <input
                type="number"
                min={1}
                value={interval}
                onChange={(e) => setInterval(Math.max(1, Number.parseInt(e.target.value || '1', 10)))}
                className="w-full min-h-[44px] rounded border border-slate-300 px-3 py-2"
              />
            </label>
            {freq === 'weekly' && (
              <div>
                <p className="mb-1 text-sm text-slate-700">{t('by_weekday')}</p>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleWeekday(d)}
                      className={`min-h-[44px] min-w-[44px] rounded border px-2 py-1 text-sm ${
                        byWeekday.includes(d)
                          ? 'border-slate-800 bg-slate-800 text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {t(`weekdays.${d}`)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <label className="block text-sm">
          <span className="mb-1 block text-slate-700">{t('duration_minutes')}</span>
          <input
            type="number"
            min={1}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="w-full min-h-[44px] rounded border border-slate-300 px-3 py-2"
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={create.isPending}
            className="min-h-[44px] flex-1 rounded bg-slate-800 px-3 py-2 text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {t('save')}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] flex-1 rounded border border-slate-300 px-3 py-2 hover:bg-slate-50"
          >
            {t('cancel')}
          </button>
        </div>
      </div>
    </form>
  );
}
