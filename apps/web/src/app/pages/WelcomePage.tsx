import { useTranslation } from 'react-i18next';
import { Link, Navigate } from 'react-router-dom';
import {
  IconDeviceTablet,
  IconUserCircle,
  IconUserPlus,
} from '@tabler/icons-react';
import { ParentShell } from '@/app/layouts/ParentShell';
import { useAuthStore } from '@/features/auth/store';

/**
 * Root landing for a fresh visitor.
 *
 *  - **Signed-in parent** is shunted to `/parent`.
 *  - **Visitor with a device token** is shunted to the kid roster.
 *  - **Everyone else** sees three explicit choices: sign in, sign up, or
 *    paste a device code for a kid tablet.
 *
 * Renders inside `ParentShell` (signed-out branch — minimal chrome with
 * no nav rail) so a fresh visitor isn't confronted with empty parent
 * navigation they can't authenticate against yet.
 */
export function WelcomePage() {
  const { t } = useTranslation('common');
  const parentAccessToken = useAuthStore((s) => s.parentAccessToken);
  const deviceToken = useAuthStore((s) => s.deviceToken);

  if (parentAccessToken) return <Navigate to="/parent" replace />;
  if (deviceToken) return <Navigate to="/kids" replace />;

  return (
    <ParentShell>
      <div className="max-w-xl mx-auto py-12 px-4 space-y-8">
        <header className="text-center space-y-2">
          <h1 className="text-3xl font-display">{t('welcome.title')}</h1>
          <p className="text-text-muted">{t('welcome.subtitle')}</p>
        </header>

        <div className="grid gap-3">
          <Link
            to="/parent-login"
            className="flex items-center gap-4 p-4 rounded-3xl bg-surface hover:bg-surface-muted min-h-touch transition-colors"
          >
            <IconUserCircle size={28} className="text-accent shrink-0" aria-hidden />
            <div className="min-w-0">
              <p className="font-medium">{t('welcome.signin_title')}</p>
              <p className="text-sm text-text-muted">
                {t('welcome.signin_desc')}
              </p>
            </div>
          </Link>

          <Link
            to="/parent-signup"
            className="flex items-center gap-4 p-4 rounded-3xl bg-surface hover:bg-surface-muted min-h-touch transition-colors"
          >
            <IconUserPlus size={28} className="text-accent shrink-0" aria-hidden />
            <div className="min-w-0">
              <p className="font-medium">{t('welcome.signup_title')}</p>
              <p className="text-sm text-text-muted">
                {t('welcome.signup_desc')}
              </p>
            </div>
          </Link>

          <Link
            to="/setup-device"
            className="flex items-center gap-4 p-4 rounded-3xl bg-surface hover:bg-surface-muted min-h-touch transition-colors"
          >
            <IconDeviceTablet size={28} className="text-accent shrink-0" aria-hidden />
            <div className="min-w-0">
              <p className="font-medium">{t('welcome.device_title')}</p>
              <p className="text-sm text-text-muted">
                {t('welcome.device_desc')}
              </p>
            </div>
          </Link>
        </div>
      </div>
    </ParentShell>
  );
}
