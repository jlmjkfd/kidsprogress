import { IconLock, IconUser } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

interface AvatarCardProps {
  avatarKey: string;
  displayName: string;
  pinRequired: boolean;
  isLocked: boolean;
  onClick: () => void;
}

/**
 * One tile on the kid roster grid. Big tap target (96 × 96+), the kid's
 * avatar + name, padlock indicator when a PIN is required, and a clear
 * "locked-out" state when the back-end says the child is throttled.
 */
export function AvatarCard({
  avatarKey,
  displayName,
  pinRequired,
  isLocked,
  onClick,
}: AvatarCardProps) {
  const { t } = useTranslation('common');
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLocked}
      className={
        'flex flex-col items-center gap-2 p-3 rounded-3xl bg-surface ' +
        'hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-accent ' +
        'disabled:opacity-40 disabled:cursor-not-allowed transition-colors ' +
        'min-h-touch min-w-touch'
      }
      aria-label={
        isLocked
          ? t('roster.locked_aria', { name: displayName })
          : t('roster.tile_aria', { name: displayName })
      }
    >
      <div className="relative">
        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-bg flex items-center justify-center text-3xl">
          {/* Placeholder — Phase 3 swaps these for real illustrations. */}
          <span aria-hidden data-avatar={avatarKey}>
            <IconUser size={48} />
          </span>
        </div>
        {pinRequired && !isLocked && (
          <span
            aria-hidden
            className="absolute -bottom-1 -right-1 bg-accent text-white rounded-full p-1.5"
          >
            <IconLock size={14} />
          </span>
        )}
      </div>
      <span className="text-base font-medium truncate max-w-[8rem]">{displayName}</span>
      {isLocked && (
        <span className="text-xs text-status-danger" role="status">
          {t('roster.locked_caption')}
        </span>
      )}
    </button>
  );
}
