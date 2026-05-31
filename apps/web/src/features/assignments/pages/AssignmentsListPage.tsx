import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IconTrash } from '@tabler/icons-react';
import { ParentShell } from '@/app/layouts/ParentShell';
import { useChildrenList } from '@/features/children/hooks';
import { useTemplates } from '@/features/templates/hooks';
import { useAssignments, useDeleteAssignment } from '../hooks';

/**
 * Parent view of every assignment in the family. Filter by child to see
 * "what is Mia working on?". Delete is a hard delete (the assignment's
 * task instances cascade-delete via the FK in the schema).
 */
export function AssignmentsListPage() {
  const { t } = useTranslation('common');
  const [filterChildId, setFilterChildId] = useState<string>('');
  const children = useChildrenList();
  const templates = useTemplates();
  const assignments = useAssignments(filterChildId || null);
  const del = useDeleteAssignment();

  const childName = (id: string) =>
    children.data?.find((c) => c.id === id)?.displayName ?? id.slice(0, 6);
  const templateName = (id: string) =>
    templates.data?.find((t) => t.id === id)?.name ?? id.slice(0, 6);

  return (
    <ParentShell>
      <div className="max-w-3xl mx-auto py-6 px-4 space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-2xl font-display">{t('assignments.list_title')}</h1>
          <select
            value={filterChildId}
            onChange={(e) => setFilterChildId(e.target.value)}
            aria-label={t('assignments.filter_by_child')}
            className="min-h-touch rounded-2xl border border-text-muted/30 bg-surface p-3"
          >
            <option value="">{t('assignments.all_children')}</option>
            {children.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.displayName}
              </option>
            ))}
          </select>
        </header>

        {assignments.isPending && <p className="text-text-muted">{t('common.loading')}</p>}
        {assignments.isError && (
          <p role="alert" className="text-danger">
            {t('assignments.load_failed')}
          </p>
        )}
        {assignments.data && assignments.data.length === 0 && (
          <p className="text-text-muted">{t('assignments.empty')}</p>
        )}
        {assignments.data && assignments.data.length > 0 && (
          <ul className="space-y-3">
            {assignments.data.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-surface"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">
                    {templateName(a.templateId)} → {childName(a.childId)}
                  </p>
                  <p className="text-xs text-text-muted">
                    {t('assignments.from_label')}{' '}
                    {new Date(a.effectiveFrom).toLocaleDateString()}
                    {a.rrule && ` · ${a.rrule}`}
                    {a.effectiveUntil &&
                      ` · ${t('assignments.until_label')} ${new Date(a.effectiveUntil).toLocaleDateString()}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => del.mutate(a.id)}
                  disabled={del.isPending}
                  aria-label={t('assignments.delete_button')}
                  className="p-2 rounded-full hover:bg-surface-muted min-h-touch min-w-touch text-danger"
                >
                  <IconTrash size={18} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </ParentShell>
  );
}
