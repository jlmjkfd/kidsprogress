/**
 * TaskTemplateSelector - Choose between standard and informational task templates
 */
import { useTranslation } from "react-i18next";
import { SchedulingType } from "@/types/task";

interface TaskCollection {
  _id: string;
  name: string;
}

interface TaskTemplateSelectorProps {
  taskTemplate: "standard" | "informational";
  defaultCollection?: TaskCollection;
  informationalCollection?: TaskCollection;
  currentCollectionId: string;
  onTemplateChange: (
    template: "standard" | "informational",
    updates: {
      is_informational: boolean;
      collection_id: string;
      scheduling_type: SchedulingType;
      blocks_other_tasks: boolean;
      can_be_interrupted: boolean;
    }
  ) => void;
}

export function TaskTemplateSelector({
  taskTemplate,
  defaultCollection,
  informationalCollection,
  currentCollectionId,
  onTemplateChange,
}: TaskTemplateSelectorProps) {
  const { t } = useTranslation(["tasks"]);

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        {t("tasks:task_template")}
      </label>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => {
            onTemplateChange("standard", {
              is_informational: false,
              collection_id: defaultCollection?._id || currentCollectionId,
              scheduling_type: SchedulingType.FLEXIBLE,
              blocks_other_tasks: false,
              can_be_interrupted: true,
            });
          }}
          className={`rounded-lg border-2 p-4 text-left transition-all ${
            taskTemplate === "standard"
              ? "border-blue-600 bg-blue-50"
              : "border-gray-300 hover:border-gray-400"
          }`}
        >
          <div className="font-medium">{t("tasks:template_standard")}</div>
          <div className="mt-1 text-xs text-gray-600">
            {t("tasks:template_standard_hint")}
          </div>
        </button>
        <button
          type="button"
          onClick={() => {
            onTemplateChange("informational", {
              is_informational: true,
              collection_id:
                informationalCollection?._id ||
                defaultCollection?._id ||
                currentCollectionId,
              scheduling_type: SchedulingType.FIXED_TIME,
              blocks_other_tasks: true,
              can_be_interrupted: false,
            });
          }}
          className={`rounded-lg border-2 p-4 text-left transition-all ${
            taskTemplate === "informational"
              ? "border-blue-600 bg-blue-50"
              : "border-gray-300 hover:border-gray-400"
          }`}
        >
          <div className="font-medium">{t("tasks:template_informational")}</div>
          <div className="mt-1 text-xs text-gray-600">
            {t("tasks:template_informational_hint")}
          </div>
        </button>
      </div>
    </div>
  );
}
