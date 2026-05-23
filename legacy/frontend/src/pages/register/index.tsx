/**
 * Register page with i18n support
 */
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { IconUserPlus, IconAlertCircle } from '@tabler/icons-react';
import { useRegister } from '@api/mutations/useRegister';
import { useLogin } from '@api/mutations/useLogin';
import { useAppDispatch } from '@store/hooks';
import { setCredentials } from '@store/slices/authSlice';
import { useCurrentUser } from '@api/queries/useCurrentUser';
import LanguageSwitcher from '@components/LanguageSwitcher';

function RegisterPage() {
  const { t, i18n } = useTranslation(['auth', 'errors']);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  const registerMutation = useRegister();
  const loginMutation = useLogin();
  const { refetch: fetchCurrentUser } = useCurrentUser(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Register user with current language
      await registerMutation.mutateAsync({
        email,
        password,
        full_name: fullName,
        language: i18n.language as "en" | "zh",
      });

      // Auto-login after registration
      const tokenData = await loginMutation.mutateAsync({ email, password });

      // Store token in localStorage first so API client can use it
      localStorage.setItem('auth_token', tokenData.access_token);

      const { data: user } = await fetchCurrentUser();

      if (user) {
        dispatch(setCredentials({ token: tokenData.access_token, user }));
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Registration failed:', error);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8">
      <div className="fixed top-4 right-4">
        <LanguageSwitcher />
      </div>
      <div className="w-full max-w-md">
        <div className="rounded-lg bg-white p-8 shadow-md">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-gray-900">{t('auth:register.title')}</h1>
            <p className="mt-2 text-sm text-gray-600">{t('auth:register.subtitle')}</p>
          </div>

          {registerMutation.isError && (
            <div className="mb-4 flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-800">
              <IconAlertCircle className="h-5 w-5" />
              <span>{t('errors:email_already_registered')}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                {t('auth:register.full_name_label')}
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                autoComplete="off"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder={t('auth:register.full_name_placeholder')}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                {t('auth:register.email_label')}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="off"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder={t('auth:register.email_placeholder')}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                {t('auth:register.password_label')}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder={t('auth:register.password_placeholder')}
              />
            </div>

            <button
              type="submit"
              disabled={registerMutation.isPending || loginMutation.isPending}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {registerMutation.isPending || loginMutation.isPending ? (
                <span>{t('auth:register.submitting')}</span>
              ) : (
                <>
                  <IconUserPlus className="h-5 w-5" />
                  <span>{t('auth:register.submit')}</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-gray-600">{t('auth:register.have_account')} </span>
            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
              {t('auth:register.signin_link')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
