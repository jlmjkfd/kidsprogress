import { useTranslation } from 'react-i18next';
import { ChildShell } from '@/app/layouts/ChildShell';

/**
 * Phase 1 placeholder for the kid Today screen. Phase 9 replaces this with
 * the real Khan-Kids-style task list.
 */
export function TodayPlaceholder() {
  const { t } = useTranslation('common');
  return (
    <ChildShell>
      <div className="max-w-xl mx-auto py-12 text-center space-y-3">
        <h1 className="text-3xl font-display">{t('today.placeholder_title')}</h1>
        <p className="text-text-muted">{t('today.placeholder_body')}</p>
      </div>
    </ChildShell>
  );
}
