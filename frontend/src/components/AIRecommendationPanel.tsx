/**
 * AI Recommendation Panel - Collapsible section for task recommendations
 * Replaces modal-based UI for better UX in child portal
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import {
  IconSparkles,
  IconRefresh,
  IconPlayerPlay,
  IconCoffee,
  IconChevronDown,
  IconChevronUp,
} from "@tabler/icons-react";
import { useAIRecommendation } from "@/api/queries/useAISchedule";
import { useStartTask } from "@/api/mutations/useTaskMutations";
import type { SingleTaskRecommendation } from "@/types/aiRecommendation";

interface AIRecommendationPanelProps {
  childId: string;
  currentTime?: string;
  defaultExpanded?: boolean;
}

// Cache removed - we refetch on every request
// - For fallback (no LLM), there's no API cost, so no need to cache
// - For LLM calls, cache should invalidate when task status changes
//   which is too complex to track on frontend
// - Backend will handle intelligent caching if needed

export function AIRecommendationPanel({
  childId,
  currentTime,
  defaultExpanded = false,
}: AIRecommendationPanelProps) {
  const { t } = useTranslation(["tasks", "common"]);
  const navigate = useNavigate();
  const params = useParams();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Always use current local device time (not UTC)
  // This ensures late-night checks work correctly based on child's timezone
  // toISOString() returns UTC, so we need to construct local ISO string manually
  const getLocalISOString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  };

  const deviceTime = currentTime || getLocalISOString();

  const { data: recommendation, refetch, isLoading, isFetching } = useAIRecommendation(
    childId,
    deviceTime,
    undefined,
    false // Don't auto-fetch
  );

  const startTaskMutation = useStartTask();

  // No caching - always fetch fresh data
  // Reasons:
  // 1. Fallback (no LLM) has no API cost, no need to cache
  // 2. LLM recommendations become stale when task status changes
  // 3. Simpler logic, better UX

  const handleGetRecommendation = () => {
    if (!childId) return;

    // Always fetch fresh recommendation
    refetch();
    setIsExpanded(true);
  };

  const handleStartTask = async (taskRec: SingleTaskRecommendation) => {
    try {
      console.log("[AI Recommendation] Starting task:", {
        taskId: taskRec.task._id,
        title: taskRec.task.title,
        isVirtual: taskRec.task.is_virtual,
        isRecurring: taskRec.task.is_recurring,
        scheduledDate: taskRec.task.scheduled_date,
      });

      const result = await startTaskMutation.mutateAsync({
        taskId: taskRec.task._id,
        childId,
      });

      console.log("[AI Recommendation] Start task result:", result);

      const realTaskId = result?.task?._id || taskRec.task._id;
      navigate(`/child-portal/${params.childId}/tasks/execute/${realTaskId}`);
    } catch (error) {
      console.error("Failed to start task:", error);
    }
  };

  const activeRecommendation = recommendation;
  const taskRecommendations = activeRecommendation?.tasks || [];

  if (!childId) {
    return null;
  }

  return (
    <div className="rounded-2xl bg-white shadow-lg">
      {/* Header - Always visible */}
      <div className="flex w-full items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 p-4 text-white">
        <button
          onClick={() => {
            if (!isExpanded) {
              handleGetRecommendation();
            } else {
              setIsExpanded(false);
            }
          }}
          disabled={isLoading || isFetching}
          className="flex flex-1 items-center gap-3 transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <IconSparkles size={24} className={isFetching ? "animate-spin" : ""} />
          <div className="text-left">
            <div className="text-lg font-semibold">{t("tasks:what_should_i_do_now")}</div>
          </div>
        </button>

        <div className="flex items-center gap-2">
          {/* Refresh button - small icon only */}
          {isExpanded && activeRecommendation && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isFetching) {
                  handleGetRecommendation(); // Fetch fresh recommendation
                }
              }}
              disabled={isFetching}
              className="rounded-lg p-1.5 transition-colors hover:bg-white/20 disabled:opacity-50"
              title={t("common:refresh")}
              type="button"
            >
              <IconRefresh size={18} className={isFetching ? "animate-spin" : ""} />
            </button>
          )}

          {/* Chevron - collapse/expand indicator */}
          <button
            onClick={() => {
              if (!isExpanded) {
                handleGetRecommendation();
              } else {
                setIsExpanded(false);
              }
            }}
            disabled={isLoading || isFetching}
            className="p-1"
          >
            {isExpanded ? <IconChevronUp size={20} /> : <IconChevronDown size={20} />}
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="space-y-4 p-4">
          {/* Loading State */}
          {(isLoading || isFetching) && !activeRecommendation && (
            <div className="flex items-center justify-center py-8">
              <IconSparkles size={32} className="animate-spin text-purple-600" />
              <p className="ml-3 text-gray-600">{t("common:loading")}</p>
            </div>
          )}

          {/* No Recommendations */}
          {!isLoading && !isFetching && !activeRecommendation && (
            <div className="py-8 text-center text-gray-500">
              <p>{t("tasks:ai_recommendation")}</p>
              <p className="text-sm">{t("tasks:no_data_available")}</p>
            </div>
          )}

          {/* Recommendation Content */}
          {activeRecommendation && (
            <>
          {/* Break Suggestion */}
          {activeRecommendation.break_suggested && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-3">
                <IconCoffee className="text-amber-600" size={24} />
                <div>
                  <p className="font-semibold text-amber-900">{t("tasks:break_suggested")}</p>
                  <p className="text-sm text-amber-700">
                    {t("tasks:break_duration", { minutes: activeRecommendation.break_duration_minutes })}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Overall Reasoning */}
          {activeRecommendation.overall_reasoning && (
            <div className="rounded-lg bg-purple-50 p-3">
              <p className="text-sm text-gray-700">{activeRecommendation.overall_reasoning}</p>
            </div>
          )}

          {/* No Tasks Available */}
          {taskRecommendations.length === 0 && (
            <div className="py-8 text-center">
              <p className="text-lg text-gray-600">✨ {t("tasks:child_portal.all_done")}</p>
              <p className="mt-2 text-sm text-gray-500">{t("tasks:child_portal.great_job")}</p>
            </div>
          )}

          {/* Recommended Tasks - Grid layout based on count */}
          {taskRecommendations.length > 0 && (
            <div
              className={`grid gap-3 ${
                taskRecommendations.length === 1
                  ? "grid-cols-1"
                  : taskRecommendations.length === 2
                    ? "grid-cols-1 sm:grid-cols-2"
                    : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
              }`}
            >
              {taskRecommendations.map((taskRec, index) => (
                <TaskRecommendationCard
                  key={taskRec.task._id}
                  recommendation={taskRec}
                  rank={index + 1}
                  showRank={taskRecommendations.length > 1}
                  onStart={() => handleStartTask(taskRec)}
                  isStarting={startTaskMutation.isPending}
                />
              ))}
            </div>
          )}

          {/* Conflicts */}
          {activeRecommendation.conflicts && activeRecommendation.conflicts.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="mb-2 font-semibold text-red-900">{t("tasks:schedule_conflict")}</p>
              <ul className="space-y-1">
                {activeRecommendation.conflicts.map((conflict, idx) => (
                  <li key={idx} className="text-sm text-red-700">
                    ⚠️ {conflict.description}
                  </li>
                ))}
              </ul>
            </div>
          )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

interface TaskRecommendationCardProps {
  recommendation: SingleTaskRecommendation;
  rank: number;
  showRank: boolean;
  onStart: () => void;
  isStarting: boolean;
}

function TaskRecommendationCard({
  recommendation,
  rank,
  showRank,
  onStart,
  isStarting,
}: TaskRecommendationCardProps) {
  const { t } = useTranslation(["tasks"]);

  const rankColors = [
    "bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-300",
    "bg-gradient-to-br from-blue-50 to-blue-100 border-blue-300",
    "bg-gradient-to-br from-green-50 to-green-100 border-green-300",
  ];

  const rankLabels = [
    t("tasks:first_choice"),
    t("tasks:second_choice"),
    t("tasks:third_choice"),
  ];

  return (
    <div className={`rounded-xl border-2 p-4 ${rankColors[rank - 1] || rankColors[2]}`}>
      {/* Rank Badge */}
      {showRank && (
        <div className="mb-2">
          <span className="inline-block rounded-full bg-white px-2 py-1 text-xs font-semibold text-gray-700 shadow-sm">
            {rankLabels[rank - 1]}
          </span>
        </div>
      )}

      {/* Task Title */}
      <h4 className="mb-2 text-lg font-bold text-gray-900">{recommendation.task.title}</h4>

      {/* Task Description (if available) */}
      {recommendation.task.description && (
        <p className="mb-3 text-sm text-gray-600">{recommendation.task.description}</p>
      )}

      {/* Task metadata - show time slot if available */}
      {recommendation.task.fixed_time_slot && (
        <div className="mb-3">
          <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800">
            {recommendation.task.fixed_time_slot.start} - {recommendation.task.fixed_time_slot.end}
          </span>
        </div>
      )}

      {/* Start Button */}
      <button
        onClick={onStart}
        disabled={isStarting}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-400"
      >
        <IconPlayerPlay size={16} />
        <span>{t("tasks:start")}</span>
      </button>
    </div>
  );
}
