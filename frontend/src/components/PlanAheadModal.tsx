/**
 * Plan Ahead Modal
 *
 * Modal for kids to plan tasks for later.
 * Creates a task with status=PENDING and quick_capture=false.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IconClock, IconCalendar, IconAlertCircle } from '@tabler/icons-react';
import { BaseModal } from './modal/BaseModal';
import { useCreateTaskAsChild } from '@/api/mutations/useTaskMutations';
import { ChildTaskCreate } from '@/types/task';

export interface PlanAheadModalProps {
  isOpen: boolean;
  onClose: () => void;
  childId: string;
}

export function PlanAheadModal({ isOpen, onClose, childId }: PlanAheadModalProps) {
  const { t } = useTranslation('tasks');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
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

    // Combine date and time if both provided
    let scheduledDateTime: string | undefined;
    if (scheduledDate) {
      if (scheduledTime) {
        scheduledDateTime = `${scheduledDate}T${scheduledTime}:00`;
      } else {
        scheduledDateTime = `${scheduledDate}T00:00:00`;
      }
    }

    const taskData: ChildTaskCreate = {
      title: title.trim(),
      description: description.trim() || undefined,
      scheduled_date: scheduledDateTime,
      scheduled_time: scheduledTime || undefined,
      estimated_duration_minutes: estimatedDuration ? Number(estimatedDuration) : undefined,
      quick_capture: false,
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
    setDescription('');
    setScheduledDate('');
    setScheduledTime('');
    setEstimatedDuration('');
    setError('');
    onClose();
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('plan_ahead.title')}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Description */}
        <p className="text-sm text-gray-600">
          {t('plan_ahead.description')}
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
            placeholder={t('task_title_placeholder')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            maxLength={200}
            autoFocus
          />
        </div>

        {/* Description Input (Optional) */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            {t('description_optional')}
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('description_placeholder')}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        {/* When to do it */}
        <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h4 className="font-semibold text-gray-900">{t('plan_ahead.when_to_do')}</h4>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* Date Input */}
            <div>
              <label htmlFor="scheduled-date" className="block text-sm font-medium text-gray-700 mb-1">
                {t('plan_ahead.scheduled_date')}
              </label>
              <div className="relative">
                <IconCalendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="scheduled-date"
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Time Input */}
            <div>
              <label htmlFor="scheduled-time" className="block text-sm font-medium text-gray-700 mb-1">
                {t('plan_ahead.scheduled_time')}
              </label>
              <div className="relative">
                <IconClock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="scheduled-time"
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  placeholder={t('plan_ahead.time_placeholder')}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
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
            {createTaskMutation.isPending ? t('creating') : t('create_task')}
          </button>
        </div>
      </form>
    </BaseModal>
  );
}

export default PlanAheadModal;
