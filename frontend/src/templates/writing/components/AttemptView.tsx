import { useState } from "react";
import { useTranslation } from "react-i18next";
import { IconPencil, IconStar, IconBulb, IconSparkles, IconArrowRight } from "@tabler/icons-react";
import type { AttemptViewProps } from "@/templates/_shared/types/plugin-interface";
import type { WritingDetailedData, WritingMeasuredData, WritingLLMAnalysis, ImprovementSuggestion } from '../types';

export default function AttemptView({
  completion,
}: AttemptViewProps<WritingDetailedData, WritingMeasuredData>) {
  const { t } = useTranslation(["tasks"]);
  const [showImproved, setShowImproved] = useState(false);

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
  const improvedVersion = llmAnalysis?.improved_version;

  // Helper to check if improvement is detailed object
  const isDetailedImprovement = (imp: unknown): imp is ImprovementSuggestion => {
    return typeof imp === 'object' && imp !== null && 'aspect' in imp;
  };

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
              <h4 className="mb-3 text-base sm:text-lg font-semibold text-orange-700">
                {t("tasks:areas_for_improvement")}
              </h4>
              <div className="space-y-4">
                {improvements.map((improvement, index) => {
                  if (isDetailedImprovement(improvement)) {
                    // Detailed improvement with examples
                    return (
                      <div key={index} className="rounded-lg bg-orange-50 p-4">
                        <div className="mb-2 flex items-start gap-2">
                          <IconBulb size={20} className="text-orange-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900">{improvement.aspect}</div>
                            <p className="text-sm text-gray-700 mt-1">{improvement.suggestion}</p>
                          </div>
                        </div>
                        <div className="ml-7 mt-3 space-y-2">
                          <div className="rounded border border-orange-200 bg-white p-3">
                            <div className="text-xs font-medium text-orange-700 mb-1">Your writing:</div>
                            <div className="text-sm text-gray-700 italic">"{improvement.example}"</div>
                          </div>
                          <div className="flex items-center justify-center">
                            <IconArrowRight size={16} className="text-green-600" />
                          </div>
                          <div className="rounded border border-green-200 bg-green-50 p-3">
                            <div className="text-xs font-medium text-green-700 mb-1">Could be:</div>
                            <div className="text-sm text-gray-700 italic">"{improvement.improved_example}"</div>
                          </div>
                        </div>
                      </div>
                    );
                  } else {
                    // Simple string improvement
                    return (
                      <div key={index} className="flex items-start gap-2">
                        <span className="text-orange-600 mt-1">→</span>
                        <span className="text-sm sm:text-base text-gray-700">{improvement}</span>
                      </div>
                    );
                  }
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Improved Version */}
      {improvedVersion && (
        <div className="rounded-2xl bg-gradient-to-br from-green-50 to-blue-50 p-4 shadow-lg sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 sm:text-xl">
              <IconSparkles className="text-green-600" size={24} />
              {t("tasks:improved_version")}
            </h3>
            <button
              onClick={() => setShowImproved(!showImproved)}
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow hover:bg-gray-50"
            >
              {showImproved ? t("tasks:hide") : t("tasks:show")}
            </button>
          </div>

          {showImproved && (
            <div className="space-y-4">
              {/* Improved Writing */}
              <div className="rounded-xl bg-white p-4 shadow">
                <h4 className="mb-3 font-bold text-gray-900">{improvedVersion.title}</h4>
                <div className="prose max-w-none">
                  <p className="whitespace-pre-wrap text-sm sm:text-base text-gray-700 leading-relaxed">
                    {improvedVersion.content}
                  </p>
                </div>
              </div>

              {/* Key Changes */}
              {improvedVersion.key_changes && improvedVersion.key_changes.length > 0 && (
                <div className="rounded-xl bg-white p-4 shadow">
                  <h4 className="mb-3 font-semibold text-gray-900">{t("tasks:key_improvements")}</h4>
                  <div className="space-y-3">
                    {improvedVersion.key_changes.map((change, index) => (
                      <div key={index} className="border-l-4 border-green-500 pl-4">
                        <div className="mb-2 text-sm">
                          <span className="font-medium text-gray-700">{t("tasks:original")}:</span>
                          <div className="mt-1 italic text-gray-600">"{change.original}"</div>
                        </div>
                        <div className="mb-2 text-sm">
                          <span className="font-medium text-green-700">{t("tasks:improved")}:</span>
                          <div className="mt-1 italic text-gray-700">"{change.improved}"</div>
                        </div>
                        <div className="text-xs text-gray-600">
                          <span className="font-medium">{t("tasks:why")}:</span> {change.why}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
