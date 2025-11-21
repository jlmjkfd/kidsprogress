import { useState } from "react";
import { useTranslation } from "react-i18next";
import { IconX, IconPlus, IconTrash } from "@tabler/icons-react";
import { useCreateTemplate } from "@api/mutations/useTemplateMutations";
import type { CreateTemplateRequest, PassiveFormConfig } from "@/types/template";
import PassiveFormConfigEditor from "./PassiveFormConfigEditor";

interface CreateTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateTemplateModal({ isOpen, onClose }: CreateTemplateModalProps) {
  const { t } = useTranslation(["tasks", "common"]);
  const createTemplate = useCreateTemplate();

  const [formData, setFormData] = useState<Partial<CreateTemplateRequest>>({
    name: "",
    description: "",
    category_path: "",
    execution_handler: "passive_form",
    execution_config: {
      fields: [],
      allow_photos: true,
      allow_notes: true,
    },
    analysis_handler: "none",
    analysis_config: {},
    is_public: false,
    tags: [],
  });

  const [currentTag, setCurrentTag] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = t("tasks:templates.errors.name_required");
    }

    if (!formData.category_path?.trim()) {
      newErrors.category_path = t("tasks:templates.errors.category_required");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      await createTemplate.mutateAsync(formData as CreateTemplateRequest);
      onClose();
      resetForm();
    } catch (error) {
      console.error("Failed to create template:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      category_path: "",
      execution_handler: "passive_form",
      execution_config: {
        fields: [],
        allow_photos: true,
        allow_notes: true,
      },
      analysis_handler: "none",
      analysis_config: {},
      is_public: false,
      tags: [],
    });
    setErrors({});
    setCurrentTag("");
  };

  const handleAddTag = () => {
    if (currentTag.trim() && !formData.tags?.includes(currentTag.trim())) {
      setFormData({
        ...formData,
        tags: [...(formData.tags || []), currentTag.trim()],
      });
      setCurrentTag("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags?.filter((t) => t !== tag) || [],
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {t("tasks:templates.create")}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <IconX size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Template Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("tasks:templates.name")} *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.name ? "border-red-500" : "border-gray-300"
              }`}
              placeholder={t("tasks:templates.name_placeholder")}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("tasks:templates.description")}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t("tasks:templates.description_placeholder")}
            />
          </div>

          {/* Category Path */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("tasks:templates.category")} *
            </label>
            <input
              type="text"
              value={formData.category_path}
              onChange={(e) => setFormData({ ...formData, category_path: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.category_path ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Education/Math/Homework"
            />
            {errors.category_path && (
              <p className="mt-1 text-sm text-red-600">{errors.category_path}</p>
            )}
            <p className="mt-1 text-sm text-gray-500">
              {t("tasks:templates.category_help")}
            </p>
          </div>

          {/* Execution Handler */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("tasks:templates.execution_type")}
            </label>
            <select
              value={formData.execution_handler}
              onChange={(e) => setFormData({ ...formData, execution_handler: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="passive_form">{t("tasks:templates.handlers.passive_form")}</option>
              <option value="interactive_quiz" disabled>
                {t("tasks:templates.handlers.interactive_quiz")} ({t("common:coming_soon")})
              </option>
              <option value="content_creation" disabled>
                {t("tasks:templates.handlers.content_creation")} ({t("common:coming_soon")})
              </option>
              <option value="external_link" disabled>
                {t("tasks:templates.handlers.external_link")} ({t("common:coming_soon")})
              </option>
            </select>
          </div>

          {/* Execution Configuration */}
          {formData.execution_handler === "passive_form" && (
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <PassiveFormConfigEditor
                config={formData.execution_config as PassiveFormConfig}
                onChange={(config) =>
                  setFormData({ ...formData, execution_config: config })
                }
              />
            </div>
          )}

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("tasks:templates.tags")}
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={currentTag}
                onChange={(e) => setCurrentTag(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={t("tasks:templates.tags_placeholder")}
              />
              <button
                onClick={handleAddTag}
                className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
              >
                <IconPlus size={20} />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.tags?.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <IconTrash size={14} />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Public/Private */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_public"
              checked={formData.is_public}
              onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="is_public" className="text-sm text-gray-700">
              {t("tasks:templates.make_public")}
              <span className="block text-xs text-gray-500 mt-1">
                {t("tasks:templates.make_public_help")}
              </span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            {t("common:cancel")}
          </button>
          <button
            onClick={handleSubmit}
            disabled={createTemplate.isPending}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createTemplate.isPending ? t("common:creating") : t("common:create")}
          </button>
        </div>
      </div>
    </div>
  );
}
