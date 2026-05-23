/**
 * Quick Capture Modal
 *
 * Modal for kids to quickly capture what they're doing right now.
 * Creates a task with status=IN_PROGRESS and quick_capture=true.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IconClock, IconAlertCircle } from '@tabler/icons-react';
import { BaseModal } from './modal/BaseModal';
import { useCreateTaskAsChild } from '@/api/mutations/useTaskMutations';
import { ChildTaskCreate } from '@/types/task';

export interface QuickCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  childId: string;
}

export function QuickCaptureModal({ isOpen, onClose, childId }: QuickCaptureModalProps) {
  const { t } = useTranslation('tasks');
  const [title, setTitle] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState<number | ''>('');
  const [error, setError] = useState('');

  const createTaskMutation = useCreateTaskAsChild();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError(t('field_required', { field: t('task_title') }));
      return;
    }

    const taskData: ChildTaskCreate = {
      title: title.trim(),
      estimated_duration_minutes: estimatedDuration ? Number(estimatedDuration) : undefined,
      quick_capture: true,
    };

    try {
      await createTaskMutation.mutateAsync({ childId, data: taskData });
      handleClose();
    } catch (err) {
      setError(t('common:error_occurred'));
    }
  };

  const handleClose = () => {
    setTitle('');
    setEstimatedDuration('');
    setError('');
    onClose();
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('quick_capture.title')}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Description */}
        <p className="text-sm text-gray-600">
          {t('quick_capture.description')}
        </p>

        {/* Title Input */}
        <div>
          <label htmlFor="task-title" className="block text-sm font-medium text-gray-700 mb-1">
            {t('task_title')}
          </label>
          <input
            id="task-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('quick_capture.title_placeholder')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            maxLength={200}
            autoFocus
          />
        </div>

        {/* Duration Input (Optional) */}
        <div>
          <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">
            {t('estimated_duration')} <span className="text-gray-400">({t('description_optional')})</span>
          </label>
          <div className="relative">
            <IconClock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              id="duration"
              type="number"
              value={estimatedDuration}
              onChange={(e) => setEstimatedDuration(e.target.value ? Number(e.target.value) : '')}
              placeholder="30"
              min="1"
              max="480"
              className="w-full pl-10 pr-20 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
              {t('unified_model.minutes')}
            </span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <IconAlertCircle className="h-5 w-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={createTaskMutation.isPending}
            className="w-full sm:w-auto px-6 py-3 min-h-[44px] border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {t('common:cancel')}
          </button>
          <button
            type="submit"
            disabled={createTaskMutation.isPending}
            className="w-full sm:w-auto px-6 py-3 min-h-[44px] bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createTaskMutation.isPending ? t('creating') : t('start')}
          </button>
        </div>
      </form>
    </BaseModal>
  );
}

export default QuickCaptureModal;
