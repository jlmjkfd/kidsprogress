import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { useChildren, useDeleteChild } from '../api/useChildren';
import { CreateChildForm } from '../components/CreateChildForm';

export function ChildrenPage() {
  const { t } = useTranslation('children');
  const { data: children = [], isLoading } = useChildren();
  const del = useDeleteChild();
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold sm:text-2xl">{t('title')}</h1>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex min-h-[44px] items-center gap-1 rounded bg-slate-800 px-3 py-2 text-white hover:bg-slate-700"
          aria-label={t('add')}
        >
          <IconPlus size={18} aria-hidden />
          <span className="text-sm">{t('add')}</span>
        </button>
      </header>

      {showForm && (
        <div className="mb-4">
          <CreateChildForm onClose={() => setShowForm(false)} />
        </div>
      )}

      {isLoading && <p className="text-sm text-slate-500">…</p>}

      {!isLoading && children.length === 0 && (
        <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          {t('empty')}
        </p>
      )}

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {children.map((c) => (
          <li
            key={c.id}
            className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4"
          >
            <div>
              <p className="font-medium">{c.displayName}</p>
              {c.grade && <p className="text-sm text-slate-500">{c.grade}</p>}
            </div>
            <button
              type="button"
              onClick={() => {
                if (window.confirm(t('confirm_delete'))) del.mutate(c.id);
              }}
              className="min-h-[44px] min-w-[44px] rounded p-2 text-slate-500 hover:bg-slate-100 hover:text-red-600"
              aria-label={t('delete')}
              title={t('delete')}
            >
              <IconTrash size={18} aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
