import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

/**
 * Public-surface PIN-reset flow used by the kid at the device. Takes the
 * 6-digit code the parent issued + a new PIN, posts to the public
 * /api/children/pin/use-reset endpoint, and closes the form.
 *
 * The endpoint deliberately returns the same 401 for unknown-child /
 * expired-code / wrong-code (see Phase 1e hardening), so we surface a
 * single generic error message rather than trying to distinguish.
 */
export function PinResetForm(props: {
  childId: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation('common');
  const [code, setCode] = useState('');
  const [newPin, setNewPin] = useState('');
  const [error, setError] = useState<string | undefined>();

  const reset = useMutation({
    mutationFn: () =>
      apiClient.post('/api/children/pin/use-reset', {
        childId: props.childId,
        resetCode: code,
        newPin,
      }),
    onSuccess: () => props.onSuccess(),
    onError: () => setError('pin_reset.failed'),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(undefined);
        if (!/^\d{6}$/.test(code)) {
          setError('pin_reset.code_invalid');
          return;
        }
        if (!/^\d{4,6}$/.test(newPin)) {
          setError('pin_reset.pin_invalid');
          return;
        }
        reset.mutate();
      }}
      className="space-y-3"
    >
      <h2 className="text-center text-xl">{t('pin_reset.title')}</h2>
      <p className="text-center text-text-muted text-sm">
        {t('pin_reset.intro')}
      </p>
      <div>
        <label htmlFor="reset-code" className="block text-sm mb-1">
          {t('pin_reset.code_label')}
        </label>
        <input
          id="reset-code"
          type="text"
          inputMode="numeric"
          pattern="\d{6}"
          value={code}
          onChange={(e) =>
            setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))
          }
          autoFocus
          className="w-full min-h-touch rounded-2xl border border-text-muted/30 bg-surface p-3 font-mono text-center text-xl tracking-widest"
        />
      </div>
      <div>
        <label htmlFor="reset-new-pin" className="block text-sm mb-1">
          {t('pin_reset.new_pin_label')}
        </label>
        <input
          id="reset-new-pin"
          type="text"
          inputMode="numeric"
          pattern="\d{4,6}"
          value={newPin}
          onChange={(e) =>
            setNewPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))
          }
          className="w-full min-h-touch rounded-2xl border border-text-muted/30 bg-surface p-3 font-mono text-center text-xl tracking-widest"
        />
        <p className="text-xs text-text-muted mt-1">{t('pin_reset.new_pin_hint')}</p>
      </div>
      {error && (
        <p role="alert" className="text-danger text-sm text-center">
          {t(error)}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={props.onCancel}
          className="px-6 min-h-touch rounded-2xl border border-text-muted/30"
        >
          {t('pin_reset.cancel')}
        </button>
        <button
          type="submit"
          disabled={
            reset.isPending ||
            !/^\d{6}$/.test(code) ||
            !/^\d{4,6}$/.test(newPin)
          }
          className="flex-1 min-h-touch rounded-2xl bg-accent text-white py-3 disabled:opacity-40"
        >
          {reset.isPending ? t('common.loading') : t('pin_reset.submit')}
        </button>
      </div>
    </form>
  );
}
