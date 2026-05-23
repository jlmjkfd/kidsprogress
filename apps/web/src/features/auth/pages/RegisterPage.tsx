import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ApiError } from '@/lib/apiClient';
import { useRegister } from '../api/useLogin';

export function RegisterPage() {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const reg = useRegister();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await reg.mutateAsync({ email, password, displayName });
      navigate('/', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) setError(t('errors.email_taken'));
        else if (err.status === 429) setError(t('errors.rate_limited'));
        else setError(t('errors.generic'));
      } else {
        setError(t('errors.generic'));
      }
    }
  };

  return (
    <div className="mx-auto mt-12 max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:mt-24">
      <h1 className="mb-4 text-xl font-semibold">{t('register')}</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <label className="block text-sm">
          <span className="mb-1 block text-slate-700">{t('display_name')}</span>
          <input
            type="text"
            autoComplete="name"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full min-h-[44px] rounded border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-700">{t('email')}</span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full min-h-[44px] rounded border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-700">{t('password')}</span>
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full min-h-[44px] rounded border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none"
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={reg.isPending}
          className="w-full min-h-[44px] rounded bg-slate-800 px-3 py-2 text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {t('submit_register')}
        </button>
      </form>
      <p className="mt-3 text-sm text-slate-600">
        {t('have_account')}{' '}
        <Link to="/login" className="text-slate-900 underline">
          {t('login')}
        </Link>
      </p>
    </div>
  );
}
