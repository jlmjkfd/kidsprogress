/**
 * Edit Child Information Modal
 */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { IconDeviceFloppy } from '@tabler/icons-react';
import { useUpdateChild } from '@/api/mutations/useUpdateChild';
import BaseModal from '@/components/modal/BaseModal';
import { getTodayString } from '@/utils/dateUtils';
import type { Child } from '@/types/child';

interface EditChildModalProps {
  isOpen: boolean;
  onClose: () => void;
  child: Child;
}

export default function EditChildModal({ isOpen, onClose, child }: EditChildModalProps) {
  const { t } = useTranslation(['common', 'errors']);
  const [name, setName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [pinRequired, setPinRequired] = useState(false);
  const [pin, setPin] = useState('');
  const [language, setLanguage] = useState<string>('');

  const updateChildMutation = useUpdateChild();

  // Initialize form with child data when modal opens
  useEffect(() => {
    if (isOpen && child) {
      setName(child.name);
      setDateOfBirth(child.date_of_birth || '');
      setPinRequired(!!child.pin_hash);
      setPin('');
      setLanguage(child.language || '');
    }
  }, [isOpen, child]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await updateChildMutation.mutateAsync({
        childId: child._id,
        name,
        date_of_birth: dateOfBirth,
        language: language || undefined,
        // Only include pin if it's been changed
        ...(pin ? { pin_required: pinRequired, pin } : {}),
      });

      onClose();
    } catch (error) {
      console.error('Failed to update child:', error);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={t('common:edit_child_info')}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700">
            {t('common:child_name')}
          </label>
          <input
            id="edit-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Date of Birth */}
        <div>
          <label htmlFor="edit-dateOfBirth" className="block text-sm font-medium text-gray-700">
            {t('common:date_of_birth')}
          </label>
          <input
            id="edit-dateOfBirth"
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            required
            max={getTodayString()}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Language */}
        <div>
          <label htmlFor="edit-language" className="block text-sm font-medium text-gray-700">
            {t('common:child_info.preferred_language')}
          </label>
          <select
            id="edit-language"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">{t('common:child_info.inherit_parent')}</option>
            <option value="en">{t('common:languages.en')}</option>
            <option value="zh">{t('common:languages.zh')}</option>
          </select>
        </div>

        {/* PIN Section */}
        <div className="border-t pt-4">
          <div className="flex items-center mb-4">
            <input
              id="edit-pinRequired"
              type="checkbox"
              checked={pinRequired}
              onChange={(e) => setPinRequired(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="edit-pinRequired" className="ml-2 text-sm text-gray-700">
              {t('common:require_pin')}
            </label>
          </div>

          {pinRequired && (
            <div>
              <label htmlFor="edit-pin" className="block text-sm font-medium text-gray-700">
                {child.pin_hash ? t('common:new_pin_optional') : t('common:pin')}
              </label>
              <input
                id="edit-pin"
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                required={pinRequired && !child.pin_hash}
                minLength={4}
                maxLength={6}
                pattern="[0-9]*"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder={child.pin_hash ? t('common:leave_blank_to_keep') : t('common:pin_placeholder')}
              />
              <p className="mt-1 text-xs text-gray-500">
                {child.pin_hash
                  ? t('common:pin_hint_optional')
                  : t('common:pin_hint')}
              </p>
            </div>
          )}
        </div>

        {/* Error Message */}
        {updateChildMutation.isError && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
            {t('errors:failed_to_update_child')}
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
            disabled={updateChildMutation.isPending}
            className="flex flex-1 items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {updateChildMutation.isPending ? (
              <span>{t('common:buttons.saving')}</span>
            ) : (
              <>
                <IconDeviceFloppy className="h-5 w-5" />
                <span>{t('common:buttons.save')}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </BaseModal>
  );
}
