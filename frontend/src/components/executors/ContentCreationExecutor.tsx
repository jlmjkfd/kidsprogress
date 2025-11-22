/**
 * ContentCreationExecutor - For writing, drawing, recording tasks
 * Currently implements writing type with title and content inputs
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { IconSend, IconLoader } from "@tabler/icons-react";
import type { ExecutorProps } from "./types";

export function ContentCreationExecutor({
  executionData,
  onComplete,
  onCancel,
}: ExecutorProps) {
  const { t } = useTranslation(["tasks", "common"]);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [startedAt] = useState(new Date().toISOString());

  const contentType = executionData.content_type || "writing";
  const minLength = executionData.min_length;
  const maxLength = executionData.max_length;
  const prompts = executionData.prompts || [];

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

  const validate = (): boolean => {
    setError("");

    if (contentType === "writing") {
      if (!title.trim()) {
        setError(t("tasks:execution.title_required"));
        return false;
      }

      if (!content.trim()) {
        setError(t("tasks:execution.content_required"));
        return false;
      }

      if (minLength && wordCount < minLength) {
        setError(t("tasks:execution.min_words_required", { count: minLength, current: wordCount }));
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await onComplete({
        title: title.trim(),
        content: content.trim(),
        started_at: startedAt,
        content_type: contentType,
      });
    } catch {
      setError(t("tasks:execution.submit_failed"));
      setIsSubmitting(false);
    }
  };

  // For writing content type
  if (contentType === "writing") {
    return (
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="border-b pb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {executionData.template_name || t("tasks:execution.writing_task")}
          </h2>
          {executionData.template_description && (
            <p className="text-sm text-gray-600 mt-1">
              {executionData.template_description}
            </p>
          )}
        </div>

        {/* Writing Prompts */}
        {prompts.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">
              {t("tasks:execution.writing_prompt")}
            </h3>
            <ul className="text-sm text-blue-800 space-y-1">
              {prompts.map((prompt: string, idx: number) => (
                <li key={idx}>• {prompt}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Title Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("tasks:execution.title")} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("tasks:execution.title_placeholder")}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            maxLength={200}
            disabled={isSubmitting}
          />
        </div>

        {/* Content Input */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              {t("tasks:execution.content")} <span className="text-red-500">*</span>
            </label>
            <span className={`text-sm ${
              minLength && wordCount < minLength ? "text-red-500" : "text-gray-500"
            }`}>
              {t("tasks:execution.word_count", { count: wordCount })}
              {minLength && ` / ${minLength} ${t("tasks:execution.min")}`}
              {maxLength && ` (${t("tasks:execution.max")} ${maxLength})`}
            </span>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t("tasks:execution.content_placeholder")}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={12}
            disabled={isSubmitting}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 font-medium"
          >
            {t("common:cancel")}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <IconLoader size={20} className="animate-spin" />
                <span>{t("tasks:execution.submitting")}</span>
              </>
            ) : (
              <>
                <IconSend size={20} />
                <span>{t("tasks:execution.submit")}</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Placeholder for other content types
  return (
    <div className="p-6 text-center text-gray-500">
      {t("tasks:execution.content_type_not_supported", { type: contentType })}
    </div>
  );
}
