/**
 * Dialog for editing recurring task templates with warning
 */
import { useTranslation } from "react-i18next";
import { RemoveScroll } from "react-remove-scroll";
import { IconX, IconAlertTriangle } from "@tabler/icons-react";

interface EditRecurringTemplateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onEditTemplate: () => void;
  onEditOccurrence: () => void;
  taskTitle: string;
}

export function EditRecurringTemplateDialog({
  isOpen,
  onClose,
  onEditTemplate,
  onEditOccurrence,
  taskTitle,
}: EditRecurringTemplateDialogProps) {
  const { t } = useTranslation(["tasks", "common"]);

  if (!isOpen) return null;

  return (
    <RemoveScroll>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
        <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {t("tasks:edit_recurring_task")}
            </h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <IconX size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="mb-4 flex items-start gap-3 rounded-lg bg-yellow-50 p-4">
              <IconAlertTriangle className="mt-0.5 flex-shrink-0 text-yellow-600" size={20} />
              <div className="text-sm text-yellow-800">
                <p className="font-medium">{t("tasks:edit_recurring_warning_title")}</p>
                <p className="mt-1">{t("tasks:edit_recurring_warning_message")}</p>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600">
                {t("tasks:editing_task")}: <span className="font-medium text-gray-900">{taskTitle}</span>
              </p>
            </div>

            <div className="space-y-3">
              {/* Edit Template Button */}
              <button
                onClick={() => {
                  onClose();
                  onEditTemplate();
                }}
                className="w-full rounded-lg border-2 border-blue-600 bg-blue-50 p-4 text-left transition-colors hover:bg-blue-100"
              >
                <div className="font-medium text-blue-900">
                  {t("tasks:edit_template")}
                </div>
                <div className="mt-1 text-sm text-blue-700">
                  {t("tasks:edit_template_hint")}
                </div>
              </button>

              {/* Edit Single Occurrence Button */}
              <button
                onClick={() => {
                  onClose();
                  onEditOccurrence();
                }}
                className="w-full rounded-lg border-2 border-gray-300 bg-white p-4 text-left transition-colors hover:bg-gray-50"
              >
                <div className="font-medium text-gray-900">
                  {t("tasks:edit_only_this")}
                </div>
                <div className="mt-1 text-sm text-gray-600">
                  {t("tasks:edit_only_this_hint")}
                </div>
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t border-gray-200 p-6">
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              {t("common:cancel")}
            </button>
          </div>
        </div>
      </div>
    </RemoveScroll>
  );
}
