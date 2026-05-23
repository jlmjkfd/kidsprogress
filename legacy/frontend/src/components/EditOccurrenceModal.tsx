/**
 * Modal for editing a single occurrence of a recurring task
 * Allows parent to modify or delete one instance without affecting others
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { RemoveScroll } from "react-remove-scroll";
import { IconX, IconAlertCircle } from "@tabler/icons-react";
import { Task } from "@/types/task";
import { useAddRecurrenceException } from "@/api/mutations/useTaskMutations";

interface EditOccurrenceModalProps {
  task: Task; // The virtual instance
  isOpen: boolean;
  onClose: () => void;
  onEditTemplate?: (templateId: string) => void; // Callback to edit the template
}

export function EditOccurrenceModal({
  task,
  isOpen,
  onClose,
  onEditTemplate,
}: EditOccurrenceModalProps) {
  const { t } = useTranslation(["tasks", "common"]);
  const addExceptionMutation = useAddRecurrenceException();

  const [editOption, setEditOption] = useState<"this" | "all">("this");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state for editing this occurrence
  const occurrenceDate = task.scheduled_date?.split("T")[0] || "";
  const [fixedStart, setFixedStart] = useState(
    task.fixed_time_slot?.start || ""
  );
  const [fixedEnd, setFixedEnd] = useState(task.fixed_time_slot?.end || "");
  const [description, setDescription] = useState(task.description || "");

  if (!isOpen || !task.is_virtual || !task.source_recurring_task_id) {
    return null;
  }

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      if (editOption === "this") {
        // Edit only this occurrence
        const overrides: Record<string, string | { start: string; end: string }> = {};

        // Check what changed
        if (description !== (task.description || "")) {
          overrides.description = description;
        }
        if (
          fixedStart !== task.fixed_time_slot?.start ||
          fixedEnd !== task.fixed_time_slot?.end
        ) {
          overrides.fixed_time_slot = {
            start: fixedStart,
            end: fixedEnd,
          };
        }

        // If there are any overrides, the backend will materialize this virtual task
        if (Object.keys(overrides).length > 0 && task.source_recurring_task_id) {
          await addExceptionMutation.mutateAsync({
            taskId: task.source_recurring_task_id,
            exceptionDate: occurrenceDate,
            exceptionType: "modified",
            overrides,
          });
        }
      } else if (editOption === "all") {
        // Edit all occurrences - redirect to template editing
        if (onEditTemplate && task.source_recurring_task_id) {
          onEditTemplate(task.source_recurring_task_id);
          onClose(); // Close this modal
        }
        return;
      }

      onClose();
    } catch (error) {
      console.error("Failed to update occurrence:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <RemoveScroll>
      <div className="bg-opacity-50 fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black p-4 pt-8">
        <div className="my-8 flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-xl">
          {/* Header - Sticky */}
          <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-lg border-b bg-white p-4 sm:p-6">
            <h2 className="text-lg font-bold text-gray-900 sm:text-xl">
              {t("tasks:edit_occurrence")}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 transition-colors hover:text-gray-600"
              aria-label={t("common:close")}
            >
              <IconX size={24} />
            </button>
          </div>

          {/* Content - Scrollable */}
          <div className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
            {/* Info Banner */}
            <div className="flex gap-3 rounded-lg bg-blue-50 p-4">
              <IconAlertCircle
                size={20}
                className="mt-0.5 flex-shrink-0 text-blue-600"
              />
              <div className="text-sm text-blue-900">
                <p className="font-medium">
                  {t("tasks:recurring_task_notice")}
                </p>
                <p className="mt-1 text-blue-700">
                  {t("tasks:occurrence_date")}:{" "}
                  <strong>{occurrenceDate}</strong>
                </p>
              </div>
            </div>

            {/* Edit Options */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                {t("tasks:edit_option")}
              </label>

              <div className="space-y-2">
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border-2 border-gray-300 p-4 transition-colors hover:bg-gray-50">
                  <input
                    type="radio"
                    name="editOption"
                    value="this"
                    checked={editOption === "this"}
                    onChange={() => setEditOption("this")}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium text-gray-900">
                      {t("tasks:edit_only_this")}
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      {t("tasks:edit_only_this_hint")}
                    </div>
                  </div>
                </label>

                <label className="flex cursor-pointer items-start gap-3 rounded-lg border-2 border-gray-300 p-4 transition-colors hover:bg-gray-50">
                  <input
                    type="radio"
                    name="editOption"
                    value="all"
                    checked={editOption === "all"}
                    onChange={() => setEditOption("all")}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium text-gray-900">
                      {t("tasks:edit_all_occurrences")}
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      {t("tasks:edit_all_occurrences_hint")}
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Edit Fields (only show when editing this occurrence) */}
            {editOption === "this" && (
              <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                <h3 className="font-medium text-gray-900">
                  {t("tasks:edit_details")}
                </h3>

                {/* Title (Read-only) */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    {t("tasks:task_title")}
                  </label>
                  <input
                    type="text"
                    value={task.title}
                    readOnly
                    className="w-full cursor-not-allowed rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-gray-600"
                    title={t("tasks:edit_template_to_change_title")}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {t("tasks:title_read_only_hint")}
                  </p>
                </div>

                {/* Description */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    {t("tasks:description")}
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    rows={3}
                    placeholder={t("tasks:description_placeholder")}
                  />
                  {task.is_virtual &&
                    description !== (task.description || "") && (
                      <p className="mt-1 text-xs text-blue-600">
                        {t("tasks:editing_will_materialize")}
                      </p>
                    )}
                </div>

                {/* Time Slot */}
                {task.fixed_time_slot && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        {t("common:start_time")}
                      </label>
                      <input
                        type="time"
                        value={fixedStart}
                        onChange={(e) => setFixedStart(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        {t("common:end_time")}
                      </label>
                      <input
                        type="time"
                        value={fixedEnd}
                        onChange={(e) => setFixedEnd(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t p-4 sm:p-6">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50"
              disabled={isSubmitting}
            >
              {t("common:cancel")}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? t("common:saving")
                : editOption === "all"
                  ? t("tasks:edit_template")
                  : t("common:save")}
            </button>
          </div>
        </div>
      </div>
    </RemoveScroll>
  );
}
