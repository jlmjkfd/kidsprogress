/**
 * Task Execution Page
 * Dynamic executor based on task template
 */
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { IconArrowLeft, IconStar, IconCheck, IconSparkles } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { useSubmitCompletion } from "@/api/mutations/useCompletionMutations";
import { getPlugin } from "@/templates/registry";
import type { PrepareExecutionResponse } from "@/types/template";
import type { CompletionData } from "@/templates/_shared/types/plugin-interface";
import LoadingSpinner from "@/components/LoadingSpinner";

interface CompletionResult {
  completion_id: string;
  metrics: {
    word_count?: number;
    ai_overall_score?: number;
    ai_scores?: Record<string, number>;
  };
  llm_analysis?: {
    overall_score: number;
    scores: Record<string, number>;
    strengths: string[];
    improvements: string[];
    feedback_summary: string;
    highlighted_phrases: string[];
  };
}

export default function TaskExecutePage() {
  const { taskId, childId } = useParams<{ taskId: string; childId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation(["tasks", "common"]);
  const [completionResult, setCompletionResult] = useState<CompletionResult | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  // Fetch task details
  const { data: task, isLoading: taskLoading } = useQuery({
    queryKey: ["task", taskId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/tasks/${taskId}`);
      return response.data;
    },
    enabled: !!taskId,
  });

  // Prepare execution data
  const { data: executionData, isLoading: executionLoading } = useQuery({
    queryKey: ["execution", taskId],
    queryFn: async () => {
      const response = await apiClient.get<PrepareExecutionResponse>(
        `/api/completions/${taskId}/prepare`
      );
      return response.data;
    },
    enabled: !!taskId && !!task?.template_id,
  });

  // Fetch completion details after submission to get AI feedback
  const { data: completionDetails } = useQuery({
    queryKey: ["completion", completionResult?.completion_id],
    queryFn: async () => {
      const response = await apiClient.get(`/api/completions/${completionResult?.completion_id}`);
      return response.data;
    },
    enabled: !!completionResult?.completion_id,
  });

  const submitCompletion = useSubmitCompletion();

  const handleComplete = async (completionData: CompletionData) => {
    if (!taskId || !task?.child_id) return;

    try {
      const result = await submitCompletion.mutateAsync({
        taskId,
        data: {
          child_id: task.child_id,
          completion_data: completionData,
        },
      });

      // Navigate to AttemptDetailView to show the completion
      navigate(`/child-portal/${childId}/tasks/attempts/${taskId}?completionId=${result.completion_id}`, {
        replace: true,
      });
    } catch (error) {
      console.error("Failed to submit completion:", error);
      alert(t("errors:submission_failed"));
    }
  };

  const handleBackToTasks = () => {
    navigate(`/child-portal/${childId}/tasks`, { replace: true });
  };

  const handleCancel = () => {
    navigate(-1);
  };

  // Loading state
  if (taskLoading || executionLoading) {
    return <LoadingSpinner fullScreen size="lg" />;
  }

  // Error states
  if (!task) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {t("tasks:task_not_found")}
            </h2>
            <p className="text-gray-600 mb-6">{t("tasks:task_not_found_desc")}</p>
            <button
              onClick={() => navigate("/child-portal/tasks")}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {t("tasks:back_to_tasks")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!task.template_id || !executionData) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {t("tasks:no_template")}
            </h2>
            <p className="text-gray-600 mb-6">
              {t("tasks:no_template_desc")}
            </p>
            <button
              onClick={() => navigate("/child-portal/tasks")}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {t("tasks:back_to_tasks")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Get the appropriate executor component from plugin
  const plugin = getPlugin(task.template_id);
  if (!plugin) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {t("tasks:executor_not_found")}
            </h2>
            <p className="text-gray-600 mb-6">
              {t("tasks:executor_not_found_desc", {
                type: task.template_id,
              })}
            </p>
            <button
              onClick={() => navigate("/child-portal/tasks")}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {t("tasks:back_to_tasks")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const ExecutorComponent = plugin.components.TaskExecutor;

  // Show completion result with AI feedback
  if (completionResult && completionDetails) {
    const analysis = completionDetails.llm_analysis;
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-blue-50 p-4">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Success Header */}
          <div className="bg-white rounded-xl shadow-sm border p-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <IconCheck size={32} className="text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {t("tasks:execution.great_job")}
            </h2>
            <p className="text-gray-600">{t("tasks:execution.task_completed")}</p>
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

          {/* Back Button */}
          <button
            onClick={handleBackToTasks}
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
          >
            {t("tasks:back_to_tasks")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={handleCancel}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <IconArrowLeft size={20} />
            </button>
            <div className="flex-1">
              <h1 className="text-lg md:text-xl font-semibold text-gray-900">
                {task.title}
              </h1>
              {task.description && (
                <p className="text-sm text-gray-600 mt-1">{task.description}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Executor Content */}
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <ExecutorComponent
            taskId={taskId!}
            executionData={executionData.execution_data}
            onComplete={handleComplete}
            onCancel={handleCancel}
            setIsComplete={setIsComplete}
          />
        </div>
      </div>
    </div>
  );
}
