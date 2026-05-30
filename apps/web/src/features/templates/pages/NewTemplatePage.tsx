import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ParentShell } from '@/app/layouts/ParentShell';
import { useCreateTemplate } from '../hooks';

/**
 * Minimal generic-handler template creation form. Phase 7+ replaces this
 * with a handler-aware wizard that switches form shape based on the
 * selected handler. For v2.5 launch the only generally-useful surface is
 * the generic "checklist or simple completion" form.
 */
export function NewTemplatePage() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const create = useCreateTemplate();
  const [name, setName] = useState('');
  const [instructions, setInstructions] = useState('');
  const [error, setError] = useState<string | undefined>();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    create.mutate(
      {
        handlerId: 'generic',
        schemaVersion: 1,
        name: name.trim(),
        config: {
          steps: [],
          ...(instructions.trim() ? { instructions: instructions.trim() } : {}),
        },
      },
      {
        onSuccess: () => navigate('/parent/templates', { replace: true }),
        onError: () => setError('templates.create_failed'),
      },
    );
  };

  return (
    <ParentShell>
      <div className="max-w-xl mx-auto py-6 px-4 space-y-6">
        <h1 className="text-2xl font-display">{t('templates.new_title')}</h1>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm mb-1">
              {t('templates.field_name')}
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={1}
              maxLength={200}
              className="w-full min-h-touch rounded-2xl border border-text-muted/30 bg-surface p-3"
            />
          </div>
          <div>
            <label htmlFor="instructions" className="block text-sm mb-1">
              {t('templates.field_instructions')}
            </label>
            <textarea
              id="instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              maxLength={2000}
              rows={4}
              className="w-full rounded-2xl border border-text-muted/30 bg-surface p-3"
            />
            <p className="text-xs text-text-muted mt-1">
              {t('templates.field_instructions_hint')}
            </p>
          </div>
          {error && (
            <p role="alert" className="text-danger text-sm">
              {t(error)}
            </p>
          )}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={create.isPending || name.trim().length === 0}
              className="flex-1 min-h-touch rounded-2xl bg-accent text-white py-3 disabled:opacity-40"
            >
              {create.isPending ? t('common.loading') : t('templates.create_submit')}
            </button>
            <button
              type="button"
              onClick={() => navigate('/parent/templates')}
              className="px-6 min-h-touch rounded-2xl border border-text-muted/30"
            >
              {t('templates.create_cancel')}
            </button>
          </div>
        </form>
      </div>
    </ParentShell>
  );
}
