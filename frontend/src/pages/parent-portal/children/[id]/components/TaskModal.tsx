import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { RemoveScroll } from "react-remove-scroll";
import { IconX, IconCalendar, IconClock } from "@tabler/icons-react";
import { Task, TaskCreate, TaskUpdate, SchedulingType, ObligationLevel } from "@/types/task";
import { useTaskCollections } from "@/api/queries/useTaskCollections";

interface TaskModalProps {
  childId: string;
  task?: Task;
  onClose: () => void;
  onSubmit: (data: TaskCreate | TaskUpdate) => Promise<void>;
}

export function TaskModal({ childId, task, onClose, onSubmit }: TaskModalProps) {
  const { t } = useTranslation(["common", "tasks"]);
  const { data: collections } = useTaskCollections(childId);
  const defaultCollection = collections?.find((c) => c.is_default);

  const [formData, setFormData] = useState({
    title: task?.title || "",
    description: task?.description || "",
    collection_id: task?.collection_id || defaultCollection?._id || "",
    scheduled_date: task?.scheduled_date?.split("T")[0] || "",
    scheduling_type: task?.scheduling_type || SchedulingType.FLEXIBLE,
    obligation_level: task?.obligation_level || ObligationLevel.OPTIONAL,
    priority_boost: task?.priority_boost || 0,
    start_time: task?.preferred_time_slot?.start || "",
    end_time: task?.preferred_time_slot?.end || "",
    duration_minutes: task?.ai_attributes?.estimated_duration_minutes || null,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!task && defaultCollection && !formData.collection_id) {
      setFormData((prev) => ({ ...prev, collection_id: defaultCollection._id }));
    }
  }, [defaultCollection, task, formData.collection_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.collection_id) return;

    setIsSubmitting(true);
    try {
      const baseData = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        scheduled_date: formData.scheduled_date ? new Date(formData.scheduled_date).toISOString() : undefined,
        scheduling_type: formData.scheduling_type,
        obligation_level: formData.obligation_level,
        priority_boost: formData.priority_boost,
        preferred_time_slot: formData.start_time && formData.end_time
          ? { start: formData.start_time, end: formData.end_time }
          : undefined,
      };

      if (task) {
        // Update existing task
        await onSubmit(baseData as TaskUpdate);
      } else {
        // Create new task
        const createData: TaskCreate = {
          ...baseData,
          collection_id: formData.collection_id,
          child_id: childId,
          task_type_code: "default", // Required field
        };
        await onSubmit(createData);
      }
      onClose();
    } catch (error) {
      console.error("Failed to save task:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <RemoveScroll>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b sticky top-0 bg-white z-10">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">
              {task ? t("tasks:edit_task") : t("tasks:create_task")}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label={t("common:close")}
            >
              <IconX size={24} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                {t("tasks:task_title")} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder={t("tasks:task_title_placeholder")}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                maxLength={200}
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                {t("tasks:description_optional")}
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t("tasks:description_placeholder")}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
              />
            </div>

            {/* Collection (only for new tasks) */}
            {!task && collections && collections.length > 0 && (
              <div>
                <label htmlFor="collection" className="block text-sm font-medium text-gray-700 mb-2">
                  {t("common:collection")} <span className="text-red-500">*</span>
                </label>
                <select
                  id="collection"
                  value={formData.collection_id}
                  onChange={(e) => setFormData({ ...formData, collection_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">{t("common:select")}</option>
                  {collections.map((col) => (
                    <option key={col._id} value={col._id}>
                      {col.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Scheduled Date */}
            <div>
              <label htmlFor="scheduled_date" className="block text-sm font-medium text-gray-700 mb-2">
                <IconCalendar className="inline mr-1" size={16} />
                {t("tasks:scheduled_date")}
              </label>
              <input
                type="date"
                id="scheduled_date"
                value={formData.scheduled_date}
                onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Time (optional) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="start_time" className="block text-sm font-medium text-gray-700 mb-2">
                  <IconClock className="inline mr-1" size={16} />
                  {t("tasks:routine.start_time")}
                </label>
                <input
                  type="time"
                  id="start_time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="end_time" className="block text-sm font-medium text-gray-700 mb-2">
                  {t("tasks:routine.end_time")}
                </label>
                <input
                  type="time"
                  id="end_time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Obligation Level */}
            <div>
              <label htmlFor="obligation_level" className="block text-sm font-medium text-gray-700 mb-2">
                {t("tasks:routine.obligation_level")}
              </label>
              <select
                id="obligation_level"
                value={formData.obligation_level}
                onChange={(e) => setFormData({ ...formData, obligation_level: e.target.value as ObligationLevel })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={ObligationLevel.MUST_DO}>{t("tasks:routine.obligation_must_do")}</option>
                <option value={ObligationLevel.SHOULD_DO}>{t("tasks:routine.obligation_should_do")}</option>
                <option value={ObligationLevel.OPTIONAL}>{t("tasks:routine.obligation_can_do")}</option>
              </select>
            </div>

            {/* Priority Boost */}
            <div>
              <label htmlFor="priority_boost" className="block text-sm font-medium text-gray-700 mb-2">
                {t("tasks:routine.priority_boost")} ({formData.priority_boost > 0 ? "+" : ""}{formData.priority_boost})
              </label>
              <input
                type="range"
                id="priority_boost"
                min="-5"
                max="5"
                step="1"
                value={formData.priority_boost}
                onChange={(e) => setFormData({ ...formData, priority_boost: parseInt(e.target.value) })}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>{t("common:low")}</span>
                <span>{t("common:normal")}</span>
                <span>{t("common:high")}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors min-h-[44px]"
                disabled={isSubmitting}
              >
                {t("common:cancel")}
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed min-h-[44px]"
                disabled={isSubmitting || !formData.title.trim() || !formData.collection_id}
              >
                {isSubmitting ? t("common:saving") : task ? t("common:save") : t("common:create")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </RemoveScroll>
  );
}
