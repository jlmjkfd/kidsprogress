import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IconCopy, IconDeviceTablet, IconPlus, IconTrash } from '@tabler/icons-react';
import { ParentShell } from '@/app/layouts/ParentShell';
import { childrenApi } from '@/features/children/api';
import { devicesApi } from '../api';

/**
 * Parent device manager.
 *
 *  - Lists every registered family device.
 *  - "New device" form takes a label + optional per-child roster (empty =
 *    all current children). Server mints a one-time deviceToken; this page
 *    shows it ONCE in a copy-able card. After the parent dismisses, the
 *    token is gone — issuing a new device is the recovery path.
 *  - Each row carries a revoke action (Phase 1f wires up the cascade
 *    revocation of refresh tokens server-side).
 */
export function DevicesListPage() {
  const { t } = useTranslation('common');
  const qc = useQueryClient();
  const devices = useQuery({
    queryKey: ['devices', 'list'],
    queryFn: () => devicesApi.list().then((r) => r.devices),
  });
  const children = useQuery({
    queryKey: ['children', 'list'],
    queryFn: () => childrenApi.list().then((r) => r.children),
  });

  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState('');
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>([]);
  const [issuedToken, setIssuedToken] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');
  const [error, setError] = useState<string | undefined>();

  const register = useMutation({
    mutationFn: () =>
      devicesApi.register({ label: label.trim(), childIds: selectedChildIds }),
    onSuccess: (res) => {
      setIssuedToken(res.deviceToken);
      setShowForm(false);
      setLabel('');
      setSelectedChildIds([]);
      void qc.invalidateQueries({ queryKey: ['devices', 'list'] });
    },
    onError: () => setError('devices.register_failed'),
  });

  const revoke = useMutation({
    mutationFn: (id: string) => devicesApi.revoke(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['devices', 'list'] });
    },
  });

  const copy = async () => {
    if (!issuedToken) return;
    try {
      await navigator.clipboard.writeText(issuedToken);
      setCopyState('copied');
      setTimeout(() => setCopyState('idle'), 1500);
    } catch {
      // Clipboard API can fail in non-secure contexts; the textarea is
      // still selectable so the parent can ctrl-C manually.
    }
  };

  const toggleChild = (childId: string) => {
    setSelectedChildIds((prev) =>
      prev.includes(childId) ? prev.filter((c) => c !== childId) : [...prev, childId],
    );
  };

  return (
    <ParentShell>
      <div className="max-w-3xl mx-auto py-6 px-4 space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-display">{t('devices.list_title')}</h1>
          {!showForm && !issuedToken && (
            <button
              type="button"
              onClick={() => {
                setError(undefined);
                setShowForm(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-accent text-white min-h-touch"
            >
              <IconPlus size={18} aria-hidden />
              {t('devices.new_button')}
            </button>
          )}
        </header>

        {issuedToken && (
          <section
            role="status"
            aria-live="polite"
            className="p-4 rounded-3xl bg-accent-soft border border-accent-border space-y-3"
          >
            <h2 className="font-display text-lg">{t('devices.token_title')}</h2>
            <p className="text-sm text-text-muted">{t('devices.token_warning')}</p>
            <textarea
              readOnly
              value={issuedToken}
              rows={3}
              className="w-full rounded-2xl border border-text-muted/30 bg-surface p-3 font-mono text-sm"
              onFocus={(e) => e.target.select()}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={copy}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-accent text-white min-h-touch"
              >
                <IconCopy size={18} aria-hidden />
                {copyState === 'copied'
                  ? t('devices.copied')
                  : t('devices.copy_button')}
              </button>
              <button
                type="button"
                onClick={() => setIssuedToken(null)}
                className="px-4 min-h-touch rounded-2xl border border-text-muted/30"
              >
                {t('devices.dismiss')}
              </button>
            </div>
          </section>
        )}

        {showForm && (
          <section className="p-4 rounded-3xl bg-surface space-y-4">
            <h2 className="font-display text-lg">{t('devices.form_title')}</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setError(undefined);
                register.mutate();
              }}
              className="space-y-3"
            >
              <div>
                <label htmlFor="dev-label" className="block text-sm mb-1">
                  {t('devices.label_label')}
                </label>
                <input
                  id="dev-label"
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder={t('devices.label_placeholder')}
                  required
                  minLength={1}
                  maxLength={80}
                  className="w-full min-h-touch rounded-2xl border border-text-muted/30 bg-bg p-3"
                />
              </div>
              {children.data && children.data.length > 0 && (
                <fieldset className="space-y-2">
                  <legend className="text-sm">{t('devices.roster_label')}</legend>
                  <p className="text-xs text-text-muted">
                    {t('devices.roster_hint')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {children.data.map((c) => {
                      const checked = selectedChildIds.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => toggleChild(c.id)}
                          className={
                            'px-3 py-2 rounded-full text-sm min-h-touch ' +
                            (checked
                              ? 'bg-accent text-white'
                              : 'bg-bg border border-text-muted/30')
                          }
                        >
                          {c.displayName}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              )}
              {error && (
                <p role="alert" className="text-danger text-sm">
                  {t(error)}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={register.isPending || label.trim().length === 0}
                  className="flex-1 min-h-touch rounded-2xl bg-accent text-white py-3 disabled:opacity-40"
                >
                  {register.isPending ? t('common.loading') : t('devices.create')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-6 min-h-touch rounded-2xl border border-text-muted/30"
                >
                  {t('devices.cancel')}
                </button>
              </div>
            </form>
          </section>
        )}

        {devices.isPending && <p className="text-text-muted">{t('common.loading')}</p>}
        {devices.isError && (
          <p role="alert" className="text-danger">
            {t('devices.list_failed')}
          </p>
        )}
        {devices.data && devices.data.length === 0 && !showForm && !issuedToken && (
          <p className="text-text-muted">{t('devices.empty')}</p>
        )}
        {devices.data && devices.data.length > 0 && (
          <ul className="space-y-3">
            {devices.data.map((d) => (
              <li
                key={d.id}
                className={
                  'flex items-center justify-between gap-4 p-4 rounded-2xl bg-surface ' +
                  (d.revokedAt ? 'opacity-60' : '')
                }
              >
                <div className="min-w-0">
                  <p className="font-medium truncate flex items-center gap-2">
                    <IconDeviceTablet size={18} aria-hidden />
                    {d.label}
                  </p>
                  <p className="text-xs text-text-muted">
                    {t('devices.token_hash_prefix', { prefix: d.tokenHashPrefix })}
                    {d.childIds.length > 0 &&
                      ` · ${t('devices.children_count', { count: d.childIds.length })}`}
                    {d.revokedAt && ` · ${t('devices.revoked_badge')}`}
                  </p>
                </div>
                {!d.revokedAt && (
                  <button
                    type="button"
                    onClick={() => revoke.mutate(d.id)}
                    disabled={revoke.isPending}
                    aria-label={t('devices.revoke_button')}
                    className="p-2 rounded-full hover:bg-surface-muted min-h-touch min-w-touch text-danger"
                  >
                    <IconTrash size={18} aria-hidden />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </ParentShell>
  );
}
