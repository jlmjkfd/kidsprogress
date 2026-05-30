import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IconBackspace, IconLock } from '@tabler/icons-react';

interface PinPadProps {
  /** Called once the user has entered a 4–6 digit PIN and tapped Submit. */
  onSubmit: (pin: string) => void;
  /** Show an error caption below the dots (e.g. "Wrong PIN — 3 left"). */
  errorKey?: string;
  /** Disable input while a request is in flight. */
  busy?: boolean;
}

/**
 * Touch-friendly PIN pad — 4–6 digits, 64px-tall keys, no autofocus, no
 * keyboard popup. Used by child login + the parent-portal re-gate.
 */
export function PinPad({ onSubmit, errorKey, busy = false }: PinPadProps) {
  const { t } = useTranslation('common');
  const [pin, setPin] = useState('');

  const tap = (digit: string) => {
    if (busy || pin.length >= 6) return;
    setPin((p) => p + digit);
  };
  const back = () => setPin((p) => p.slice(0, -1));
  const submit = () => {
    if (pin.length >= 4 && pin.length <= 6) onSubmit(pin);
  };

  const dots = Array.from({ length: 6 }, (_, i) => (
    <span
      key={i}
      aria-hidden
      className={
        'w-3 h-3 rounded-full border ' +
        (i < pin.length ? 'bg-accent border-accent' : 'border-text-muted/40')
      }
    />
  ));

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex items-center gap-3" aria-label={t('pin.dots_label')}>
        <IconLock size={20} className="text-text-muted" aria-hidden />
        <div className="flex gap-2">{dots}</div>
      </div>
      {errorKey && (
        <p role="alert" className="text-status-danger text-sm">
          {t(errorKey)}
        </p>
      )}
      <div className="grid grid-cols-3 gap-3">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => tap(d)}
            disabled={busy}
            className="w-16 h-16 rounded-2xl text-2xl font-medium bg-surface hover:bg-surface-hover active:bg-surface-pressed disabled:opacity-50 min-h-touch"
            aria-label={t('pin.digit_label', { digit: d })}
          >
            {d}
          </button>
        ))}
        <button
          type="button"
          onClick={back}
          disabled={busy || pin.length === 0}
          className="w-16 h-16 rounded-2xl bg-surface hover:bg-surface-hover active:bg-surface-pressed disabled:opacity-50 flex items-center justify-center min-h-touch"
          aria-label={t('pin.backspace_label')}
        >
          <IconBackspace size={28} />
        </button>
        <button
          type="button"
          onClick={() => tap('0')}
          disabled={busy}
          className="w-16 h-16 rounded-2xl text-2xl font-medium bg-surface hover:bg-surface-hover active:bg-surface-pressed disabled:opacity-50 min-h-touch"
          aria-label={t('pin.digit_label', { digit: '0' })}
        >
          0
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={busy || pin.length < 4}
          className="w-16 h-16 rounded-2xl bg-accent text-white disabled:opacity-40 text-sm font-medium min-h-touch"
          aria-label={t('pin.submit_label')}
        >
          {t('pin.submit')}
        </button>
      </div>
    </div>
  );
}
