import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '../api';

interface PinGateDialogProps {
  /** Headline — explains WHAT the parent is about to do. */
  title: string;
  /** Optional body text. */
  description?: string;
  /** Label on the confirm button (defaults to the i18n "confirm" key). */
  confirmLabel?: string;
  /** What runs once the PIN verifies. */
  onConfirmed: () => void;
  /** Close without acting. */
  onCancel: () => void;
}

/**
 * Inline PIN-verification dialog. POSTs to `/api/auth/me/parent-pin/verify`
 * and only calls `onConfirmed` if the server returns 204. Renders nothing
 * heavyweight — caller renders this inside their own card / drawer.
 *
 * Caller is responsible for FIRST checking `hasParentPortalPin` (via the
 * `useParentMe` hook). If the parent has no portal PIN set, skip this
 * dialog entirely and call the action directly — otherwise the verify
 * call would 409 and the parent would be stuck.
 */
export function PinGateDialog({
  title,
  description,
  confirmLabel,
  onConfirmed,
  onCancel,
}: PinGateDialogProps) {
  const { t } = useTranslation('common');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | undefined>();

  const verify = useMutation({
    mutationFn: () => authApi.verifyParentPortalPin(pin),
    onSuccess: () => onConfirmed(),
    onError: () => setError('pin_gate.wrong_pin'),
  });

  return (
    <section
      role="dialog"
      aria-modal="true"
      className="p-4 rounded-3xl bg-accent-soft border border-accent-border space-y-3"
    >
      <h3 className="font-display text-lg">{title}</h3>
      {description && <p className="text-sm text-text-muted">{description}</p>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setError(undefined);
          if (!/^\d{4,6}$/.test(pin)) {
            setError('pin_gate.invalid_pin');
            return;
          }
          verify.mutate();
        }}
        className="space-y-3"
      >
        <input
          type="password"
          inputMode="numeric"
          pattern="\d{4,6}"
          value={pin}
          onChange={(e) =>
            setPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))
          }
          placeholder={t('pin_gate.placeholder')}
          autoFocus
          className="w-full min-h-touch rounded-2xl border border-text-muted/30 bg-bg p-3 font-mono text-center text-xl tracking-widest"
        />
        {error && (
          <p role="alert" className="text-danger text-sm">
            {t(error)}
          </p>
        )}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={verify.isPending || pin.length < 4}
            className="flex-1 min-h-touch rounded-2xl bg-danger text-white py-3 disabled:opacity-40"
          >
            {verify.isPending
              ? t('common.loading')
              : (confirmLabel ?? t('pin_gate.confirm'))}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-6 min-h-touch rounded-2xl border border-text-muted/30"
          >
            {t('common.cancel')}
          </button>
        </div>
      </form>
    </section>
  );
}
