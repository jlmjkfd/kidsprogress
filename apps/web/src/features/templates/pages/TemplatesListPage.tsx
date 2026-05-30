import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { IconArchive, IconArchiveOff, IconPlus } from '@tabler/icons-react';
import { ParentShell } from '@/app/layouts/ParentShell';
import { useArchiveTemplate, useRestoreTemplate, useTemplates } from '../hooks';

export function TemplatesListPage() {
  const { t } = useTranslation('common');
  const templates = useTemplates();
  const archive = useArchiveTemplate();
  const restore = useRestoreTemplate();

  return (
    <ParentShell>
      <div className="max-w-3xl mx-auto py-6 px-4 space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-display">{t('templates.list_title')}</h1>
          <Link
            to="/parent/templates/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-accent text-white min-h-touch"
          >
            <IconPlus size={18} aria-hidden />
            {t('templates.new_button')}
          </Link>
        </header>

        {templates.isPending && <p className="text-text-muted">{t('common.loading')}</p>}
        {templates.isError && (
          <p role="alert" className="text-danger">
            {t('templates.list_failed')}
          </p>
        )}
        {templates.data && templates.data.length === 0 && (
          <p className="text-text-muted">{t('templates.empty')}</p>
        )}
        {templates.data && templates.data.length > 0 && (
          <ul className="space-y-3">
            {templates.data.map((tpl) => (
              <li
                key={tpl.id}
                className={
                  'flex items-center justify-between gap-4 p-4 rounded-2xl bg-surface ' +
                  (tpl.isArchived ? 'opacity-60' : '')
                }
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{tpl.name}</p>
                  <p className="text-xs text-text-muted">
                    {tpl.handlerId} · v{tpl.schemaVersion}
                    {tpl.isArchived && ` · ${t('templates.archived_badge')}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {tpl.isArchived ? (
                    <button
                      type="button"
                      onClick={() => restore.mutate(tpl.id)}
                      disabled={restore.isPending}
                      aria-label={t('templates.restore_button')}
                      className="p-2 rounded-full hover:bg-surface-muted min-h-touch min-w-touch"
                    >
                      <IconArchiveOff size={18} aria-hidden />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => archive.mutate(tpl.id)}
                      disabled={archive.isPending}
                      aria-label={t('templates.archive_button')}
                      className="p-2 rounded-full hover:bg-surface-muted min-h-touch min-w-touch"
                    >
                      <IconArchive size={18} aria-hidden />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </ParentShell>
  );
}
