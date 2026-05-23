import { type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { IconLogout } from '@tabler/icons-react';
import { useMe } from '@/features/auth/api/useMe';
import { useLogout } from '@/features/auth/api/useLogin';

export function ParentLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation(['common', 'auth']);
  const me = useMe();
  const logout = useLogout();
  const navigate = useNavigate();
  const location = useLocation();

  const onLogout = async () => {
    await logout.mutateAsync();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between p-3 sm:p-4">
          <Link to="/" className="text-base font-semibold sm:text-lg">
            {t('common:app_title')}
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/"
              className={`min-h-[44px] inline-flex items-center px-2 text-sm ${
                location.pathname === '/' ? 'font-medium text-slate-900' : 'text-slate-600'
              }`}
            >
              {t('children:title', { defaultValue: 'Children' })}
            </Link>
            <span className="hidden text-sm text-slate-500 sm:inline">
              {me.data?.displayName}
            </span>
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex min-h-[44px] items-center gap-1 rounded border border-slate-300 px-2 py-1 text-sm hover:bg-slate-100"
              aria-label={t('auth:logout')}
            >
              <IconLogout size={16} aria-hidden />
              <span className="hidden sm:inline">{t('auth:logout')}</span>
            </button>
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
