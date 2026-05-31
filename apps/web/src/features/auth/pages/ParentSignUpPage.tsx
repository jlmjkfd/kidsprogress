import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { ParentShell } from '@/app/layouts/ParentShell';
import { useParentRegister } from '../hooks';
import { ApiError } from '@/lib/apiClient';

/**
 * Sign-up companion to ParentLoginPage. The API rejects duplicate emails
 * with 409 and weak passwords (<8 chars) with 400 — both flow through to
 * a generic, non-leaking error caption.
 */
export function ParentSignUpPage() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const register = useParentRegister();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | undefined>();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    if (password.length < 8) {
      setError('parent_signup.password_too_short');
      return;
    }
    register.mutate(
      { email, password, displayName: displayName.trim() },
      {
        onSuccess: () => navigate('/parent', { replace: true }),
        onError: (err) => {
          if (err instanceof ApiError && err.status === 409) {
            setError('parent_signup.email_taken');
          } else if (err instanceof ApiError && err.status === 400) {
            setError('parent_signup.invalid_input');
          } else {
            setError('parent_signup.failed');
          }
        },
      },
    );
  };

  return (
    <ParentShell>
      <div className="max-w-md mx-auto py-12 px-4 space-y-6">
        <h1 className="text-2xl font-display">{t('parent_signup.title')}</h1>
        <p className="text-text-muted text-sm">{t('parent_signup.subtitle')}</p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="su-name" className="block text-sm mb-1">
              {t('parent_signup.display_name')}
            </label>
            <input
              id="su-name"
              type="text"
              autoComplete="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              minLength={1}
              maxLength={80}
              className="w-full min-h-touch rounded-2xl border border-text-muted/30 bg-surface p-3"
            />
          </div>
          <div>
            <label htmlFor="su-email" className="block text-sm mb-1">
              {t('parent_signup.email')}
            </label>
            <input
              id="su-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full min-h-touch rounded-2xl border border-text-muted/30 bg-surface p-3"
            />
          </div>
          <div>
            <label htmlFor="su-pw" className="block text-sm mb-1">
              {t('parent_signup.password')}
            </label>
            <input
              id="su-pw"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              maxLength={128}
              className="w-full min-h-touch rounded-2xl border border-text-muted/30 bg-surface p-3"
            />
            <p className="text-xs text-text-muted mt-1">
              {t('parent_signup.password_hint')}
            </p>
          </div>
          {error && (
            <p role="alert" className="text-danger text-sm">
              {t(error)}
            </p>
          )}
          <button
            type="submit"
            disabled={
              register.isPending ||
              !email ||
              password.length < 8 ||
              displayName.trim().length === 0
            }
            className="w-full min-h-touch rounded-2xl bg-accent text-white py-3 disabled:opacity-40"
          >
            {register.isPending
              ? t('common.loading')
              : t('parent_signup.submit')}
          </button>
          <p className="text-sm text-center">
            <Link to="/parent-login" className="text-accent underline">
              {t('parent_signup.have_account')}
            </Link>
          </p>
        </form>
      </div>
    </ParentShell>
  );
}
