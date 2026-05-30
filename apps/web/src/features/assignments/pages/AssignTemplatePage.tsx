import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ParentShell } from '@/app/layouts/ParentShell';
import { childrenApi } from '@/features/children/api';
import { useTemplate } from '@/features/templates/hooks';
import { assignmentsApi } from '../api';

/**
 * Phase 7/8 parent flow: pick a child, set effective-from + (optional)
 * daily recurrence count, assign. v2.5 launch leans on one-shot + DAILY
 * recurrence; richer rrules come later via a dedicated picker.
 */
export function AssignTemplatePage() {
  const { templateId = '' } = useParams<{ templateId: string }>();
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const qc = useQueryClient();
  const template = useTemplate(templateId || null);
  const children = useQuery({
    queryKey: ['children', 'list'],
    queryFn: () => childrenApi.list().then((r) => r.children),
  });

  const [childId, setChildId] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [repeatDays, setRepeatDays] = useState(0);
  const [error, setError] = useState<string | undefined>();

  const assign = useMutation({
    mutationFn: () =>
      assignmentsApi.create({
        templateId,
        childId,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        effectiveFrom: new Date(`${effectiveFrom}T08:00:00`).toISOString(),
        schedulingType: 'flexible',
        obligation: 'required',
        ...(repeatDays > 0
          ? { rrule: `FREQ=DAILY;COUNT=${repeatDays}` }
          : {}),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['assignments'] });
      navigate('/parent/templates', { replace: true });
    },
    onError: () => setError('assign.failed'),
  });

  if (template.isPending || children.isPending) {
    return (
      <ParentShell>
        <p className="text-text-muted p-6">{t('common.loading')}</p>
      </ParentShell>
    );
  }
  if (template.isError || children.isError) {
    return (
      <ParentShell>
        <p role="alert" className="text-danger p-6">
          {t('assign.load_failed')}
        </p>
      </ParentShell>
    );
  }
  const childList = children.data ?? [];

  return (
    <ParentShell>
      <div className="max-w-xl mx-auto py-6 px-4 space-y-6">
        <h1 className="text-2xl font-display">
          {t('assign.title', { name: template.data.name })}
        </h1>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(undefined);
            if (!childId) {
              setError('assign.child_required');
              return;
            }
            assign.mutate();
          }}
          className="space-y-4"
        >
          <div>
            <label htmlFor="child" className="block text-sm mb-1">
              {t('assign.child_label')}
            </label>
            <select
              id="child"
              value={childId}
              onChange={(e) => setChildId(e.target.value)}
              className="w-full min-h-touch rounded-2xl border border-text-muted/30 bg-surface p-3"
            >
              <option value="">{t('assign.child_placeholder')}</option>
              {childList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.displayName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="effective" className="block text-sm mb-1">
              {t('assign.start_date_label')}
            </label>
            <input
              id="effective"
              type="date"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
              className="w-full min-h-touch rounded-2xl border border-text-muted/30 bg-surface p-3"
              required
            />
          </div>

          <div>
            <label htmlFor="repeat" className="block text-sm mb-1">
              {t('assign.repeat_label')}
            </label>
            <input
              id="repeat"
              type="number"
              min={0}
              max={365}
              value={repeatDays}
              onChange={(e) => setRepeatDays(Number(e.target.value))}
              className="w-full min-h-touch rounded-2xl border border-text-muted/30 bg-surface p-3"
            />
            <p className="text-xs text-text-muted mt-1">{t('assign.repeat_hint')}</p>
          </div>

          {error && (
            <p role="alert" className="text-danger text-sm">
              {t(error)}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={assign.isPending}
              className="flex-1 min-h-touch rounded-2xl bg-accent text-white py-3 disabled:opacity-40"
            >
              {assign.isPending ? t('common.loading') : t('assign.submit')}
            </button>
            <button
              type="button"
              onClick={() => navigate('/parent/templates')}
              className="px-6 min-h-touch rounded-2xl border border-text-muted/30"
            >
              {t('assign.cancel')}
            </button>
          </div>
        </form>
      </div>
    </ParentShell>
  );
}
