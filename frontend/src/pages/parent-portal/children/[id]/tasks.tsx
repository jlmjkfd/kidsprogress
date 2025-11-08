/**
 * Child Tasks Management Page
 */
import { useTranslation } from "react-i18next";
import { IconPlus, IconChecklist } from "@tabler/icons-react";

export default function ChildTasksPage() {
  const { t } = useTranslation(["common", "tasks"]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900">{t("tasks:manage_tasks")}</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors min-h-[44px]">
          <IconPlus size={20} />
          <span className="hidden sm:inline">{t("tasks:create_task")}</span>
          <span className="sm:hidden">{t("common:add")}</span>
        </button>
      </div>

      {/* Placeholder content */}
      <div className="bg-white rounded-lg shadow-sm p-8 text-center">
        <IconChecklist size={48} className="mx-auto text-gray-400 mb-4" />
        <p className="text-gray-600">{t("tasks:no_tasks_yet")}</p>
        <p className="text-sm text-gray-500 mt-2">{t("tasks:create_first_task")}</p>
      </div>
    </div>
  );
}
