/**
 * Writing TaskExecutor - Writing interface with title and content inputs
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { IconSend, IconLoader } from "@tabler/icons-react";
import type { TaskExecutorProps } from "@/templates/_shared/types/plugin-interface";
import type { WritingExecution, WritingCompletion } from '../types';

export default function TaskExecutor({
  executionData,
  onComplete,
  onCancel,
  setIsComplete,
}: TaskExecutorProps<WritingExecution, WritingCompletion>) {
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
      const completionData: WritingCompletion = {
        title: title.trim(),
        content: content.trim(),
        started_at: startedAt,
        content_type: contentType,
      };
      await onComplete(completionData);
      setIsComplete(true); // Auto-complete task
    } catch {
      setError(t("tasks:execution.submit_failed"));
      setIsSubmitting(false);
    }
  };

  // For writing content type
  if (contentType === "writing") {
    return (
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Header */}
        <div className="border-b pb-4">
          <h2 className="text-lg md:text-xl font-semibold text-gray-900">
            {t("tasks:execution.writing_task")}
          </h2>
        </div>

        {/* Writing Prompts */}
        {prompts.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 md:p-4">
            <h3 className="font-medium text-blue-900 mb-2 text-sm md:text-base">
              {t("tasks:execution.writing_prompt")}
            </h3>
            <ul className="text-sm text-blue-800 space-y-1">
              {prompts.map((prompt, idx) => (
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
            className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm md:text-base"
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
            <span className={`text-xs md:text-sm ${
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
            className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm md:text-base"
            rows={10}
            disabled={isSubmitting}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 md:px-4 py-2 md:py-3 rounded-lg text-xs md:text-sm">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="w-full sm:flex-1 px-4 md:px-6 py-2 md:py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 font-medium text-sm md:text-base"
          >
            {t("common:cancel")}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full sm:flex-1 px-4 md:px-6 py-2 md:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2 text-sm md:text-base"
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
