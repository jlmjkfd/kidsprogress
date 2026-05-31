import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ParentShell } from '@/app/layouts/ParentShell';

/**
 * Phase 1 placeholder for the parent home. Phase 3 replaces this with the
 * real left-rail + child selector + week calendar.
 */
export function ParentHomePlaceholder() {
  const { t } = useTranslation('common');
  return (
    <ParentShell>
      <div className="max-w-xl mx-auto py-12 px-4 text-center space-y-4">
        <h1 className="text-3xl font-display">{t('parent_home.placeholder_title')}</h1>
        <p className="text-text-muted">{t('parent_home.placeholder_body')}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2 flex-wrap">
          <Link
            to="/parent/calendar"
            className="inline-block min-h-touch rounded-2xl bg-accent text-white px-6 py-3"
          >
            {t('parent_home.go_to_calendar')}
          </Link>
          <Link
            to="/parent/children"
            className="inline-block min-h-touch rounded-2xl border border-text-muted/30 px-6 py-3"
          >
            {t('parent_home.go_to_children')}
          </Link>
          <Link
            to="/parent/templates"
            className="inline-block min-h-touch rounded-2xl border border-text-muted/30 px-6 py-3"
          >
            {t('parent_home.go_to_templates')}
          </Link>
          <Link
            to="/parent/devices"
            className="inline-block min-h-touch rounded-2xl border border-text-muted/30 px-6 py-3"
          >
            {t('parent_home.go_to_devices')}
          </Link>
        </div>
      </div>
    </ParentShell>
  );
}
