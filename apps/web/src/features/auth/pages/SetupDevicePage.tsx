import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ChildShell } from '@/app/layouts/ChildShell';
import { authApi } from '../api';
import { useAuthStore } from '../store';

/**
 * First-run device setup. The parent pastes the one-time device token they
 * got from the parent portal; we verify by hitting /api/devices/lookup
 * before persisting it.
 */
export function SetupDevicePage() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const setDeviceToken = useAuthStore((s) => s.setDeviceToken);
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    setBusy(true);
    try {
      // Round-trip the token to confirm it's valid before persisting it.
      await authApi.deviceLookup({ deviceToken: token.trim() });
      setDeviceToken(token.trim());
      navigate('/', { replace: true });
    } catch {
      setError('setup.invalid_token');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ChildShell>
      <div className="max-w-md mx-auto space-y-6">
        <h1 className="text-2xl font-display text-center">{t('setup.title')}</h1>
        <p className="text-text-muted text-center">{t('setup.subtitle')}</p>
        <form onSubmit={submit} className="space-y-4">
          <label htmlFor="device-token" className="block text-sm">
            {t('setup.token_label')}
          </label>
          <textarea
            id="device-token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder={t('setup.token_placeholder')}
            className="w-full min-h-touch rounded-2xl border border-text-muted/30 bg-surface p-3 font-mono text-sm"
            rows={3}
            autoComplete="off"
            required
          />
          {error && (
            <p role="alert" className="text-danger text-sm">
              {t(error)}
            </p>
          )}
          <button
            type="submit"
            disabled={busy || token.trim().length < 16}
            className="w-full min-h-touch rounded-2xl bg-accent text-white py-3 disabled:opacity-40"
          >
            {busy ? t('common.loading') : t('setup.submit')}
          </button>
        </form>
      </div>
    </ChildShell>
  );
}
