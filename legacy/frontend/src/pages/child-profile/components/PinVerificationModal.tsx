import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IconLock, IconX } from '@tabler/icons-react';

interface PinVerificationModalProps {
  isOpen: boolean;
  childName: string;
  onVerify: (pin: string) => Promise<boolean>;
  onClose: () => void;
}

function PinVerificationModal({
  isOpen,
  childName,
  onVerify,
  onClose,
}: PinVerificationModalProps) {
  const { t } = useTranslation(['common', 'errors']);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (pin.length < 4 || pin.length > 6) {
      setError(t('errors:validation.pin_invalid'));
      return;
    }

    setIsVerifying(true);
    try {
      const isValid = await onVerify(pin);
      if (isValid) {
        setPin('');
        onClose();
      } else {
        setError(t('errors:validation.pin_invalid'));
      }
    } catch {
      setError(t('errors:server_error'));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleClose = () => {
    setPin('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconLock className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              PIN Verification
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <IconX className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <p className="mb-6 text-sm text-gray-600">
          Enter PIN to access {childName}'s profile
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder={t('common:pin_placeholder')}
              className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
              maxLength={6}
              autoFocus
            />
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
            >
              {t('common:buttons.cancel')}
            </button>
            <button
              type="submit"
              disabled={isVerifying}
              className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-blue-400"
            >
              {isVerifying ? t('common:buttons.submitting') : 'Verify'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PinVerificationModal;
