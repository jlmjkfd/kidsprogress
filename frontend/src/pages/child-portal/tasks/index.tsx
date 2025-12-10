/**
 * Child Portal - My Tasks Page
 * Kid-friendly task interface with large buttons and simple UI
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { useAppSelector } from "@/store/hooks";
import {
  IconChecklist,
  IconPlayerPlay,
  IconPlayerPause,
  IconCheck,
  IconClock,
  IconStar,
  IconTrophy,
  IconList,
  IconCalendar,
  IconCheckbox,
  IconHistory,
  IconPlus,
  IconAlertTriangle,
} from "@tabler/icons-react";
import { useTasksByChild, useOverdueStats } from "@/api/queries/useTasks";
import {
  useStartTask,
  usePauseTask,
  useCompleteTask,
  useResumeTask,
} from "@/api/mutations/useTaskMutations";
import { Task } from "@/types/task";
import { AIRecommendationButton } from "@/components/AIRecommendationButton";
import { TaskCalendar } from "@/components/calendar";
import LoadingSpinner from "@/components/LoadingSpinner";
import { QuickCaptureModal } from "@/components/QuickCaptureModal";
import { PlanAheadModal } from "@/components/PlanAheadModal";
import { OverdueView } from "@/components/OverdueView";

type ViewMode = "list" | "calendar" | "overdue";

export default function ChildTasksPage() {
  const { t } = useTranslation(["tasks", "common"]);
  const navigate = useNavigate();
  const { childId } = useParams<{ childId: string }>();
  const selectedChildId = useAppSelector(
    (state) => state.child.selectedChildId
  );

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [isQuickCaptureOpen, setIsQuickCaptureOpen] = useState(false);
  const [isPlanAheadOpen, setIsPlanAheadOpen] = useState(false);

  // Helper to get local date string (YYYY-MM-DD)
  const getLocalDateString = (date: Date = new Date()) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };
  const [selectedDate, setSelectedDate] =
    useState<string>(getLocalDateString());

  // TODO: Implement proper child authentication to get child_id
  const { data: allTasks, isLoading } = useTasksByChild(selectedChildId || "");
  const { data: overdueStats } = useOverdueStats(selectedChildId || "");
  const startTaskMutation = useStartTask();
  const pauseTaskMutation = usePauseTask();
  const resumeTaskMutation = useResumeTask();
  const completeTaskMutation = useCompleteTask();

  // Filter tasks for today only
  const tasks =
    allTasks?.filter((task) => {
      const today = getLocalDateString();
      const taskDate = task.scheduled_date?.split("T")[0];
      return (
        taskDate === today ||
        task.status === "in_progress" ||
        task.status === "paused"
      );
    }) || [];

  // Separate tasks by status for better organization
  // Use string comparison to ensure matching works regardless of enum typing
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress");
  const pausedTasks = tasks.filter((t) => t.status === "paused");
  const todoTasks = tasks.filter((t) => t.status === "pending");
  const completedToday =
    allTasks?.filter((t) => {
      const today = getLocalDateString();
      const completedDate = t.completed_at?.split("T")[0];
      return completedDate === today && t.status === "completed";
    }) || [];

  // Tasks for selected date in calendar view
  const selectedDateTasks =
    allTasks?.filter((t) => {
      const taskDate = t.scheduled_date?.split("T")[0];
      return taskDate === selectedDate;
    }) || [];

  const handleStartTask = async (taskId: string, task: Task) => {
    try {
      // Start the task - this may materialize a virtual task into a real one
      const result = await startTaskMutation.mutateAsync({
        taskId,
        childId: selectedChildId || "",
      });

      // If task has a template, navigate to the executor page
      // Use the returned task's ID (may be different if virtual task was materialized)
      if (task.template_id) {
        const realTaskId = result?.task?._id || taskId;
        navigate(`/child-portal/${childId}/tasks/execute/${realTaskId}`);
      }
    } catch (error) {
      console.error("Failed to start task:", error);
    }
  };

  const handlePauseTask = async (taskId: string) => {
    try {
      await pauseTaskMutation.mutateAsync({ taskId, pausedBy: "CHILD" });
    } catch (error) {
      console.error("Failed to pause task:", error);
    }
  };

  const handleResumeTask = async (taskId: string) => {
    try {
      await resumeTaskMutation.mutateAsync(taskId);
    } catch (error) {
      console.error("Failed to resume task:", error);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      await completeTaskMutation.mutateAsync({
        taskId,
        childId: selectedChildId || "",
      });
    } catch (error) {
      console.error("Failed to complete task:", error);
    }
  };

  // Check if task is informational/blocking (no action buttons needed)
  const isInformationalTask = (task: Task): boolean => {
    return task.blocks_other_tasks && task.scheduling_type === "fixed_time";
  };

  const handleViewResult = (taskId: string) => {
    navigate(`/child-portal/${childId}/tasks/result/${taskId}`);
  };

  const handleViewAttempts = (taskId: string) => {
    navigate(`/child-portal/${childId}/tasks/attempts/${taskId}`);
  };

  if (isLoading) {
    return <LoadingSpinner fullScreen size="lg" />;
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Sticky Header - uses position:sticky within flex-1 overflow container */}
      <div className="sticky top-0 z-20 bg-gradient-to-br from-blue-50 to-purple-50 p-4 pb-4 shadow-sm backdrop-blur-sm sm:p-6">
        <div className="mx-auto max-w-4xl">
          <h1 className="mb-2 flex items-center gap-3 text-2xl font-bold text-gray-900 sm:text-3xl">
            <IconChecklist className="text-blue-600" size={32} />
            {t("tasks:child_portal.my_tasks")}
          </h1>

          {/* Points Display */}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow">
              <IconStar className="text-yellow-500" size={20} />
              <span className="text-sm font-bold text-gray-900 sm:text-base">
                {completedToday.length}{" "}
                {t("tasks:child_portal.completed_today")}
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow">
              <IconTrophy className="text-purple-500" size={20} />
              <span className="text-sm font-bold text-gray-900 sm:text-base">
                {completedToday.reduce(
                  (sum, t) => sum + (t.points_earned || 0),
                  0
                )}{" "}
                {t("tasks:child_portal.points")}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl space-y-6 px-4 pt-4 pb-8 sm:px-6">
        {/* Create Task Buttons */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Quick Capture Button */}
          <button
            onClick={() => setIsQuickCaptureOpen(true)}
            className="flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4 text-lg font-bold text-white shadow-lg transition-all hover:shadow-xl active:scale-95"
          >
            <IconPlus size={28} className="flex-shrink-0" />
            <span>{t("tasks:quick_capture.button")}</span>
          </button>

          {/* Plan Ahead Button */}
          <button
            onClick={() => setIsPlanAheadOpen(true)}
            className="flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-4 text-lg font-bold text-white shadow-lg transition-all hover:shadow-xl active:scale-95"
          >
            <IconCalendar size={28} className="flex-shrink-0" />
            <span>{t("tasks:plan_ahead.button")}</span>
          </button>
        </div>

        {/* AI Recommendation */}
        <AIRecommendationButton childId={selectedChildId || ""} />

        {/* View Toggle */}
        <div className="flex justify-center">
          <div className="inline-flex overflow-hidden rounded-2xl bg-white shadow-lg">
            <button
              onClick={() => setViewMode("list")}
              className={`flex min-h-[56px] items-center gap-2 px-4 py-3 font-bold transition-all sm:px-6 ${
                viewMode === "list"
                  ? "bg-blue-600 text-white"
                  : "text-gray-700 hover:bg-blue-50"
              }`}
            >
              <IconList size={24} />
              <span className="hidden sm:inline">
                {t("tasks:child_portal.today")}
              </span>
            </button>
            <button
              onClick={() => setViewMode("overdue")}
              className={`relative flex min-h-[56px] items-center gap-2 px-4 py-3 font-bold transition-all sm:px-6 ${
                viewMode === "overdue"
                  ? "bg-orange-600 text-white"
                  : "text-gray-700 hover:bg-orange-50"
              }`}
            >
              <IconAlertTriangle size={24} />
              <span className="hidden sm:inline">{t("tasks:overdue")}</span>
              {overdueStats && overdueStats.total_overdue > 0 && (
                <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                  {overdueStats.total_overdue}
                </span>
              )}
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={`flex min-h-[56px] items-center gap-2 px-4 py-3 font-bold transition-all sm:px-6 ${
                viewMode === "calendar"
                  ? "bg-blue-600 text-white"
                  : "text-gray-700 hover:bg-blue-50"
              }`}
            >
              <IconCalendar size={24} />
              <span className="hidden sm:inline">
                {t("tasks:unified_model.calendar_view")}
              </span>
            </button>
          </div>
        </div>

        {/* View Content */}
        {viewMode === "overdue" ? (
          /* Overdue View */
          <OverdueView childId={selectedChildId || ""} />

        ) : viewMode === "calendar" ? (
          <div className="space-y-6">
            <TaskCalendar
              tasks={allTasks || []}
              childId={selectedChildId || ""}
              onTaskClick={() => {}}
              onDayClick={(date) => setSelectedDate(date)}
              editable={false}
            />

            {/* Task list for selected date */}
            <div className="rounded-3xl bg-white p-6 shadow-xl">
              <h3 className="mb-4 text-xl font-bold text-gray-900">
                {t("tasks:tasks_for_date")}:{" "}
                {new Date(selectedDate + "T00:00:00").toLocaleDateString()}
              </h3>
              {selectedDateTasks.length === 0 ? (
                <p className="text-gray-600">{t("tasks:no_tasks_for_date")}</p>
              ) : (
                <div className="space-y-3">
                  {selectedDateTasks.map((task) => {
                    const canStart = task.status === "pending" && !isInformationalTask(task);

                    return (
                      <TaskCard
                        key={task._id}
                        task={task}
                        onStart={
                          canStart
                            ? () => handleStartTask(task._id, task)
                            : undefined
                        }
                        onPause={
                          task.status === "in_progress" &&
                          !isInformationalTask(task)
                            ? () => handlePauseTask(task._id)
                            : undefined
                        }
                        onResume={
                          task.status === "paused" && !isInformationalTask(task)
                            ? () => handleResumeTask(task._id)
                            : undefined
                        }
                        onComplete={
                          (task.status === "in_progress" ||
                            task.status === "paused") &&
                          !isInformationalTask(task)
                            ? () => handleCompleteTask(task._id)
                            : undefined
                        }
                        onViewResult={
                          task.status === "completed" && task.template_id
                            ? () => handleViewResult(task._id)
                            : undefined
                        }
                        onViewAttempts={() => handleViewAttempts(task._id)}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* In Progress Tasks */}
            {inProgressTasks.length > 0 && (
              <div className="space-y-3">
                <h2 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
                  <IconPlayerPlay className="text-green-600" size={28} />
                  {t("tasks:child_portal.working_on")}
                </h2>
                {inProgressTasks.map((task) => (
                  <TaskCard
                    key={task._id}
                    task={task}
                    // Template tasks show "Continue" button, regular tasks show "Pause"
                    onContinue={
                      task.template_id && !isInformationalTask(task)
                        ? () => navigate(`/child-portal/${childId}/tasks/execute/${task._id}`)
                        : undefined
                    }
                    onPause={
                      !task.template_id && !isInformationalTask(task)
                        ? () => handlePauseTask(task._id)
                        : undefined
                    }
                    onComplete={
                      !isInformationalTask(task)
                        ? () => handleCompleteTask(task._id)
                        : undefined
                    }
                    onViewAttempts={() => handleViewAttempts(task._id)}
                  />
                ))}
              </div>
            )}

            {/* Paused Tasks */}
            {pausedTasks.length > 0 && (
              <div className="space-y-3">
                <h2 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
                  <IconPlayerPause className="text-yellow-600" size={28} />
                  {t("tasks:child_portal.paused")}
                </h2>
                {pausedTasks.map((task) => (
                  <TaskCard
                    key={task._id}
                    task={task}
                    onResume={
                      !isInformationalTask(task)
                        ? () => handleResumeTask(task._id)
                        : undefined
                    }
                    onComplete={
                      !isInformationalTask(task)
                        ? () => handleCompleteTask(task._id)
                        : undefined
                    }
                    onViewAttempts={() => handleViewAttempts(task._id)}
                  />
                ))}
              </div>
            )}

            {/* To Do Tasks */}
            {todoTasks.length > 0 && (
              <div className="space-y-3">
                <h2 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
                  <IconChecklist className="text-blue-600" size={28} />
                  {t("tasks:child_portal.to_do")}
                </h2>
                {todoTasks.map((task) => (
                  <TaskCard
                    key={task._id}
                    task={task}
                    onStart={
                      !isInformationalTask(task)
                        ? () => handleStartTask(task._id, task)
                        : undefined
                    }
                    onViewAttempts={() => handleViewAttempts(task._id)}
                  />
                ))}
              </div>
            )}

            {/* Completed Today */}
            {completedToday.length > 0 && (
              <div className="space-y-3">
                <h2 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
                  <IconTrophy className="text-purple-600" size={28} />
                  {t("tasks:child_portal.completed_today")}
                </h2>
                {completedToday.map((task) => (
                  <TaskCard
                    key={task._id}
                    task={task}
                    onViewResult={
                      task.template_id
                        ? () => handleViewResult(task._id)
                        : undefined
                    }
                    onViewAttempts={() => handleViewAttempts(task._id)}
                  />
                ))}
              </div>
            )}

            {/* Empty State */}
            {tasks.length === 0 && completedToday.length === 0 && (
              <div className="rounded-3xl bg-white p-12 text-center shadow-xl">
                <IconTrophy
                  className="mx-auto mb-4 text-purple-400"
                  size={80}
                />
                <h3 className="mb-2 text-3xl font-bold text-gray-900">
                  {t("tasks:child_portal.all_done")}
                </h3>
                <p className="text-xl text-gray-600">
                  {t("tasks:child_portal.great_job")}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Quick Capture Modal */}
      <QuickCaptureModal
        isOpen={isQuickCaptureOpen}
        onClose={() => setIsQuickCaptureOpen(false)}
        childId={selectedChildId || ""}
      />

      {/* Plan Ahead Modal */}
      <PlanAheadModal
        isOpen={isPlanAheadOpen}
        onClose={() => setIsPlanAheadOpen(false)}
        childId={selectedChildId || ""}
      />
    </div>
  );
}

interface TaskCardProps {
  task: Task;
  onStart?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onComplete?: () => void;
  onViewResult?: () => void;
  onViewAttempts?: () => void;
  onContinue?: () => void; // For template tasks in IN_PROGRESS state
}

function TaskCard({
  task,
  onStart,
  onPause,
  onResume,
  onComplete,
  onViewResult,
  onViewAttempts,
  onContinue,
}: TaskCardProps) {
  const { t } = useTranslation(["tasks"]);

  const isInProgress = task.status === "in_progress";
  const isPaused = task.status === "paused";
  const isTemplateTask = !!task.template_id;

  return (
    <div
      className={`rounded-3xl bg-white p-6 shadow-xl transition-all hover:scale-102 ${
        isInProgress
          ? "ring-4 ring-green-400"
          : isPaused
            ? "ring-4 ring-yellow-400"
            : ""
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        {/* Task Info */}
        <div className="flex-1">
          <h3 className="mb-2 text-2xl font-bold text-gray-900">
            {task.title}
          </h3>
          {task.description && (
            <p className="mb-3 text-lg text-gray-600">{task.description}</p>
          )}

          {/* Metadata */}
          <div className="flex flex-wrap gap-3">
            {task.ai_attributes?.estimated_duration_minutes !== undefined && task.ai_attributes.estimated_duration_minutes > 0 && (
              <div className="flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-blue-700">
                <IconClock size={20} />
                <span className="font-semibold">
                  {task.ai_attributes.estimated_duration_minutes} min
                </span>
              </div>
            )}
            {task.points_earned !== undefined && task.points_earned > 0 && (
              <div className="flex items-center gap-2 rounded-full bg-yellow-100 px-4 py-2 text-yellow-700">
                <IconStar size={20} />
                <span className="font-semibold">
                  +{task.points_earned} points
                </span>
              </div>
            )}
            {task.max_completions_per_period !== undefined && (task.max_completions_per_period === 0 || task.max_completions_per_period > 1) && (
              <div className="flex items-center gap-2 rounded-full bg-purple-100 px-4 py-2 text-purple-700">
                <IconCheckbox size={20} />
                <span className="font-semibold">
                  {task.completion_count || 0} / {task.max_completions_per_period === 0 ? '∞' : task.max_completions_per_period} {t("tasks:completed")}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 sm:min-w-[180px]">
          {onStart && (
            <button
              onClick={onStart}
              className="flex min-h-[64px] items-center justify-center gap-3 rounded-2xl bg-green-600 px-8 py-4 text-xl font-bold text-white shadow-lg transition-all hover:scale-105 hover:bg-green-700"
            >
              <IconPlayerPlay size={28} />
              {task.completion_count && task.completion_count > 0
                ? t("tasks:start_again")
                : t("tasks:start")}
            </button>
          )}

          {/* View Previous Attempts Button - Show if task has at least one completion */}
          {onViewAttempts && task.completion_count !== undefined && task.completion_count > 0 && (
            <button
              onClick={onViewAttempts}
              className="flex min-h-[64px] items-center justify-center gap-3 rounded-2xl bg-indigo-600 px-8 py-4 text-xl font-bold text-white shadow-lg transition-all hover:scale-105 hover:bg-indigo-700"
            >
              <IconHistory size={28} />
              {t("tasks:view_attempts")}
            </button>
          )}

          {/* Continue button for template tasks (instead of pause) */}
          {onContinue && (
            <button
              onClick={onContinue}
              className="flex min-h-[64px] items-center justify-center gap-3 rounded-2xl bg-blue-600 px-8 py-4 text-xl font-bold text-white shadow-lg transition-all hover:scale-105 hover:bg-blue-700"
            >
              <IconPlayerPlay size={28} />
              {t("tasks:continue")}
            </button>
          )}

          {/* Pause button for regular tasks only */}
          {onPause && !isTemplateTask && (
            <button
              onClick={onPause}
              className="flex min-h-[64px] items-center justify-center gap-3 rounded-2xl bg-yellow-600 px-8 py-4 text-xl font-bold text-white shadow-lg transition-all hover:scale-105 hover:bg-yellow-700"
            >
              <IconPlayerPause size={28} />
              {t("tasks:pause")}
            </button>
          )}

          {onResume && (
            <button
              onClick={onResume}
              className="flex min-h-[64px] items-center justify-center gap-3 rounded-2xl bg-green-600 px-8 py-4 text-xl font-bold text-white shadow-lg transition-all hover:scale-105 hover:bg-green-700"
            >
              <IconPlayerPlay size={28} />
              {t("tasks:resume")}
            </button>
          )}

          {onComplete && (
            <button
              onClick={onComplete}
              className="flex min-h-[64px] items-center justify-center gap-3 rounded-2xl bg-blue-600 px-8 py-4 text-xl font-bold text-white shadow-lg transition-all hover:scale-105 hover:bg-blue-700"
            >
              <IconCheck size={28} />
              {t("tasks:complete")}
            </button>
          )}

          {onViewResult && (
            <button
              onClick={onViewResult}
              className="flex min-h-[64px] items-center justify-center gap-3 rounded-2xl bg-purple-600 px-8 py-4 text-xl font-bold text-white shadow-lg transition-all hover:scale-105 hover:bg-purple-700"
            >
              <IconStar size={28} />
              {t("tasks:view_result")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
