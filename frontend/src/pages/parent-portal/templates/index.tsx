/**
 * Template Management Page
 * List, create, edit, and delete task templates
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import {
  IconTemplate,
  IconPlus,
  IconX,
  IconEye,
  IconApps,
} from "@tabler/icons-react";
import { useMyTemplates } from "@/api/queries/useTemplates";
import { useRemoveTemplate } from "@/api/mutations/useTemplateMutations";
import type { TaskTemplate } from "@/types/template";
import CreateTemplateModal from "./components/CreateTemplateModal";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function TemplatesPage() {
  const { t } = useTranslation(["tasks", "common"]);
  const location = useLocation();
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Fetch user's added templates
  const { data: templates = [], isLoading } = useMyTemplates();

  const removeTemplate = useRemoveTemplate();

  const handleRemove = async (templateId: string) => {
    if (confirm(t("tasks:templates.confirm_remove"))) {
      await removeTemplate.mutateAsync(templateId);
    }
  };

  const getHandlerLabel = (handler: string) => {
    const labels: Record<string, string> = {
      passive_form: "Passive Form",
      interactive_quiz: "Interactive Quiz",
      content_creation: "Content Creation",
      external_link: "External Link",
    };
    return labels[handler] || handler;
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
            <IconTemplate size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              {t("tasks:templates.title", "Task Templates")}
            </h1>
            <p className="text-sm text-gray-500">
              {t("tasks:templates.subtitle", "Create and manage reusable task templates")}
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 shadow-md hover:shadow-lg transition-all font-medium"
        >
          <IconPlus size={20} />
          <span>{t("tasks:templates.create", "Create Template")}</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <Link
          to="/parent-portal/templates"
          className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
            location.pathname === "/parent-portal/templates"
              ? "text-purple-600 border-b-2 border-purple-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <IconTemplate size={18} />
          <span>{t("tasks:templates.my_templates")}</span>
        </Link>
        <Link
          to="/parent-portal/templates/library"
          className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
            location.pathname === "/parent-portal/templates/library"
              ? "text-purple-600 border-b-2 border-purple-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <IconApps size={18} />
          <span>{t("tasks:templates.library")}</span>
        </Link>
      </div>

      {/* Templates List */}
      {isLoading ? (
        <LoadingSpinner size="md" />
      ) : templates.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <IconTemplate size={32} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {t("tasks:templates.no_templates", "No templates yet")}
          </h3>
          <p className="text-gray-600 mb-6">
            {t(
              "tasks:templates.no_templates_desc",
              "Create your first template to get started"
            )}
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 shadow-md font-medium"
          >
            <IconPlus size={20} />
            <span>{t("tasks:templates.create", "Create Template")}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template: TaskTemplate) => (
            <div
              key={template.template_id}
              className="bg-white rounded-xl shadow-sm border hover:shadow-md transition-all"
            >
              <div className="p-6">
                {/* Template Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {template.name}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">{template.category_path}</p>
                  </div>
                  {template.is_public && (
                    <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                      {t("tasks:templates.public", "Public")}
                    </span>
                  )}
                </div>

                {/* Description */}
                {template.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {template.description}
                  </p>
                )}

                {/* Handler Type */}
                <div className="mb-4">
                  <span className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-700 text-sm font-medium rounded-full">
                    {getHandlerLabel(template.execution_handler)}
                  </span>
                </div>

                {/* Tags */}
                {template.tags && template.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {template.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md"
                      >
                        #{tag}
                      </span>
                    ))}
                    {template.tags.length > 3 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">
                        +{template.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t">
                  <button
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors text-sm font-medium"
                  >
                    <IconEye size={16} />
                    <span>{t("common:view", "View")}</span>
                  </button>
                  <button
                    onClick={() => handleRemove(template.template_id)}
                    className="flex items-center justify-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
                  >
                    <IconX size={16} />
                    <span>{t("tasks:templates.remove")}</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Template Modal */}
      <CreateTemplateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
}
