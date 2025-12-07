/**
 * Template Library - Browse and add templates to "My Templates"
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  IconArrowLeft,
  IconBook,
  IconLock,
  IconCheck,
  IconFilter,
  IconSearch,
  IconLoader2,
} from "@tabler/icons-react";
import {
  useTemplateLibrary,
  useAddTemplate,
  useCheckTemplateAdded,
} from "@/api/templateLibrary";
import { TaskTemplate } from "@/types/template";

export default function TemplateLibraryPage() {
  const { t } = useTranslation(["templates", "common"]);
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const { data: templates = [], isLoading } = useTemplateLibrary();
  const addTemplate = useAddTemplate();

  // Extract unique categories
  const categories = ["all", ...new Set(templates.map((t) => t.category_path))];

  // Filter templates
  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      searchQuery === "" ||
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      categoryFilter === "all" || template.category_path === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const handleAddTemplate = async (templateId: string) => {
    try {
      await addTemplate.mutateAsync(templateId);
    } catch (error) {
      console.error("Failed to add template:", error);
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
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <IconArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                {t("templates:library.title")}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {t("templates:library.subtitle")}
              </p>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder={t("templates:library.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="relative">
              <IconFilter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === "all"
                      ? t("templates:library.allCategories")
                      : cat}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Template Grid */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-12">
            <IconBook className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">
              {t("templates:library.noTemplatesFound")}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.template_id}
                template={template}
                onAdd={handleAddTemplate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface TemplateCardProps {
  template: TaskTemplate;
  onAdd: (templateId: string) => void;
}

function TemplateCard({ template, onAdd }: TemplateCardProps) {
  const { t } = useTranslation(["templates", "common"]);
  const [isAdding, setIsAdding] = useState(false);
  const { data: checkData } = useCheckTemplateAdded(template.template_id);
  const isAdded = checkData?.is_added || false;

  const handleClick = async () => {
    if (isAdded || isAdding) return;
    setIsAdding(true);
    try {
      await onAdd(template.template_id);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900 flex-1">
          {template.name}
        </h3>
        {template.is_premium && (
          <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
            <IconLock className="w-3 h-3" />
            {t("templates:library.premium")}
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 mb-4 line-clamp-3">
        {template.description || t("templates:library.noDescription")}
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

      {/* Add Button */}
      <button
        onClick={handleClick}
        disabled={isAdded || isAdding}
        className={`w-full py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
          isAdded
            ? "bg-green-50 text-green-700 cursor-default"
            : isAdding
            ? "bg-gray-400 text-white cursor-wait"
            : template.is_premium
            ? "bg-amber-500 text-white hover:bg-amber-600"
            : "bg-blue-500 text-white hover:bg-blue-600"
        }`}
      >
        {isAdding ? (
          <>
            <IconLoader2 className="w-4 h-4 animate-spin" />
            {t("common:loading")}
          </>
        ) : isAdded ? (
          <>
            <IconCheck className="w-4 h-4" />
            {t("templates:library.added")}
          </>
        ) : (
          t("templates:library.addToMyTemplates")
        )}
      </button>
    </div>
  );
}
