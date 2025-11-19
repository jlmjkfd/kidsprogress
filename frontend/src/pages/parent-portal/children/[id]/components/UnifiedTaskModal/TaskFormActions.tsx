/**
 * TaskFormActions - Cancel and Submit buttons for task form
 */
import { useTranslation } from "react-i18next";

interface TaskFormActionsProps {
  isSubmitting: boolean;
  isEditMode: boolean;
  isRecurringTemplate: boolean;
  canSubmit: boolean;
  onCancel: () => void;
}

export function TaskFormActions({
  isSubmitting,
  isEditMode,
  isRecurringTemplate,
  canSubmit,
  onCancel,
}: TaskFormActionsProps) {
  const { t } = useTranslation(["common", "tasks"]);

  const getSubmitButtonText = () => {
    if (isSubmitting) return t("common:saving");
    if (!isEditMode) return t("common:create");
    if (isRecurringTemplate) return t("tasks:update_template");
    return t("common:save");
  };

  return (
    <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row">
      <button
        type="button"
        onClick={onCancel}
        className="min-h-[44px] flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50"
        disabled={isSubmitting}
      >
        {t("common:cancel")}
      </button>
      <button
        type="submit"
        className="min-h-[44px] flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
        disabled={isSubmitting || !canSubmit}
      >
        {getSubmitButtonText()}
      </button>
    </div>
  );
}
