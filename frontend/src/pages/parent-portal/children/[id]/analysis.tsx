/**
 * Child Analysis Page
 */
import { useTranslation } from "react-i18next";
import { IconChartBar } from "@tabler/icons-react";

export default function ChildAnalysisPage() {
  const { t } = useTranslation(["common"]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl md:text-2xl font-bold text-gray-900">{t("common:child_management.analysis")}</h2>

      {/* Placeholder content */}
      <div className="bg-white rounded-lg shadow-sm p-8 text-center">
        <IconChartBar size={48} className="mx-auto text-gray-400 mb-4" />
        <p className="text-gray-600">{t("common:no_data_yet")}</p>
        <p className="text-sm text-gray-500 mt-2">{t("common:analysis_description")}</p>
      </div>
    </div>
  );
}
