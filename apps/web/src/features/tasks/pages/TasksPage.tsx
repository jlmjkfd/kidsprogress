import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IconCheck, IconPlayerPlay, IconPlayerSkipForward, IconPlus, IconTrash } from '@tabler/icons-react';
import { useChildren } from '@/features/children/api/useChildren';
import {
  useCompleteTask,
  useDeleteTask,
  useSkipTask,
  useStartTask,
  useTasksForChild,
} from '../api/useTasks';
import { CreateTaskForm } from '../components/CreateTaskForm';

export function TasksPage() {
  const { t } = useTranslation(['tasks', 'children']);
  const { data: children = [] } = useChildren();
  const [childId, setChildId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const selected = useMemo(() => childId ?? children[0]?.id ?? null, [childId, children]);
  const { data: tasks = [], isLoading } = useTasksForChild(selected ?? undefined);
  const start = useStartTask();
  const complete = useCompleteTask();
  const skip = useSkipTask();
  const del = useDeleteTask();

  if (children.length === 0) {
    return (
      <div className="mx-auto max-w-3xl p-4 sm:p-6">
        <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          {t('no_children_yet')}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold sm:text-2xl">{t('title')}</h1>
          <select
            value={selected ?? ''}
            onChange={(e) => setChildId(e.target.value)}
            className="min-h-[44px] rounded border border-slate-300 bg-white px-2 py-1 text-sm"
            aria-label={t('child')}
          >
            {children.map((c) => (
              <option key={c.id} value={c.id}>
                {c.displayName}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex min-h-[44px] items-center gap-1 rounded bg-slate-800 px-3 py-2 text-white hover:bg-slate-700"
        >
          <IconPlus size={18} aria-hidden />
          <span className="text-sm">{t('add')}</span>
        </button>
      </header>

      {showForm && selected && (
        <div className="mb-4">
          <CreateTaskForm childId={selected} onClose={() => setShowForm(false)} />
        </div>
      )}

      {isLoading && <p className="text-sm text-slate-500">…</p>}

      {!isLoading && tasks.length === 0 && (
        <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          {t('empty')}
        </p>
      )}

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {tasks.map((task) => (
          <li
            key={task.id}
            className="rounded-lg border border-slate-200 bg-white p-4"
          >
            <div className="mb-1 flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{task.title}</p>
                <p className="text-xs text-slate-500">
                  {task.isRecurring ? t('recurring') : (task.scheduledDate ?? '')} ·{' '}
                  {t(`status.${task.status}`)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(t('confirm_delete'))) del.mutate(task.id);
                }}
                className="min-h-[44px] min-w-[44px] rounded p-2 text-slate-500 hover:bg-slate-100 hover:text-red-600"
                aria-label={t('delete')}
                title={t('delete')}
              >
                <IconTrash size={16} aria-hidden />
              </button>
            </div>

            {!task.isRecurring && task.status === 'pending' && (
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => start.mutate(task.id)}
                  className="inline-flex min-h-[44px] items-center gap-1 rounded border border-slate-300 px-2 py-1 text-sm hover:bg-slate-50"
                >
                  <IconPlayerPlay size={16} aria-hidden />
                  {t('start')}
                </button>
                <button
                  type="button"
                  onClick={() => complete.mutate({ taskId: task.id, body: {} })}
                  className="inline-flex min-h-[44px] items-center gap-1 rounded bg-slate-800 px-2 py-1 text-sm text-white hover:bg-slate-700"
                >
                  <IconCheck size={16} aria-hidden />
                  {t('complete')}
                </button>
                <button
                  type="button"
                  onClick={() => skip.mutate({ taskId: task.id, body: {} })}
                  className="inline-flex min-h-[44px] items-center gap-1 rounded border border-slate-300 px-2 py-1 text-sm hover:bg-slate-50"
                >
                  <IconPlayerSkipForward size={16} aria-hidden />
                  {t('skip')}
                </button>
              </div>
            )}

            {!task.isRecurring && task.status === 'in_progress' && (
              <button
                type="button"
                onClick={() => complete.mutate({ taskId: task.id, body: {} })}
                className="mt-2 inline-flex min-h-[44px] items-center gap-1 rounded bg-slate-800 px-2 py-1 text-sm text-white hover:bg-slate-700"
              >
                <IconCheck size={16} aria-hidden />
                {t('complete')}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
