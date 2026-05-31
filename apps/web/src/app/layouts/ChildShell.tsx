import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { IconUsers } from '@tabler/icons-react';
import type { AgeBand } from '@kidsprogress/shared';
import { useAuthStore } from '@/features/auth/store';
import { ThemeBoundary } from './ThemeBoundary';

/**
 * Child portal chrome. Age sub-theme bumps type scale + touch targets.
 * Younger (default at age ≤ 8) is gentler; older (≥ 9) is denser.
 *
 * Phase 3b ships a TodayHero band (date + greeting on a gradient) plus a
 * switch-profile link back to the roster. The execution surface keeps the
 * hero off so the kid's focus stays on the task — the route matcher only
 * shows the band on `/today`.
 */
interface Props {
  age?: AgeBand;
  /** Hide the TodayHero band explicitly (overrides the route heuristic). */
  hideHero?: boolean;
  children: ReactNode;
}

export function ChildShell({ age = 'younger', hideHero = false, children }: Props) {
  const { t, i18n } = useTranslation('common');
  const currentChild = useAuthStore((s) => s.currentChild);
  const location = useLocation();

  const showHero =
    !hideHero && currentChild !== null && location.pathname === '/today';

  const today = new Intl.DateTimeFormat(
    i18n.language === 'zh' ? 'zh-CN' : 'en-US',
    { weekday: 'long', month: 'long', day: 'numeric' },
  ).format(new Date());

  return (
    <ThemeBoundary theme="child" age={age}>
      <div className="min-h-screen bg-bg text-text">
        {showHero && currentChild && (
          <header className="bg-kp-sunrise text-white px-4 py-6 sm:py-8">
            <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm opacity-90">{today}</p>
                <h1 className="text-2xl sm:text-3xl font-display mt-1 truncate">
                  {t('today.greeting', { name: currentChild.displayName })}
                </h1>
              </div>
              <Link
                to="/kids"
                aria-label={t('shell.switch_profile')}
                className="p-3 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm min-h-touch min-w-touch shrink-0"
              >
                <IconUsers size={22} aria-hidden />
              </Link>
            </div>
          </header>
        )}
        <main>{children}</main>
      </div>
    </ThemeBoundary>
  );
}
