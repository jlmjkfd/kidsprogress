import { useState } from "react";
import { useTranslation } from "react-i18next";
import { IconSparkles, IconClock, IconTarget, IconRefresh, IconPlayerPlay, IconCoffee } from "@tabler/icons-react";
import { useAIRecommendation } from "@/api/queries/useAISchedule";
import { useStartTask } from "@/api/mutations/useTaskMutations";

interface AIRecommendationButtonProps {
  childId: string;
  currentTime?: string; // For testing
  onTaskStart?: () => void;
}

export function AIRecommendationButton({ childId, currentTime, onTaskStart }: AIRecommendationButtonProps) {
  const { t } = useTranslation(["tasks", "common"]);
  const [showDetails, setShowDetails] = useState(false);

  const { data: recommendation, refetch, isLoading, isFetching } = useAIRecommendation(
    childId,
    currentTime,
    undefined,
    false // Don't auto-fetch, only when button clicked
  );

  const startTaskMutation = useStartTask();

  const handleGetRecommendation = () => {
    if (!childId) {
      console.warn("Cannot get recommendation: childId is empty. Please log in as a child first.");
      return;
    }
    refetch();
    setShowDetails(true);
  };

  // Debug: Log recommendation data
  if (recommendation) {
    console.log("AI Recommendation data:", recommendation);
  }

  const handleStartTask = async () => {
    if (!recommendation) return;

    try {
      await startTaskMutation.mutateAsync({
        taskId: recommendation.suggested_task._id,
        childId,
      });
      if (onTaskStart) {
        onTaskStart();
      }
    } catch (error) {
      console.error("Failed to start task:", error);
    }
  };

  // Don't render button if no childId
  if (!childId) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800 text-sm">
          {t("common:please_log_in")} (Child authentication required)
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-4 sm:p-6">
      {/* Ask AI Button */}
      {!showDetails && (
        <button
          onClick={handleGetRecommendation}
          disabled={isLoading || isFetching}
          className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-4 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed min-h-[56px]"
        >
          <IconSparkles size={24} className={isFetching ? "animate-spin" : ""} />
          <span className="text-lg font-semibold">{t("tasks:what_should_i_do_now")}</span>
        </button>
      )}

      {/* Recommendation Details */}
      {showDetails && recommendation && (
        <div className="space-y-4">
          {/* Header with Refresh */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <IconSparkles className="text-purple-600" size={24} />
              {t("tasks:ai_recommendation")}
            </h3>
            <button
              onClick={handleGetRecommendation}
              disabled={isFetching}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors min-h-[44px] min-w-[44px]"
              title={t("common:refresh")}
            >
              <IconRefresh size={20} className={isFetching ? "animate-spin" : ""} />
            </button>
          </div>

          {/* Break Suggestion */}
          {recommendation.break_suggested && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <IconCoffee className="text-amber-600" size={24} />
                <div className="flex-1">
                  <p className="font-semibold text-amber-900">{t("tasks:break_suggested")}</p>
                  <p className="text-sm text-amber-700">
                    {t("tasks:break_duration", { minutes: recommendation.break_duration_minutes })}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Suggested Task */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
            <h4 className="text-xl font-bold text-gray-900 mb-2">
              {(recommendation as any).task_title || recommendation.suggested_task?.title || "Task"}
            </h4>

            {/* Metadata */}
            <div className="flex flex-wrap gap-3 mb-3">
              {((recommendation as any).estimated_duration || recommendation.estimated_minutes) && (
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <IconClock size={16} />
                  <span>
                    {t("tasks:estimated_time")}: ~
                    {(recommendation as any).estimated_duration || recommendation.estimated_minutes} min
                  </span>
                </div>
              )}
              {recommendation.priority_score && (
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <IconTarget size={16} />
                  <span>{t("tasks:priority_score")}: {Math.round(recommendation.priority_score)}/100</span>
                </div>
              )}
            </div>

            {/* Reasoning */}
            <div className="bg-white rounded-lg p-3 mb-3">
              <p className="text-sm font-medium text-gray-700 mb-1">{t("tasks:reasoning")}</p>
              <p className="text-sm text-gray-600">{recommendation.reasoning}</p>
            </div>

            {/* Start Button - only show if there's a task to start */}
            {((recommendation as any).recommended_task_id || recommendation.suggested_task?._id) && (
              <button
                onClick={handleStartTask}
                disabled={startTaskMutation.isPending}
                className="w-full flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed min-h-[48px]"
              >
                <IconPlayerPlay size={20} />
                <span className="font-semibold">{t("tasks:start_task")}</span>
              </button>
            )}

            {/* If it's a break/none suggestion, show appropriate message */}
            {!(recommendation as any).recommended_task_id && !recommendation.suggested_task?._id && (
              <div className="text-center text-gray-600 py-2">
                {(recommendation as any).suggestion_type === "break" && "💤 "}
                {(recommendation as any).suggestion_type === "none" && "🎉 "}
              </div>
            )}
          </div>

          {/* Conflicts (if any) */}
          {recommendation.conflicts && recommendation.conflicts.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="font-semibold text-red-900 mb-2">{t("tasks:schedule_conflict")}</p>
              <ul className="space-y-1">
                {recommendation.conflicts.map((conflict, idx) => (
                  <li key={idx} className="text-sm text-red-700">
                    ⚠️ {conflict.description}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Alternatives */}
          {(recommendation.alternatives?.length > 0 || (recommendation as any).alternative_tasks?.length > 0) && (
            <details className="bg-gray-50 rounded-lg p-3">
              <summary className="cursor-pointer font-medium text-gray-900">
                {t("tasks:alternatives")} ({recommendation.alternatives?.length || (recommendation as any).alternative_tasks?.length})
              </summary>
              <div className="mt-3 space-y-2">
                {/* Handle full Task objects */}
                {recommendation.alternatives?.map((alt) => (
                  <div key={alt._id} className="flex items-start gap-2 text-sm text-gray-700 bg-white rounded p-2">
                    <span>•</span>
                    <span>{alt.title}</span>
                  </div>
                ))}
                {/* Handle simple alternative_tasks array (just IDs or strings) */}
                {(recommendation as any).alternative_tasks?.map((alt: any, idx: number) => (
                  <div key={idx} className="flex items-start gap-2 text-sm text-gray-700 bg-white rounded p-2">
                    <span>•</span>
                    <span>{typeof alt === 'string' ? `Alternative task ${idx + 1}` : (alt.task_title || alt.title || 'Task')}</span>
                    {alt.reason && <span className="text-gray-500 text-xs">- {alt.reason}</span>}
                  </div>
                ))}
              </div>
            </details>
          )}

          {/* Close Button */}
          <button
            onClick={() => setShowDetails(false)}
            className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors min-h-[44px]"
          >
            {t("common:close")}
          </button>
        </div>
      )}
    </div>
  );
}
