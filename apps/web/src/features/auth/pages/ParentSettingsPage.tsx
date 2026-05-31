import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ParentShell } from '@/app/layouts/ParentShell';
import { authApi } from '../api';
import { aiApi } from '@/features/ai/api';

/**
 * Parent account settings. v2.5 scope:
 *  - View display name + email
 *  - Set or change the parent-portal PIN (used by view-as-child + other
 *    sensitive re-gates that land in Phase 14+).
 */
export function ParentSettingsPage() {
  const { t } = useTranslation('common');
  const qc = useQueryClient();
  const me = useQuery({
    queryKey: ['parent', 'me'],
    queryFn: () => authApi.parentMe(),
  });
  const aiStatus = useQuery({
    queryKey: ['ai', 'status'],
    queryFn: () => aiApi.status(),
  });
  const setAi = useMutation({
    mutationFn: (enabled: boolean) => aiApi.setAccountToggle(enabled),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['parent', 'me'] });
      void qc.invalidateQueries({ queryKey: ['ai', 'status'] });
    },
  });
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [ok, setOk] = useState(false);

  const setPinMut = useMutation({
    mutationFn: (p: string) => authApi.setParentPortalPin(p),
    onSuccess: () => {
      setOk(true);
      setPin('');
      setConfirm('');
      void me.refetch();
      setTimeout(() => setOk(false), 2500);
    },
    onError: () => setError('settings.pin_failed'),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    if (!/^\d{4,6}$/.test(pin)) {
      setError('settings.pin_invalid');
      return;
    }
    if (pin !== confirm) {
      setError('settings.pin_mismatch');
      return;
    }
    setPinMut.mutate(pin);
  };

  return (
    <ParentShell>
      <div className="max-w-xl mx-auto py-6 px-4 space-y-6">
        <h1 className="text-2xl font-display">{t('settings.title')}</h1>

        {me.isPending && <p className="text-text-muted">{t('common.loading')}</p>}
        {me.data && (
          <section className="p-4 rounded-3xl bg-surface space-y-1">
            <h2 className="font-display text-lg">{t('settings.account_title')}</h2>
            <p className="text-sm">
              <span className="text-text-muted">{t('settings.name_label')}: </span>
              {me.data.displayName}
            </p>
            <p className="text-sm">
              <span className="text-text-muted">{t('settings.email_label')}: </span>
              {me.data.email}
            </p>
          </section>
        )}

        <section className="p-4 rounded-3xl bg-surface space-y-3">
          <h2 className="font-display text-lg">{t('settings.pin_title')}</h2>
          <p className="text-sm text-text-muted">
            {me.data?.hasParentPortalPin
              ? t('settings.pin_already_set')
              : t('settings.pin_not_set')}
          </p>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label htmlFor="pin-new" className="block text-sm mb-1">
                {t('settings.pin_new_label')}
              </label>
              <input
                id="pin-new"
                type="password"
                inputMode="numeric"
                pattern="\d{4,6}"
                value={pin}
                onChange={(e) =>
                  setPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))
                }
                className="w-full min-h-touch rounded-2xl border border-text-muted/30 bg-bg p-3 font-mono text-center text-xl tracking-widest"
              />
            </div>
            <div>
              <label htmlFor="pin-confirm" className="block text-sm mb-1">
                {t('settings.pin_confirm_label')}
              </label>
              <input
                id="pin-confirm"
                type="password"
                inputMode="numeric"
                pattern="\d{4,6}"
                value={confirm}
                onChange={(e) =>
                  setConfirm(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))
                }
                className="w-full min-h-touch rounded-2xl border border-text-muted/30 bg-bg p-3 font-mono text-center text-xl tracking-widest"
              />
            </div>
            {error && (
              <p role="alert" className="text-danger text-sm">
                {t(error)}
              </p>
            )}
            {ok && (
              <p role="status" className="text-success text-sm">
                {t('settings.pin_saved')}
              </p>
            )}
            <button
              type="submit"
              disabled={setPinMut.isPending}
              className="w-full min-h-touch rounded-2xl bg-accent text-white py-3 disabled:opacity-40"
            >
              {setPinMut.isPending ? t('common.loading') : t('settings.pin_save')}
            </button>
          </form>
        </section>

        <section className="p-4 rounded-3xl bg-surface space-y-3">
          <h2 className="font-display text-lg">{t('settings.ai_title')}</h2>
          <p className="text-sm text-text-muted">{t('settings.ai_description')}</p>
          <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-bg">
            <div className="min-w-0">
              <p className="font-medium">{t('settings.ai_toggle_label')}</p>
              <p className="text-xs text-text-muted">
                {aiStatus.data?.accountEnabled
                  ? t('settings.ai_currently_on')
                  : t('settings.ai_currently_off')}
                {aiStatus.data && !aiStatus.data.serverKeyConfigured && (
                  <>
                    {' '}
                    · <span className="text-danger">{t('settings.ai_no_key')}</span>
                  </>
                )}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={me.data?.aiFeaturesEnabled ?? false}
              onClick={() => setAi.mutate(!(me.data?.aiFeaturesEnabled ?? false))}
              disabled={setAi.isPending || !me.data}
              className={
                'relative inline-flex h-7 w-12 items-center rounded-full transition-colors ' +
                (me.data?.aiFeaturesEnabled
                  ? 'bg-accent'
                  : 'bg-text-muted/30') +
                ' disabled:opacity-40'
              }
            >
              <span
                aria-hidden
                className={
                  'inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ' +
                  (me.data?.aiFeaturesEnabled
                    ? 'translate-x-6'
                    : 'translate-x-1')
                }
              />
            </button>
          </div>
        </section>
      </div>
    </ParentShell>
  );
}
