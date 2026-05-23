/**
 * Task Result Page - View completion result and AI feedback
 */
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { IconArrowLeft, IconStar, IconCheck, IconSparkles } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function TaskResultPage() {
  const { taskId, childId } = useParams<{ taskId: string; childId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation(["tasks", "common"]);

  // Fetch task details
  const { data: task, isLoading: taskLoading } = useQuery({
    queryKey: ["task", taskId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/tasks/${taskId}`);
      return response.data;
    },
    enabled: !!taskId,
  });

  // Fetch completion by task ID
  const { data: completionsData, isLoading: completionLoading } = useQuery({
    queryKey: ["completions", taskId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/completions?task_id=${taskId}`);
      return response.data;
    },
    enabled: !!taskId,
  });

  const completion = completionsData?.completions?.[0];
  const analysis = completion?.llm_analysis;

  const handleBack = () => {
    navigate(`/child-portal/${childId}/tasks`);
  };

  if (taskLoading || completionLoading) {
    return <LoadingSpinner fullScreen size="lg" />;
  }

  if (!task || !completion) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {t("tasks:result_not_found")}
            </h2>
            <p className="text-gray-600 mb-6">{t("tasks:result_not_found_desc")}</p>
            <button
              onClick={handleBack}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {t("tasks:back_to_tasks")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <IconArrowLeft size={20} />
            </button>
            <h1 className="text-lg font-semibold text-gray-900">{task.title}</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Success Header */}
        <div className="bg-white rounded-xl shadow-sm border p-6 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <IconCheck size={32} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {t("tasks:execution.great_job")}
          </h2>
          <p className="text-gray-600">
            {t("tasks:completed_on", {
              date: new Date(completion.completed_at).toLocaleDateString()
            })}
          </p>
        </div>

        {/* AI Feedback */}
        {analysis && (
          <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
            <div className="flex items-center gap-2 text-purple-600">
              <IconSparkles size={24} />
              <h3 className="text-lg font-semibold">{t("tasks:execution.ai_feedback")}</h3>
            </div>

            {/* Overall Score */}
            <div className="flex items-center gap-4 p-4 bg-yellow-50 rounded-lg">
              <div className="text-4xl font-bold text-yellow-600">
                {analysis.overall_score}/10
              </div>
              <div className="flex gap-1">
                {[...Array(10)].map((_, i) => (
                  <IconStar
                    key={i}
                    size={20}
                    className={i < analysis.overall_score ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}
                  />
                ))}
              </div>
            </div>

            {/* Feedback Summary */}
            <p className="text-gray-700 text-lg">{analysis.feedback_summary}</p>

            {/* Strengths */}
            {analysis.strengths?.length > 0 && (
              <div>
                <h4 className="font-semibold text-green-700 mb-2">{t("tasks:execution.strengths")}</h4>
                <ul className="space-y-2">
                  {analysis.strengths.map((s: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-gray-700">
                      <span className="text-green-500">✓</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Areas for Improvement */}
            {analysis.improvements?.length > 0 && (
              <div>
                <h4 className="font-semibold text-blue-700 mb-2">{t("tasks:execution.improvements")}</h4>
                <ul className="space-y-2">
                  {analysis.improvements.map((s: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-gray-700">
                      <span className="text-blue-500">→</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Highlighted Phrases */}
            {analysis.highlighted_phrases?.length > 0 && (
              <div>
                <h4 className="font-semibold text-purple-700 mb-2">{t("tasks:execution.highlighted_phrases")}</h4>
                <div className="flex flex-wrap gap-2">
                  {analysis.highlighted_phrases.map((phrase: string, i: number) => (
                    <span key={i} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                      "{phrase}"
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Writing Content */}
        {completion.detailed_data?.content && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="font-semibold text-gray-900 mb-4">{t("tasks:your_writing")}</h3>
            <div className="prose prose-sm max-w-none">
              <h4>{completion.detailed_data.title}</h4>
              <p className="whitespace-pre-wrap">{completion.detailed_data.content}</p>
            </div>
          </div>
        )}

        {/* Back Button */}
        <button
          onClick={handleBack}
          className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
        >
          {t("tasks:back_to_tasks")}
        </button>
      </div>
    </div>
  );
}
