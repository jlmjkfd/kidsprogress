/**
 * AttemptDetailView - Unified view for task attempt details
 * Shows questions/answers, score, and allows viewing multiple attempts
 */
import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { IconArrowLeft, IconTrophy, IconClock, IconCalendar } from "@tabler/icons-react";
import { useTask } from "@/api/queries/useTasks";
import { useCompletions } from "@/api/queries/useCompletions";
import { useAppSelector } from "@/store/hooks";
import LoadingSpinner from "@/components/LoadingSpinner";
import { TaskCompletion } from "@/types/template";
import { AttemptSidebar } from "./components/AttemptSidebar";
import { getPlugin } from "@/templates/registry";
import { formatLocalDate, formatLocalTime } from "@/utils/timezone";

export default function AttemptDetailPage() {
  const { t } = useTranslation(["tasks", "common"]);
  const { taskId, childId } = useParams<{ taskId: string; childId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedChildId = useAppSelector((state) => state.child.selectedChildId);

  // Get completion ID from URL query param (optional - defaults to latest)
  const urlCompletionId = searchParams.get("completionId");
  const [selectedCompletionId, setSelectedCompletionId] = useState<string | null>(urlCompletionId);

  // Parse virtual task ID (format: templateId_date)
  const isVirtualTask = taskId?.includes("_");
  const scheduledDate = isVirtualTask ? taskId?.split("_")[1] : null;

  // Fetch task and completions
  const { data: task, isLoading: taskLoading } = useTask(taskId || "");
  const { data: completionsData, isLoading: completionsLoading } = useCompletions({
    task_id: taskId,
    child_id: selectedChildId || childId,
    limit: 100,
  });

  // Filter completions by scheduled_date if this is a virtual task
  const allCompletions = completionsData?.completions || [];
  const completions = scheduledDate
    ? allCompletions.filter(c => c.scheduled_date === scheduledDate)
    : allCompletions;
  const selectedCompletion = completions.find(c => c.completion_id === selectedCompletionId) || completions[0];

  // Auto-select first completion if none selected
  useEffect(() => {
    if (!selectedCompletionId && completions.length > 0) {
      setSelectedCompletionId(completions[0].completion_id);
    }
  }, [completions, selectedCompletionId]);

  const getDuration = (completion: TaskCompletion) => {
    const start = new Date(completion.started_at);
    const end = new Date(completion.completed_at);
    const durationMs = end.getTime() - start.getTime();
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleBack = () => {
    // Check if we came from parent portal by checking the document.referrer or history
    // For now, use navigate(-1) which goes to the previous page
    // This works correctly whether coming from child portal or parent portal
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(`/child-portal/${childId}/tasks`);
    }
  };

  if (taskLoading || completionsLoading) {
    return <LoadingSpinner fullScreen size="lg" />;
  }

  if (!task || !selectedCompletion) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <p className="text-xl text-gray-600">{t("tasks:no_attempts_yet")}</p>
          <button
            onClick={handleBack}
            className="mt-4 rounded-xl bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
          >
            {t("common:back")}
          </button>
        </div>
      </div>
    );
  }

  // Render template-specific view using plugin registry
  const renderAttemptContent = () => {
    const plugin = task.template_id ? getPlugin(task.template_id) : null;

    if (plugin && plugin.components.AttemptView) {
      const AttemptView = plugin.components.AttemptView;
      return <AttemptView completion={selectedCompletion} />;
    }

    // Generic fallback for templates without AttemptView
    return (
      <div className="rounded-2xl bg-white p-6 shadow-lg">
        <h3 className="mb-4 text-xl font-bold text-gray-900">
          {t("tasks:completion_details")}
        </h3>
        <pre className="overflow-auto rounded-lg bg-gray-50 p-4 text-sm">
          {JSON.stringify(selectedCompletion.detailed_data, null, 2)}
        </pre>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b bg-white shadow-sm">
        <div className="mx-auto max-w-7xl p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-gray-600 transition-colors hover:text-gray-900"
            >
              <IconArrowLeft size={24} />
              <span className="hidden sm:inline">{t("common:back")}</span>
            </button>
            <h1 className="flex-1 text-center text-xl font-bold text-gray-900 sm:text-2xl">
              {task.title}
            </h1>
            <div className="w-16 sm:w-24" /> {/* Spacer for centering */}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 p-4 sm:p-6 md:flex-row">
        {/* Sidebar - Attempt List (Desktop) / Dropdown (Mobile) */}
        <AttemptSidebar
          completions={completions}
          selectedCompletionId={selectedCompletionId}
          onSelectCompletion={setSelectedCompletionId}
        />

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col gap-4">
          {/* Completion Info Card */}
          <div className="rounded-2xl bg-white p-4 shadow-lg sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <IconTrophy className="text-purple-600" size={32} />
                <div>
                  <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">
                    {t("tasks:attempt_number", { number: selectedCompletion.session_number })}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {formatLocalDate(selectedCompletion.completed_at)} • {formatLocalTime(selectedCompletion.completed_at)}
                  </p>
                </div>
              </div>

              {selectedCompletion.measured_data?.score !== undefined && (
                <div className="rounded-full bg-green-100 px-6 py-3">
                  <span className="text-2xl font-bold text-green-700">
                    {selectedCompletion.measured_data.score}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <IconClock size={18} />
                <span>{t("tasks:duration")}: {getDuration(selectedCompletion)}</span>
              </div>
              {selectedCompletion.scheduled_date && (
                <div className="flex items-center gap-2">
                  <IconCalendar size={18} />
                  <span>{t("tasks:scheduled")}: {formatLocalDate(selectedCompletion.scheduled_date)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Template-Specific Content */}
          {renderAttemptContent()}
        </div>
      </div>
    </div>
  );
}
