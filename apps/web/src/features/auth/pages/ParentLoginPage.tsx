import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { ParentShell } from '@/app/layouts/ParentShell';
import { useParentLogin } from '../hooks';

/**
 * Parent login form. Email + password. On success the parent JWT lands in
 * the Zustand store and we navigate to the (Phase 3) parent home.
 */
export function ParentLoginPage() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const login = useParentLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | undefined>();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    login.mutate(
      { email, password },
      {
        onSuccess: () => navigate('/parent', { replace: true }),
        onError: () => setError('parent_login.invalid_credentials'),
      },
    );
  };

  return (
    <ParentShell>
      <div className="max-w-md mx-auto space-y-6">
        <h1 className="text-2xl font-display">{t('parent_login.title')}</h1>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm mb-1">
              {t('parent_login.email')}
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full min-h-touch rounded-2xl border border-text-muted/30 bg-surface p-3"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm mb-1">
              {t('parent_login.password')}
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full min-h-touch rounded-2xl border border-text-muted/30 bg-surface p-3"
            />
          </div>
          {error && (
            <p role="alert" className="text-danger text-sm">
              {t(error)}
            </p>
          )}
          <button
            type="submit"
            disabled={login.isPending || !email || !password}
            className="w-full min-h-touch rounded-2xl bg-accent text-white py-3 disabled:opacity-40"
          >
            {login.isPending ? t('common.loading') : t('parent_login.submit')}
          </button>
          <p className="text-sm text-center">
            <Link to="/parent-signup" className="text-accent underline">
              {t('parent_login.no_account')}
            </Link>
          </p>
          <button
            type="button"
            onClick={() => navigate('/kids')}
            className="w-full min-h-touch py-3 underline text-text-muted"
          >
            {t('parent_login.back_to_kids')}
          </button>
        </form>
      </div>
    </ParentShell>
  );
}
