/**
 * Template Library/Marketplace Page
 * Browse and install public templates (like an app store)
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import {
  IconDownload,
  IconSearch,
  IconFilter,
  IconChevronDown,
  IconChevronUp,
  IconCheck,
  IconStar,
  IconUsers,
  IconTemplate,
  IconApps,
} from "@tabler/icons-react";
import { useTemplates, useMyTemplates } from "@/api/queries/useTemplates";
import { useAddTemplate } from "@/api/mutations/useTemplateMutations";
import type { TaskTemplate } from "@/types/template";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function TemplateLibraryPage() {
  const { t } = useTranslation(["tasks", "common"]);
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [handlerFilter, setHandlerFilter] = useState("");

  // Fetch public templates
  const { data: publicTemplates = [], isLoading } = useTemplates({
    is_public: true,
    category: categoryFilter || undefined,
    execution_handler: handlerFilter || undefined,
  });

  // Fetch user's added templates
  const { data: myTemplates = [] } = useMyTemplates();

  const addTemplate = useAddTemplate();

  const handleAdd = async (template: TaskTemplate) => {
    try {
      await addTemplate.mutateAsync(template.template_id);
    } catch (error) {
      console.error("Failed to add template:", error);
    }
  };

  const isAdded = (templateId: string) => {
    return myTemplates.some((t) => t.template_id === templateId);
  };

  const filteredTemplates = publicTemplates.filter((template) => {
    const matchesSearch =
      !searchQuery ||
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.tags?.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesSearch;
  });

  const getHandlerLabel = (handler: string) => {
    return t(`tasks:templates.handlers.${handler}`, handler);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
            <IconApps size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              {t("tasks:templates.library_title")}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {t("tasks:templates.library_subtitle")}
            </p>
          </div>
        </div>
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

      {/* Search and Filters */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <IconSearch
            size={20}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("tasks:templates.search_placeholder")}
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <IconFilter size={18} className="text-gray-600" />
              <span className="font-medium text-gray-700">{t("common:filters")}</span>
            </div>
            {showFilters ? <IconChevronUp size={18} /> : <IconChevronDown size={18} />}
          </button>

          {showFilters && (
            <div className="p-4 border-t space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Category Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("tasks:templates.category")}
                  </label>
                  <input
                    type="text"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    placeholder="Education/Math/Homework"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Handler Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("tasks:templates.handler_type")}
                  </label>
                  <select
                    value={handlerFilter}
                    onChange={(e) => setHandlerFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">{t("common:all")}</option>
                    <option value="passive_form">
                      {t("tasks:templates.handlers.passive_form")}
                    </option>
                    <option value="interactive_quiz">
                      {t("tasks:templates.handlers.interactive_quiz")}
                    </option>
                    <option value="content_creation">
                      {t("tasks:templates.handlers.content_creation")}
                    </option>
                    <option value="external_link">
                      {t("tasks:templates.handlers.external_link")}
                    </option>
                  </select>
                </div>
              </div>

              {/* Clear Filters */}
              {(categoryFilter || handlerFilter) && (
                <button
                  onClick={() => {
                    setCategoryFilter("");
                    setHandlerFilter("");
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  {t("common:clear_filters")}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Templates Grid */}
      {isLoading ? (
        <LoadingSpinner size="lg" />
      ) : filteredTemplates.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <IconSearch size={32} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {t("tasks:templates.no_results")}
          </h3>
          <p className="text-gray-600">
            {t("tasks:templates.no_results_desc")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template: TaskTemplate) => {
            const added = isAdded(template.template_id);

            return (
              <div
                key={template.template_id}
                className="bg-white rounded-xl shadow-sm border hover:shadow-md transition-all"
              >
                <div className="p-6">
                  {/* Template Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {template.name}
                      </h3>
                      <p className="text-xs text-gray-500">{template.category_path}</p>
                    </div>
                  </div>

                  {/* Description */}
                  {template.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                      {template.description}
                    </p>
                  )}

                  {/* Handler Type Badge */}
                  <div className="mb-4">
                    <span className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
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

                  {/* Stats (placeholder - could come from backend) */}
                  <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <IconUsers size={14} />
                      <span>{Math.floor(Math.random() * 1000)}+ {t("tasks:templates.users")}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <IconStar size={14} className="text-yellow-500" />
                      <span>{(4 + Math.random()).toFixed(1)}</span>
                    </div>
                  </div>

                  {/* Add Button */}
                  <button
                    onClick={() => handleAdd(template)}
                    disabled={added || addTemplate.isPending}
                    className={`w-full py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                      added
                        ? "bg-green-50 text-green-700 cursor-default"
                        : "bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                    }`}
                  >
                    {added ? (
                      <>
                        <IconCheck size={18} />
                        <span>{t("tasks:templates.added")}</span>
                      </>
                    ) : (
                      <>
                        <IconDownload size={18} />
                        <span>
                          {addTemplate.isPending
                            ? t("tasks:templates.adding")
                            : t("tasks:templates.add")}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
