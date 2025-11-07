/**
 * Add Child Modal Component
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IconX, IconUserPlus } from '@tabler/icons-react';
import { useCreateChild } from '@api/mutations/useCreateChild';

interface AddChildModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function AddChildModal({ isOpen, onClose }: AddChildModalProps) {
  const { t } = useTranslation(['common', 'errors']);
  const [name, setName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [pinRequired, setPinRequired] = useState(false);
  const [pin, setPin] = useState('');

  const createChildMutation = useCreateChild();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createChildMutation.mutateAsync({
        name,
        date_of_birth: dateOfBirth,
        pin_required: pinRequired,
        pin: pinRequired ? pin : undefined,
      });

      // Reset form and close modal
      setName('');
      setDateOfBirth('');
      setPinRequired(false);
      setPin('');
      onClose();
    } catch (error) {
      console.error('Failed to create child:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {t('common:add_child')}
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <IconX className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              {t('common:child_name')}
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder={t('common:child_name_placeholder')}
            />
          </div>

          {/* Date of Birth */}
          <div>
            <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700">
              {t('common:date_of_birth')}
            </label>
            <input
              id="dateOfBirth"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              required
              max={new Date().toISOString().split('T')[0]}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* PIN Required */}
          <div className="flex items-center">
            <input
              id="pinRequired"
              type="checkbox"
              checked={pinRequired}
              onChange={(e) => setPinRequired(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="pinRequired" className="ml-2 text-sm text-gray-700">
              {t('common:require_pin')}
            </label>
          </div>

          {/* PIN Input (conditional) */}
          {pinRequired && (
            <div>
              <label htmlFor="pin" className="block text-sm font-medium text-gray-700">
                {t('common:pin')}
              </label>
              <input
                id="pin"
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                required={pinRequired}
                minLength={4}
                maxLength={6}
                pattern="[0-9]*"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder={t('common:pin_placeholder')}
              />
              <p className="mt-1 text-xs text-gray-500">
                {t('common:pin_hint')}
              </p>
            </div>
          )}

          {/* Error Message */}
          {createChildMutation.isError && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
              {t('errors:failed_to_create_child')}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
            >
              {t('common:buttons.cancel')}
            </button>
            <button
              type="submit"
              disabled={createChildMutation.isPending}
              className="flex flex-1 items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {createChildMutation.isPending ? (
                <span>{t('common:buttons.submitting')}</span>
              ) : (
                <>
                  <IconUserPlus className="h-5 w-5" />
                  <span>{t('common:buttons.add')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddChildModal;
