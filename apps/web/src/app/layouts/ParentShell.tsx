import { useState, type ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  IconCalendar,
  IconClipboardList,
  IconDeviceTablet,
  IconLogout,
  IconMenu2,
  IconSettings,
  IconUsers,
  IconX,
} from '@tabler/icons-react';
import { useAuthStore } from '@/features/auth/store';
import { authApi } from '@/features/auth/api';
import { ThemeBoundary } from './ThemeBoundary';

/**
 * Parent portal chrome. Left rail on `md+`, slide-over sheet on mobile.
 * The rail lists the manageable resource groups; the topbar carries the
 * parent's name + a sign-out action.
 */
export function ParentShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const clearAll = useAuthStore((s) => s.clearAll);
  const parentAccessToken = useAuthStore((s) => s.parentAccessToken);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const signOut = async () => {
    try {
      await authApi.parentLogout();
    } catch {
      // Even if the logout call fails (offline, expired), still wipe local
      // state — the user's intent is clear.
    }
    clearAll();
    navigate('/parent-login', { replace: true });
  };

  const navItems = [
    { to: '/parent', label: t('nav.parent_home'), icon: IconCalendar },
    { to: '/parent/children', label: t('nav.children'), icon: IconUsers },
    { to: '/parent/templates', label: t('nav.templates'), icon: IconClipboardList },
    { to: '/parent/assignments', label: t('nav.assignments'), icon: IconCalendar },
    { to: '/parent/devices', label: t('nav.devices'), icon: IconDeviceTablet },
    { to: '/parent/settings', label: t('nav.settings'), icon: IconSettings },
  ];

  const railLinkClass = (isActive: boolean): string =>
    'flex items-center gap-3 px-3 py-2 rounded-2xl min-h-touch ' +
    (isActive
      ? 'bg-accent-soft text-accent font-medium'
      : 'hover:bg-surface-muted text-text-muted');

  // Signed-out chrome — minimal centered shell so the login form isn't
  // surrounded by navigation that would 401.
  if (!parentAccessToken) {
    return (
      <ThemeBoundary theme="parent">
        <div className="min-h-screen bg-bg text-text">{children}</div>
      </ThemeBoundary>
    );
  }

  return (
    <ThemeBoundary theme="parent">
      <div className="min-h-screen bg-bg text-text grid md:grid-cols-[16rem_1fr]">
        {/* Mobile topbar */}
        <header className="md:hidden flex items-center justify-between p-3 border-b border-text-muted/15">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label={t('nav.open_menu')}
            className="p-2 rounded-full hover:bg-surface-muted min-h-touch min-w-touch"
          >
            <IconMenu2 size={22} aria-hidden />
          </button>
          <Link to="/parent" className="font-display text-lg">
            {t('app_title')}
          </Link>
          <span className="w-10" />
        </header>

        {/* Desktop rail */}
        <aside className="hidden md:flex flex-col gap-4 border-r border-text-muted/15 p-4 sticky top-0 h-screen">
          <Link to="/parent" className="font-display text-xl">
            {t('app_title')}
          </Link>
          <nav className="flex flex-col gap-1" aria-label={t('nav.aria_main')}>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/parent'}
                className={({ isActive }) => railLinkClass(isActive)}
              >
                <item.icon size={20} aria-hidden />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto">
            <button
              type="button"
              onClick={() => void signOut()}
              className="flex items-center gap-3 px-3 py-2 rounded-2xl min-h-touch text-text-muted hover:bg-surface-muted w-full"
            >
              <IconLogout size={20} aria-hidden />
              <span>{t('nav.sign_out')}</span>
            </button>
          </div>
        </aside>

        {/* Mobile drawer */}
        {drawerOpen && (
          <div
            className="md:hidden fixed inset-0 z-50 bg-black/40"
            onClick={() => setDrawerOpen(false)}
          >
            <aside
              className="absolute left-0 top-0 bottom-0 w-72 bg-bg p-4 flex flex-col gap-4"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-lg">{t('app_title')}</span>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  aria-label={t('nav.close_menu')}
                  className="p-2 rounded-full hover:bg-surface-muted min-h-touch min-w-touch"
                >
                  <IconX size={22} aria-hidden />
                </button>
              </div>
              <nav className="flex flex-col gap-1" aria-label={t('nav.aria_main')}>
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/parent'}
                    onClick={() => setDrawerOpen(false)}
                    className={({ isActive }) => railLinkClass(isActive)}
                  >
                    <item.icon size={20} aria-hidden />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </nav>
              <div className="mt-auto">
                <button
                  type="button"
                  onClick={() => {
                    setDrawerOpen(false);
                    void signOut();
                  }}
                  className="flex items-center gap-3 px-3 py-2 rounded-2xl min-h-touch text-text-muted hover:bg-surface-muted w-full"
                >
                  <IconLogout size={20} aria-hidden />
                  <span>{t('nav.sign_out')}</span>
                </button>
              </div>
            </aside>
          </div>
        )}

        <main className="min-w-0">{children}</main>
      </div>
    </ThemeBoundary>
  );
}
