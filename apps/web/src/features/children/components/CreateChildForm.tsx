import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createChildRequestSchema } from '@kidsprogress/shared';
import { useCreateChild } from '../api/useChildren';

export function CreateChildForm({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation('children');
  const create = useCreateChild();
  const [displayName, setDisplayName] = useState('');
  const [grade, setGrade] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = createChildRequestSchema.safeParse({
      displayName,
      grade: grade || undefined,
      pin: pin || undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid input');
      return;
    }
    try {
      await create.mutateAsync(parsed.data);
      onClose();
    } catch {
      setError('Could not create child');
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
          <span className="mb-1 block text-slate-700">{t('display_name')}</span>
          <input
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full min-h-[44px] rounded border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-700">{t('grade')}</span>
          <input
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="w-full min-h-[44px] rounded border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-700">{t('pin')}</span>
          <input
            value={pin}
            inputMode="numeric"
            pattern="\d*"
            onChange={(e) => setPin(e.target.value)}
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
