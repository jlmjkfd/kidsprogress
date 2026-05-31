import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { IconSettings } from '@tabler/icons-react';
import type { ChildRosterCard } from '@kidsprogress/shared';
import { ChildShell } from '@/app/layouts/ChildShell';
import { useChildLogin, useDeviceLookup } from '../hooks';
import { useAuthStore } from '../store';
import { AvatarCard } from '../components/AvatarCard';
import { PinPad } from '../components/PinPad';
import { PinResetForm } from '../components/PinResetForm';

/**
 * Kid-portal landing screen. Looks up the family roster from the device
 * token, shows the avatar grid. Tapping a no-PIN child logs them in
 * immediately; tapping a PIN-required child reveals the PIN pad.
 */
export function SelectionPage() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const deviceToken = useAuthStore((s) => s.deviceToken);
  const lookup = useDeviceLookup(deviceToken);
  const login = useChildLogin();
  const [pinChild, setPinChild] = useState<ChildRosterCard | null>(null);
  const [pinError, setPinError] = useState<string | undefined>(undefined);
  const [resetMode, setResetMode] = useState(false);

  // No device token → bounce back to the welcome screen so the visitor
  // can pick their flow (sign-in / sign-up / paste a device code) instead
  // of being dumped straight into the setup form.
  if (!deviceToken) {
    return <Navigate to="/" replace />;
  }

  if (lookup.isPending) {
    return (
      <ChildShell>
        <p className="text-center text-text-muted">{t('common.loading')}</p>
      </ChildShell>
    );
  }
  if (lookup.isError) {
    return (
      <ChildShell>
        <div className="text-center space-y-4">
          <p role="alert" className="text-danger">
            {t('selection.lookup_failed')}
          </p>
          <button
            type="button"
            onClick={() => navigate('/setup-device')}
            className="text-accent underline"
          >
            {t('selection.re_register_device')}
          </button>
        </div>
      </ChildShell>
    );
  }

  const { familyDisplayName, children } = lookup.data;

  const onCardTap = (child: ChildRosterCard) => {
    setPinError(undefined);
    if (child.pinRequired) {
      setPinChild(child);
      return;
    }
    login.mutate(
      { deviceToken, childId: child.id },
      {
        onSuccess: () => navigate('/today', { replace: true }),
      },
    );
  };

  const onPinSubmit = (pin: string) => {
    if (!pinChild) return;
    login.mutate(
      { deviceToken, childId: pinChild.id, pin },
      {
        onSuccess: () => {
          setPinChild(null);
          navigate('/today', { replace: true });
        },
        onError: () => setPinError('selection.wrong_pin'),
      },
    );
  };

  return (
    <ChildShell>
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display">
          {t('selection.greeting', { family: familyDisplayName })}
        </h1>
        <button
          type="button"
          onClick={() => navigate('/parent-login')}
          aria-label={t('selection.parent_button')}
          className="p-3 rounded-full hover:bg-surface min-h-touch min-w-touch"
        >
          <IconSettings size={22} />
        </button>
      </header>

      {pinChild ? (
        <section className="max-w-sm mx-auto">
          {resetMode ? (
            <PinResetForm
              childId={pinChild.id}
              onSuccess={() => {
                setResetMode(false);
                setPinError('selection.pin_reset_ok');
                lookup.refetch();
              }}
              onCancel={() => setResetMode(false)}
            />
          ) : (
            <>
              <h2 className="text-center text-xl mb-4">
                {t('selection.enter_pin', { name: pinChild.displayName })}
              </h2>
              <PinPad
                onSubmit={onPinSubmit}
                {...(pinError ? { errorKey: pinError } : {})}
                busy={login.isPending}
              />
              <div className="flex flex-col items-center gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setPinError(undefined);
                    setResetMode(true);
                  }}
                  className="text-accent underline text-sm"
                >
                  {t('selection.forgot_pin')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPinChild(null);
                    setPinError(undefined);
                  }}
                  className="text-accent underline"
                >
                  {t('selection.back')}
                </button>
              </div>
            </>
          )}
        </section>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {children.length === 0 ? (
            <p className="col-span-full text-center text-text-muted">
              {t('selection.no_children_on_device')}
            </p>
          ) : (
            children.map((child) => (
              <AvatarCard
                key={child.id}
                avatarKey={child.avatarKey}
                displayName={child.displayName}
                pinRequired={child.pinRequired}
                isLocked={child.isLocked}
                onClick={() => onCardTap(child)}
              />
            ))
          )}
        </div>
      )}
    </ChildShell>
  );
}
