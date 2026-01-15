/**
 * AttemptDetailView - Unified view for task attempt details
 * Shows questions/answers, score, and allows viewing multiple attempts
 */
import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { IconArrowLeft, IconTrophy, IconClock, IconCalendar } from "@tabler/icons-react";
import { useTask } from "@/api/queries/useTasks";
import { useCompletions } from "@/api/queries/useCompletions";
import { useAppSelector } from "@/store/hooks";
import LoadingSpinner from "@/components/LoadingSpinner";
import { TaskCompletion } from "@/types/template";
import { AttemptSidebar } from "./components/AttemptSidebar";
import { getPlugin } from "@/templates/registry";
import { formatLocalDate, formatLocalTime, getTaskDisplayDate } from "@/utils/timezone";
import { ScrollPositionManager } from "@/utils/ScrollAnchor";

export default function AttemptDetailPage() {
  const { t, i18n } = useTranslation(["tasks", "common"]);
  const params = useParams<{ taskId: string; childId: string; id: string }>();
  const { taskId, childId } = params;
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const selectedChildId = useAppSelector((state) => state.child.selectedChildId);

  // Parent portal uses 'id' param, child portal uses 'childId'
  const actualChildId = selectedChildId || childId || params.id;

  // Get navigation state (where we came from)
  const navigationState = location.state as {
    from?: 'child-portal' | 'parent-portal';
    viewMode?: 'list' | 'calendar';
    selectedDate?: string;
    expandedOverdueTaskId?: string;
  } | null;

  // Get current locale for date/time formatting
  const locale = i18n.language === 'zh' ? 'zh-CN' : 'en-US';

  // Get completion ID from URL query param (optional - defaults to latest)
  const urlCompletionId = searchParams.get("completionId");
  const [selectedCompletionId, setSelectedCompletionId] = useState<string | null>(urlCompletionId);

  // Fetch task first to get scheduled_date
  const { data: task, isLoading: taskLoading } = useTask(taskId || "");

  // Parse virtual task ID (format: templateId_date) or get scheduled_date from materialized task
  const isVirtualTask = taskId?.includes("_");
  const scheduledDate = isVirtualTask
    ? taskId?.split("_")[1]
    : task ? getTaskDisplayDate(task) : undefined; // Get display date (handles both floating and fixed time)

  // Pass task_id (virtual or real) - backend will handle parsing virtual IDs
  const { data: completionsData, isLoading: completionsLoading } = useCompletions({
    task_id: taskId,
    child_id: actualChildId,
    limit: 100,
  });

  // Backend already filters by scheduled_date, so no need to filter again
  // Just use all completions returned
  const allCompletions = completionsData?.completions || [];
  let completions = allCompletions;

  // Add in-progress attempt from progress_state if it exists
  // This shows saved work even if not submitted yet
  if (task?.progress_state && Object.keys(task.progress_state).length > 0) {
    const inProgressAttempt: TaskCompletion = {
      id: 'in-progress',
      completion_id: 'in-progress',
      task_id: taskId || '',
      child_id: task.child_id || '',
      template_id: task.template_id || '',
      session_number: task.progress_state.session_number || (completions.length || 0) + 1,
      scheduled_date: scheduledDate || undefined,
      started_at: task.started_at || new Date().toISOString(),
      completed_at: '', // Not completed yet
      measured_data: {},
      detailed_data: task.progress_state,
    };
    // Add at the beginning (most recent)
    completions = [inProgressAttempt, ...completions];
  }

  const selectedCompletion = completions.find(c => c.completion_id === selectedCompletionId) || completions[0];

  // Auto-select first completion if none selected
  useEffect(() => {
    if (!selectedCompletionId && completions.length > 0) {
      setSelectedCompletionId(completions[0].completion_id);
    }
  }, [completions, selectedCompletionId]);

  const getDuration = (completion: TaskCompletion) => {
    // For template tasks, use stored total_time_seconds (handles save/resume correctly)
    // For standard tasks, calculate from timestamps
    const totalSeconds = completion.detailed_data?.total_time_seconds;

    if (totalSeconds !== undefined && totalSeconds !== null) {
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    }

    // Fallback: calculate from timestamps (for tasks without total_time_seconds)
    const start = new Date(completion.started_at);
    const end = new Date(completion.completed_at);
    const durationMs = end.getTime() - start.getTime();
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleBack = () => {
    // Mark that we're returning from attempts to trigger scroll restoration
    ScrollPositionManager.markReturningFromAttempts();

    // Smart back navigation based on where we came from
    if (navigationState?.from === 'child-portal') {
      // Child portal - navigate to tasks page with view mode and state
      const baseUrl = `/child-portal/${actualChildId}/tasks`;
      const state: any = {
        viewMode: navigationState.viewMode || 'list',
      };

      // If coming from calendar view, restore selected date
      if (navigationState.viewMode === 'calendar' && navigationState.selectedDate) {
        state.selectedDate = navigationState.selectedDate;
      }

      // If coming from overdue card, pass template ID to expand it
      if (navigationState.expandedOverdueTaskId) {
        state.expandedOverdueTaskId = navigationState.expandedOverdueTaskId;
      }

      navigate(baseUrl, { state });
    } else if (navigationState?.from === 'parent-portal') {
      // Parent portal - navigate to tasks page with view mode and state
      const baseUrl = `/parent-portal/children/${actualChildId}/tasks`;
      const state: any = {
        viewMode: navigationState.viewMode || 'list',
      };

      // If coming from calendar view, restore selected date
      if (navigationState.viewMode === 'calendar' && navigationState.selectedDate) {
        state.selectedDate = navigationState.selectedDate;
      }

      navigate(baseUrl, { state });
    } else {
      // Fallback to browser back button
      navigate(-1);
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
    // Template tasks - use plugin AttemptView
    if (task.template_id) {
      const plugin = getPlugin(task.template_id);
      if (plugin && plugin.components.AttemptView) {
        const AttemptView = plugin.components.AttemptView;
        return <AttemptView completion={selectedCompletion} />;
      }
    }

    // Standard tasks - show tool data
    const toolData = selectedCompletion.detailed_data?.tools;
    if (toolData && typeof toolData === 'object' && Object.keys(toolData).length > 0) {
      return (
        <div className="space-y-4">
          {Object.entries(toolData).map(([toolId, toolState]: [string, any]) => (
            <div key={toolId} className="rounded-2xl bg-white p-6 shadow-lg">
              <div className="mb-4 flex items-center gap-2">
                <div className="rounded-lg bg-purple-100 p-2">
                  {toolId === 'note' && <span className="text-2xl">📝</span>}
                  {toolId === 'timer' && <span className="text-2xl">⏱️</span>}
                  {toolId === 'calculator' && <span className="text-2xl">🔢</span>}
                  {!['note', 'timer', 'calculator'].includes(toolId) && <span className="text-2xl">🔧</span>}
                </div>
                <h3 className="text-xl font-bold capitalize text-gray-900">{toolId}</h3>
              </div>

              {toolId === 'note' && toolState.state?.content && (
                <div className="whitespace-pre-wrap rounded-lg bg-gray-50 p-4 text-gray-800">
                  {toolState.state.content}
                </div>
              )}

              {toolId === 'timer' && toolState.state?.elapsedSeconds !== undefined && (
                <div className="text-lg text-gray-800">
                  <span className="font-semibold">{t("tasks:duration")}:</span>{' '}
                  {Math.floor(toolState.state.elapsedSeconds / 60)} {t("common:minutes")} {toolState.state.elapsedSeconds % 60} {t("common:seconds")}
                </div>
              )}

              {toolId === 'calculator' && (
                <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
                  {t("tasks:calculator_used")}
                </div>
              )}

              {toolState.lastUpdated && (
                <p className="mt-2 text-xs text-gray-500">
                  {t("common:last_updated")}: {new Date(toolState.lastUpdated).toLocaleString(locale)}
                </p>
              )}
            </div>
          ))}
        </div>
      );
    }

    // Fallback - no tool data
    return (
      <div className="rounded-2xl bg-white p-6 shadow-lg">
        <h3 className="mb-4 text-xl font-bold text-gray-900">
          {t("tasks:completion_details")}
        </h3>
        <p className="text-gray-600">{t("tasks:no_details_available")}</p>
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
                  {selectedCompletion.completion_id === 'in-progress' || !selectedCompletion.completed_at ? (
                    <p className="text-sm font-medium text-blue-600">
                      {t("tasks:in_progress")}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-600">
                      {formatLocalDate(selectedCompletion.completed_at, locale)} • {formatLocalTime(selectedCompletion.completed_at, locale)}
                    </p>
                  )}
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
                  <span>{t("tasks:scheduled")}: {formatLocalDate(selectedCompletion.scheduled_date, locale)}</span>
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
