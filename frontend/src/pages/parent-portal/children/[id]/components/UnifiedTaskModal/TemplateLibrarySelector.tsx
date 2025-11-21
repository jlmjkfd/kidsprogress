/**
 * TemplateLibrarySelector - Modal to select from installed templates
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { IconX, IconSearch, IconCheck } from "@tabler/icons-react";
import { useMyTemplates } from "@/api/queries/useTemplates";
import type { TaskTemplate } from "@/types/template";

interface TemplateLibrarySelectorProps {
  onSelect: (template: TaskTemplate) => void;
  onClose: () => void;
}

export default function TemplateLibrarySelector({
  onSelect,
  onClose,
}: TemplateLibrarySelectorProps) {
  const { t } = useTranslation(["tasks", "common"]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(null);

  // Fetch user's added templates
  const { data: templates = [], isLoading } = useMyTemplates();

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      !searchQuery ||
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.category_path.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  const getHandlerLabel = (handler: string) => {
    return t(`tasks:templates.handlers.${handler}`, handler);
  };

  const handleSelect = () => {
    if (selectedTemplate) {
      onSelect(selectedTemplate);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-4xl max-h-[80vh] flex flex-col bg-white rounded-xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {t("tasks:templates.select_template")}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {t("tasks:templates.select_template_desc")}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <IconX size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-4 border-b">
          <div className="relative">
            <IconSearch
              size={20}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("tasks:templates.search_placeholder")}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Templates List */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-gray-600">{t("common:loading")}</p>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">
                {searchQuery
                  ? t("tasks:templates.no_results")
                  : t("tasks:templates.no_installed_templates")}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                {t("tasks:templates.visit_library_to_install")}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTemplates.map((template) => (
                <button
                  key={template.template_id}
                  type="button"
                  onClick={() => setSelectedTemplate(template)}
                  className={`text-left p-4 rounded-lg border-2 transition-all ${
                    selectedTemplate?.template_id === template.template_id
                      ? "border-purple-600 bg-purple-50"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 truncate">
                        {template.name}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">
                        {template.category_path}
                      </p>
                    </div>
                    {selectedTemplate?.template_id === template.template_id && (
                      <IconCheck size={20} className="text-purple-600 flex-shrink-0 ml-2" />
                    )}
                  </div>

                  {template.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {template.description}
                    </p>
                  )}

                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md">
                      {getHandlerLabel(template.execution_handler)}
                    </span>
                    {template.tags && template.tags.length > 0 && (
                      <span className="text-xs text-gray-500">
                        +{template.tags.length} {t("tasks:templates.tags")}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            type="button"
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            {t("common:cancel")}
          </button>
          <button
            onClick={handleSelect}
            disabled={!selectedTemplate}
            type="button"
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t("tasks:templates.use_template")}
          </button>
        </div>
      </div>
    </div>
  );
}
