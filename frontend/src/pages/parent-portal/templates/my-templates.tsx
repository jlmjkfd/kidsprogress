/**
 * My Templates - User's template collection
 */
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  IconArrowLeft,
  IconBook,
  IconTrash,
  IconPlus,
} from "@tabler/icons-react";
import { useMyTemplates, useRemoveTemplate } from "@/api/templateLibrary";

export default function MyTemplatesPage() {
  const { t } = useTranslation(["templates", "common"]);
  const navigate = useNavigate();

  const { data: templates = [], isLoading } = useMyTemplates();
  const removeTemplate = useRemoveTemplate();

  const handleRemoveTemplate = async (templateId: string) => {
    if (!confirm(t("templates:myTemplates.confirmRemove"))) {
      return;
    }

    try {
      await removeTemplate.mutateAsync(templateId);
    } catch (error) {
      console.error("Failed to remove template:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">{t("common:loading")}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 md:py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <IconArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                  {t("templates:myTemplates.title")}
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  {t("templates:myTemplates.subtitle")}
                </p>
              </div>
            </div>

            <button
              onClick={() => navigate("/parent-portal/templates/library")}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <IconPlus className="w-4 h-4" />
              <span className="hidden sm:inline">
                {t("templates:myTemplates.browseLibrary")}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Template Grid */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {templates.length === 0 ? (
          <div className="text-center py-12">
            <IconBook className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 mb-4">
              {t("templates:myTemplates.noTemplates")}
            </p>
            <button
              onClick={() => navigate("/parent-portal/templates/library")}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <IconPlus className="w-5 h-5" />
              {t("templates:myTemplates.addFirstTemplate")}
            </button>
          </div>
        ) : (
          <div>
            <div className="mb-4 text-sm text-gray-600">
              {t("templates:myTemplates.templateCount", {
                count: templates.length,
              })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((template) => (
                <div
                  key={template.template_id}
                  className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 flex-1">
                      {template.name}
                    </h3>
                    {template.is_premium && (
                      <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                        {t("templates:library.premium")}
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                    {template.description ||
                      t("templates:library.noDescription")}
                  </p>

                  {/* Category */}
                  <div className="text-xs text-gray-500 mb-4">
                    {template.category_path}
                  </div>

                  {/* Tags */}
                  {template.tags && template.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {template.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleRemoveTemplate(template.template_id)}
                      className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                      title={t("templates:myTemplates.remove")}
                    >
                      <IconTrash className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        {t("templates:myTemplates.remove")}
                      </span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
