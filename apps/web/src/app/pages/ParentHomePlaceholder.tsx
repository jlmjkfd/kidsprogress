import { useTranslation } from 'react-i18next';
import { ParentShell } from '@/app/layouts/ParentShell';

/**
 * Phase 1 placeholder for the parent home. Phase 3 replaces this with the
 * real left-rail + child selector + week calendar.
 */
export function ParentHomePlaceholder() {
  const { t } = useTranslation('common');
  return (
    <ParentShell>
      <div className="max-w-xl mx-auto py-12 text-center space-y-3">
        <h1 className="text-3xl font-display">{t('parent_home.placeholder_title')}</h1>
        <p className="text-text-muted">{t('parent_home.placeholder_body')}</p>
      </div>
    </ParentShell>
  );
}
