import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate } from 'react-router-dom';
import { IconCheck, IconPlayerPlay } from '@tabler/icons-react';
import { ChildShell } from '@/app/layouts/ChildShell';
import { useAuthStore } from '@/features/auth/store';
import { itemStatus, useTodayCalendar, useTransition } from '../hooks';

/**
 * Kid's "Today" — shows the calendar items materialized + virtual for the
 * current day. Tap an item to start it (materializes if virtual). Tap
 * again to mark complete.
 */
export function TodayPage() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const currentChild = useAuthStore((s) => s.currentChild);
  const childId = currentChild?.id ?? null;
  const cal = useTodayCalendar(childId);
  const transition = useTransition(childId);

  if (!currentChild) {
    return <Navigate to="/" replace />;
  }

  const onStart = (assignmentId: string, originalDate: string) =>
    transition.mutate(
      { assignmentId, originalDate, action: 'start' },
      {
        onSuccess: (row) => {
          const r = row as { id: string };
          navigate(`/today/execute/${r.id}`);
        },
      },
    );
  const onResume = (instanceId: string) => navigate(`/today/execute/${instanceId}`);
  const onComplete = (assignmentId: string, originalDate: string) =>
    transition.mutate({ assignmentId, originalDate, action: 'complete' });

  return (
    <ChildShell age={currentChild.ageBand}>
      <div className="max-w-2xl mx-auto py-6 px-4 space-y-6">
        <header>
          <h1 className="text-3xl font-display">
            {t('today.greeting', { name: currentChild.displayName })}
          </h1>
        </header>

        {cal.isPending && <p className="text-text-muted">{t('common.loading')}</p>}
        {cal.isError && (
          <p role="alert" className="text-danger">
            {t('today.load_failed')}
          </p>
        )}
        {cal.data && cal.data.length === 0 && (
          <p className="text-text-muted">{t('today.empty')}</p>
        )}
        {cal.data && cal.data.length > 0 && (
          <ul className="space-y-3">
            {cal.data.map((item) => {
              const status = itemStatus(item);
              const key =
                item.kind === 'materialized'
                  ? item.instanceId
                  : `${item.assignmentId}|${item.originalDate}`;
              return (
                <li
                  key={key}
                  className={
                    'p-4 rounded-3xl bg-surface flex items-center gap-3 ' +
                    (status === 'completed' ? 'opacity-60' : '')
                  }
                >
                  <span className="flex-1 font-medium">
                    {item.kind === 'materialized'
                      ? t('today.task_at', {
                          time: new Date(item.occurrenceDate).toLocaleTimeString(),
                        })
                      : t('today.task_at', {
                          time: new Date(item.originalDate).toLocaleTimeString(),
                        })}
                  </span>
                  {status === 'pending' && (
                    <button
                      type="button"
                      onClick={() => onStart(item.assignmentId, item.originalDate)}
                      disabled={transition.isPending}
                      aria-label={t('today.start')}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-accent text-white min-h-touch"
                    >
                      <IconPlayerPlay size={18} aria-hidden />
                      {t('today.start')}
                    </button>
                  )}
                  {status === 'in_progress' && item.kind === 'materialized' && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => onResume(item.instanceId)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl border border-text-muted/30 min-h-touch"
                      >
                        {t('today.resume')}
                      </button>
                      <button
                        type="button"
                        onClick={() => onComplete(item.assignmentId, item.originalDate)}
                        disabled={transition.isPending}
                        aria-label={t('today.complete')}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-success text-white min-h-touch"
                      >
                        <IconCheck size={18} aria-hidden />
                        {t('today.complete')}
                      </button>
                    </div>
                  )}
                  {status === 'completed' && (
                    <span className="text-success font-medium" aria-label={t('today.done')}>
                      ✓ {t('today.done')}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </ChildShell>
  );
}
