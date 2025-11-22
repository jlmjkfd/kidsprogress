/**
 * Child Analysis Page - Select template to view analysis
 */
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { IconChartLine, IconTemplate } from "@tabler/icons-react";
import { useMyTemplates } from "@/api/queries/useTemplates";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function ChildAnalysisPage() {
  const { t } = useTranslation(["tasks", "common"]);
  const { childId } = useParams<{ childId: string }>();
  const navigate = useNavigate();

  const { data: templates = [], isLoading } = useMyTemplates();

  // Filter templates that have analysis enabled
  const analyzableTemplates = templates.filter(
    (template) => template.analysis_handler && template.analysis_handler !== "none"
  );

  const handleSelectTemplate = (templateId: string) => {
    navigate(`/parent-portal/children/${childId}/analysis/${templateId}`);
  };

  if (isLoading) {
    return <LoadingSpinner size="md" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900">
          {t("tasks:analysis.title", "Analysis")}
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          {t("tasks:analysis.select_template_desc", "Select a template to view progress and insights")}
        </p>
      </div>

      {analyzableTemplates.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
          <IconChartLine size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {t("tasks:analysis.no_templates", "No Templates with Analysis")}
          </h3>
          <p className="text-gray-600 mb-4">
            {t("tasks:analysis.no_templates_desc", "Add templates from the library to start tracking progress")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {analyzableTemplates.map((template) => (
            <button
              key={template.template_id}
              onClick={() => handleSelectTemplate(template.template_id)}
              className="bg-white rounded-lg shadow-sm border hover:shadow-md hover:border-primary-300 transition-all p-6 text-left"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <IconTemplate size={24} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {template.name}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {template.category_path}
                  </p>
                </div>
              </div>

              {template.description && (
                <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                  {template.description}
                </p>
              )}

              <div className="flex items-center gap-2 text-sm text-primary-600">
                <IconChartLine size={16} />
                <span>{t("tasks:analysis.view_report", "View Report")}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
