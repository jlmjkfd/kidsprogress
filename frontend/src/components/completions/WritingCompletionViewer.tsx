/**
 * WritingCompletionViewer - View completed writing task with AI feedback
 */
import { useTranslation } from "react-i18next";
import {
  IconStar,
  IconCheck,
  IconBulb,
  IconSparkles,
  IconQuote,
} from "@tabler/icons-react";

interface WritingCompletionViewerProps {
  completion: {
    detailed_data: {
      title: string;
      content: string;
      prompts_used?: string[];
    };
    measured_data: {
      word_count: number;
      character_count: number;
    };
    llm_analysis?: {
      overall_score?: number;
      scores?: {
        grammar?: number;
        vocabulary?: number;
        creativity?: number;
        structure?: number;
        relevance?: number;
      };
      strengths?: string[];
      improvements?: string[];
      feedback_summary?: string;
      highlighted_phrases?: string[];
    };
    completed_at: string;
  };
}

function ScoreBar({ score, label }: { score: number; label: string }) {
  const percentage = (score / 10) * 100;
  const getColor = (s: number) => {
    if (s >= 8) return "bg-green-500";
    if (s >= 6) return "bg-blue-500";
    if (s >= 4) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-600 w-24">{label}</span>
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${getColor(score)} transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-sm font-medium text-gray-700 w-8">{score}/10</span>
    </div>
  );
}

export default function WritingCompletionViewer({
  completion,
}: WritingCompletionViewerProps) {
  const { t } = useTranslation(["tasks"]);
  const { detailed_data, measured_data, llm_analysis, completed_at } = completion;

  return (
    <div className="space-y-6">
      {/* Writing Content */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {detailed_data.title}
          </h2>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
            <span>{t("tasks:completion.word_count", { count: measured_data.word_count })}</span>
            <span>•</span>
            <span>{new Date(completed_at).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Writing Prompts Used */}
        {detailed_data.prompts_used && detailed_data.prompts_used.length > 0 && (
          <div className="px-6 py-3 bg-blue-50 border-b text-sm">
            <span className="font-medium text-blue-800">{t("tasks:completion.prompt_used")}: </span>
            <span className="text-blue-700">{detailed_data.prompts_used.join("; ")}</span>
          </div>
        )}

        {/* Writing Content */}
        <div className="px-6 py-5">
          <div className="prose prose-sm max-w-none whitespace-pre-wrap text-gray-700">
            {detailed_data.content}
          </div>
        </div>
      </div>

      {/* AI Feedback Section */}
      {llm_analysis && (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-4 border-b">
            <div className="flex items-center gap-2">
              <IconSparkles size={20} className="text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                {t("tasks:completion.ai_feedback")}
              </h3>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Overall Score */}
            {llm_analysis.overall_score && (
              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-md">
                  <span className="text-2xl font-bold text-orange-600">
                    {llm_analysis.overall_score}
                  </span>
                </div>
                <div>
                  <div className="font-semibold text-gray-900">
                    {t("tasks:completion.overall_score")}
                  </div>
                  <div className="text-sm text-gray-600">
                    {t("tasks:completion.out_of_10")}
                  </div>
                </div>
              </div>
            )}

            {/* Detailed Scores */}
            {llm_analysis.scores && Object.keys(llm_analysis.scores).length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">
                  {t("tasks:completion.detailed_scores")}
                </h4>
                <div className="space-y-2">
                  {llm_analysis.scores.grammar !== undefined && (
                    <ScoreBar score={llm_analysis.scores.grammar} label={t("tasks:completion.score_grammar")} />
                  )}
                  {llm_analysis.scores.vocabulary !== undefined && (
                    <ScoreBar score={llm_analysis.scores.vocabulary} label={t("tasks:completion.score_vocabulary")} />
                  )}
                  {llm_analysis.scores.creativity !== undefined && (
                    <ScoreBar score={llm_analysis.scores.creativity} label={t("tasks:completion.score_creativity")} />
                  )}
                  {llm_analysis.scores.structure !== undefined && (
                    <ScoreBar score={llm_analysis.scores.structure} label={t("tasks:completion.score_structure")} />
                  )}
                  {llm_analysis.scores.relevance !== undefined && (
                    <ScoreBar score={llm_analysis.scores.relevance} label={t("tasks:completion.score_relevance")} />
                  )}
                </div>
              </div>
            )}

            {/* Feedback Summary */}
            {llm_analysis.feedback_summary && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-blue-800">{llm_analysis.feedback_summary}</p>
              </div>
            )}

            {/* Strengths */}
            {llm_analysis.strengths && llm_analysis.strengths.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <IconCheck size={18} className="text-green-600" />
                  <h4 className="font-medium text-gray-900">
                    {t("tasks:completion.strengths")}
                  </h4>
                </div>
                <ul className="space-y-2">
                  {llm_analysis.strengths.map((strength, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                      {strength}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Improvements */}
            {llm_analysis.improvements && llm_analysis.improvements.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <IconBulb size={18} className="text-yellow-600" />
                  <h4 className="font-medium text-gray-900">
                    {t("tasks:completion.suggestions")}
                  </h4>
                </div>
                <ul className="space-y-2">
                  {llm_analysis.improvements.map((suggestion, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full mt-2 flex-shrink-0" />
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Highlighted Phrases */}
            {llm_analysis.highlighted_phrases && llm_analysis.highlighted_phrases.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <IconQuote size={18} className="text-purple-600" />
                  <h4 className="font-medium text-gray-900">
                    {t("tasks:completion.great_phrases")}
                  </h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {llm_analysis.highlighted_phrases.map((phrase, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-purple-100 text-purple-700 text-sm rounded-full"
                    >
                      "{phrase}"
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
