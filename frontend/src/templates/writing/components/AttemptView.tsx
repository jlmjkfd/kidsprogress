import { useTranslation } from "react-i18next";
import { IconPencil, IconStar } from "@tabler/icons-react";
import type { AttemptViewProps } from "@/templates/_shared/types/plugin-interface";
import type { WritingDetailedData, WritingMeasuredData, WritingLLMAnalysis } from '../types';

export default function AttemptView({
  completion,
}: AttemptViewProps<WritingDetailedData, WritingMeasuredData>) {
  const { t } = useTranslation(["tasks"]);

  const title = completion.detailed_data?.title || t("tasks:analysis.untitled");
  const content = completion.detailed_data?.content || "";
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const characterCount = content.length;

  // AI Analysis data (cast to WritingLLMAnalysis for type safety)
  const llmAnalysis = completion.llm_analysis as WritingLLMAnalysis | undefined;
  const overallScore = llmAnalysis?.overall_score;
  const feedbackSummary = llmAnalysis?.feedback_summary;
  const strengths = llmAnalysis?.strengths || [];
  const improvements = llmAnalysis?.improvements || [];

  if (!title && !content) {
    return (
      <div className="rounded-2xl bg-white p-6 text-center shadow-lg">
        <p className="text-gray-600">{t("tasks:no_data_available")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Statistics Summary */}
      <div className="rounded-2xl bg-white p-4 shadow-lg sm:p-6">
        <h3 className="mb-4 text-lg font-bold text-gray-900 sm:text-xl">
          {t("tasks:writing_statistics")}
        </h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl bg-blue-50 p-3 sm:p-4">
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <IconPencil size={20} />
              <span className="text-xs sm:text-sm font-medium">{t("tasks:words")}</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-gray-900">{wordCount}</p>
          </div>
          <div className="rounded-xl bg-purple-50 p-3 sm:p-4">
            <div className="flex items-center gap-2 text-purple-600 mb-1">
              <IconPencil size={20} />
              <span className="text-xs sm:text-sm font-medium">{t("tasks:characters")}</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-gray-900">{characterCount}</p>
          </div>
          {overallScore !== undefined && (
            <div className="rounded-xl bg-yellow-50 p-3 sm:p-4">
              <div className="flex items-center gap-2 text-yellow-600 mb-1">
                <IconStar size={20} />
                <span className="text-xs sm:text-sm font-medium">{t("tasks:ai_score")}</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{overallScore}/10</p>
            </div>
          )}
        </div>
      </div>

      {/* Writing Content */}
      <div className="rounded-2xl bg-white p-4 shadow-lg sm:p-6">
        <h3 className="mb-4 text-lg font-bold text-gray-900 sm:text-xl">{title}</h3>
        <div className="prose max-w-none">
          <p className="whitespace-pre-wrap text-sm sm:text-base text-gray-700 leading-relaxed">
            {content}
          </p>
        </div>
      </div>

      {/* AI Feedback (if available) */}
      {llmAnalysis && (
        <div className="rounded-2xl bg-white p-4 shadow-lg sm:p-6">
          <h3 className="mb-4 text-lg font-bold text-gray-900 sm:text-xl">
            {t("tasks:ai_feedback")}
          </h3>

          {/* Feedback Summary */}
          {feedbackSummary && (
            <div className="mb-4 rounded-xl bg-blue-50 p-4">
              <p className="text-sm sm:text-base text-gray-700 italic">"{feedbackSummary}"</p>
            </div>
          )}

          {/* Strengths */}
          {strengths.length > 0 && (
            <div className="mb-4">
              <h4 className="mb-2 text-base sm:text-lg font-semibold text-green-700">
                {t("tasks:strengths")}
              </h4>
              <ul className="space-y-2">
                {strengths.map((strength, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-green-600 mt-1">✓</span>
                    <span className="text-sm sm:text-base text-gray-700">{strength}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Areas for Improvement */}
          {improvements.length > 0 && (
            <div>
              <h4 className="mb-2 text-base sm:text-lg font-semibold text-orange-700">
                {t("tasks:areas_for_improvement")}
              </h4>
              <ul className="space-y-2">
                {improvements.map((improvement, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-orange-600 mt-1">→</span>
                    <span className="text-sm sm:text-base text-gray-700">{improvement}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
