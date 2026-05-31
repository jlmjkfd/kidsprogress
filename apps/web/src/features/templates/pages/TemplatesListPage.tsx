import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  IconArchive,
  IconArchiveOff,
  IconEdit,
  IconPlus,
  IconUserPlus,
} from '@tabler/icons-react';
import { ParentShell } from '@/app/layouts/ParentShell';
import {
  useArchiveTemplate,
  useRestoreTemplate,
  useTemplates,
  useUpdateTemplate,
} from '../hooks';
import type { TaskTemplate } from '@kidsprogress/shared';

function TemplateEditRow(props: { template: TaskTemplate; onClose: () => void }) {
  const { t } = useTranslation('common');
  const [name, setName] = useState(props.template.name);
  const [description, setDescription] = useState(props.template.description ?? '');
  const update = useUpdateTemplate(props.template.id);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        update.mutate(
          {
            name: name.trim(),
            ...(description.trim() ? { description: description.trim() } : {}),
          },
          { onSuccess: () => props.onClose() },
        );
      }}
      className="p-4 rounded-2xl bg-surface space-y-3"
    >
      <h3 className="font-display text-lg">
        {t('templates.edit_title', { name: props.template.name })}
      </h3>
      <p className="text-xs text-text-muted">
        {t('templates.edit_handler_immutable', {
          handler: props.template.handlerId,
        })}
      </p>
      <div>
        <label htmlFor="t-edit-name" className="block text-sm mb-1">
          {t('templates.field_name')}
        </label>
        <input
          id="t-edit-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={1}
          maxLength={200}
          className="w-full min-h-touch rounded-2xl border border-text-muted/30 bg-bg p-3"
        />
      </div>
      <div>
        <label htmlFor="t-edit-desc" className="block text-sm mb-1">
          {t('templates.field_instructions')}
        </label>
        <textarea
          id="t-edit-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={2000}
          rows={3}
          className="w-full rounded-2xl border border-text-muted/30 bg-bg p-3"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={update.isPending || name.trim().length === 0}
          className="flex-1 min-h-touch rounded-2xl bg-accent text-white py-3 disabled:opacity-40"
        >
          {update.isPending ? t('common.loading') : t('common.save')}
        </button>
        <button
          type="button"
          onClick={props.onClose}
          className="px-6 min-h-touch rounded-2xl border border-text-muted/30"
        >
          {t('common.cancel')}
        </button>
      </div>
    </form>
  );
}

export function TemplatesListPage() {
  const { t } = useTranslation('common');
  const templates = useTemplates();
  const archive = useArchiveTemplate();
  const restore = useRestoreTemplate();
  const [editFor, setEditFor] = useState<string | null>(null);

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

        {editFor && templates.data && (
          (() => {
            const tpl = templates.data.find((t) => t.id === editFor);
            return tpl ? (
              <TemplateEditRow template={tpl} onClose={() => setEditFor(null)} />
            ) : null;
          })()
        )}

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
                  {!tpl.isArchived && (
                    <button
                      type="button"
                      onClick={() => setEditFor(tpl.id)}
                      aria-label={t('templates.edit_button')}
                      className="p-2 rounded-full hover:bg-surface-muted min-h-touch min-w-touch"
                    >
                      <IconEdit size={18} aria-hidden />
                    </button>
                  )}
                  {!tpl.isArchived && (
                    <Link
                      to={`/parent/templates/${tpl.id}/assign`}
                      aria-label={t('templates.assign_button')}
                      className="p-2 rounded-full hover:bg-surface-muted min-h-touch min-w-touch"
                    >
                      <IconUserPlus size={18} aria-hidden />
                    </Link>
                  )}
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
