/**
 * Modal for deleting a single occurrence or entire template of a recurring task
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { RemoveScroll } from "react-remove-scroll";
import { IconX, IconAlertTriangle } from "@tabler/icons-react";
import { Task } from "@/types/task";
import { useAddRecurrenceException } from "@/api/mutations/useTaskMutations";

interface DeleteOccurrenceModalProps {
  task: Task; // The virtual instance
  isOpen: boolean;
  onClose: () => void;
  onDeleteTemplate: (templateId: string) => void;
}

export function DeleteOccurrenceModal({
  task,
  isOpen,
  onClose,
  onDeleteTemplate,
}: DeleteOccurrenceModalProps) {
  const { t } = useTranslation(["tasks", "common"]);
  const addExceptionMutation = useAddRecurrenceException();

  const [deleteOption, setDeleteOption] = useState<"this" | "template">("this");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const occurrenceDate = task.scheduled_date?.split("T")[0] || "";

  if (!isOpen || !task.is_virtual || !task.source_recurring_task_id) {
    return null;
  }

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      if (deleteOption === "template") {
        // Delete the entire template
        onClose();
        onDeleteTemplate(task.source_recurring_task_id);
      } else {
        // Delete only this occurrence
        await addExceptionMutation.mutateAsync({
          taskId: task.source_recurring_task_id,
          exceptionDate: occurrenceDate,
          exceptionType: "deleted",
        });
        onClose();
      }
    } catch (error) {
      console.error("Failed to delete occurrence:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <RemoveScroll>
      <div className="fixed inset-0 z-50 flex items-start justify-center bg-black bg-opacity-50 p-4 pt-8 overflow-y-auto">
        <div className="w-full max-w-2xl my-8 rounded-lg bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b p-4 sm:p-6 bg-white rounded-t-lg">
            <h2 className="text-lg font-bold text-gray-900 sm:text-xl flex items-center gap-2">
              <IconAlertTriangle className="text-red-600" size={24} />
              {t("tasks:delete_recurring_task")}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 transition-colors hover:text-gray-600"
              aria-label={t("common:close")}
            >
              <IconX size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="space-y-6 p-4 sm:p-6">
            {/* Info Banner */}
            <div className="flex gap-3 rounded-lg bg-red-50 p-4">
              <IconAlertTriangle size={20} className="mt-0.5 flex-shrink-0 text-red-600" />
              <div className="text-sm text-red-900">
                <p className="font-medium">{t("tasks:delete_recurring_warning_title")}</p>
                <p className="mt-1">
                  {t("tasks:occurrence_date")}: <strong>{occurrenceDate}</strong>
                </p>
              </div>
            </div>

            {/* Delete Options */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                {t("tasks:delete_option")}
              </label>

              <div className="space-y-2">
                <label className="flex items-start gap-3 rounded-lg border-2 border-red-300 p-4 cursor-pointer hover:bg-red-50 transition-colors">
                  <input
                    type="radio"
                    name="deleteOption"
                    value="this"
                    checked={deleteOption === "this"}
                    onChange={() => setDeleteOption("this")}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium text-red-900">
                      {t("tasks:delete_only_this")}
                    </div>
                    <div className="mt-1 text-sm text-red-700">
                      {t("tasks:delete_only_this_hint")}
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-3 rounded-lg border-2 border-red-500 p-4 cursor-pointer hover:bg-red-100 transition-colors">
                  <input
                    type="radio"
                    name="deleteOption"
                    value="template"
                    checked={deleteOption === "template"}
                    onChange={() => setDeleteOption("template")}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium text-red-900">
                      {t("tasks:delete_template")}
                    </div>
                    <div className="mt-1 text-sm text-red-700">
                      {t("tasks:delete_template_hint")}
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Confirmation Message */}
            {deleteOption === "this" ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="text-sm text-red-900">
                  {t("tasks:delete_occurrence_confirm", { date: occurrenceDate })}
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-red-300 bg-red-100 p-4">
                <p className="text-sm font-medium text-red-900">
                  {t("tasks:delete_template_confirm")}
                </p>
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
              className="rounded-lg bg-red-600 px-4 py-2 font-medium text-white transition-colors hover:bg-red-700"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? t("common:deleting")
                : deleteOption === "template"
                ? t("tasks:delete_template")
                : t("tasks:delete_occurrence")}
            </button>
          </div>
        </div>
      </div>
    </RemoveScroll>
  );
}
