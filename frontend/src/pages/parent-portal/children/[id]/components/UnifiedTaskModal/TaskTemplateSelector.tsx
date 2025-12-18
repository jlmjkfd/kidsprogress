/**
 * TaskTemplateSelector - Choose between standard and informational task templates, or from template library
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { IconTemplate } from "@tabler/icons-react";
import { SchedulingType } from "@/types/task";
import { TaskTemplate } from "@/types/template";
import TemplateLibrarySelector from "./TemplateLibrarySelector";

interface TaskCollection {
  _id: string;
  name: string;
}

interface TaskTemplateSelectorProps {
  taskTemplate: "standard" | "informational" | "from_library";
  defaultCollection?: TaskCollection;
  informationalCollection?: TaskCollection;
  currentCollectionId: string;
  onTemplateChange: (
    template: "standard" | "informational" | "from_library",
    updates: {
      is_informational: boolean;
      collection_id: string;
      scheduling_type: SchedulingType;
      blocks_other_tasks: boolean;
      template_id?: string;
    }
  ) => void;
  onLibraryTemplateSelect?: (template: TaskTemplate) => void;
}

export function TaskTemplateSelector({
  taskTemplate,
  defaultCollection,
  informationalCollection,
  currentCollectionId,
  onTemplateChange,
  onLibraryTemplateSelect,
}: TaskTemplateSelectorProps) {
  const { t } = useTranslation(["tasks"]);
  const [showLibraryModal, setShowLibraryModal] = useState(false);

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        {t("tasks:task_template")}
      </label>
      <div className="grid grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => {
            onTemplateChange("standard", {
              is_informational: false,
              collection_id: defaultCollection?._id || currentCollectionId,
              scheduling_type: SchedulingType.FLEXIBLE,
              blocks_other_tasks: false,
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
        <button
          type="button"
          onClick={() => setShowLibraryModal(true)}
          className={`rounded-lg border-2 p-4 text-left transition-all ${
            taskTemplate === "from_library"
              ? "border-purple-600 bg-purple-50"
              : "border-gray-300 hover:border-gray-400"
          }`}
        >
          <div className="flex items-center gap-2 font-medium">
            <IconTemplate size={18} />
            <span>{t("tasks:template_from_library")}</span>
          </div>
          <div className="mt-1 text-xs text-gray-600">
            {t("tasks:template_from_library_hint")}
          </div>
        </button>
      </div>

      {/* Template Library Modal */}
      {showLibraryModal && (
        <TemplateLibrarySelector
          onSelect={(template) => {
            setShowLibraryModal(false);
            onLibraryTemplateSelect?.(template);
          }}
          onClose={() => setShowLibraryModal(false)}
        />
      )}
    </div>
  );
}
