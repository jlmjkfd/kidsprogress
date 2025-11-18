/**
 * Child Portal - My Tasks Page
 * Kid-friendly task interface with large buttons and simple UI
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
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
} from "@tabler/icons-react";
import { useTasksByChild } from "@/api/queries/useTasks";
import { useStartTask, usePauseTask, useCompleteTask, useResumeTask } from "@/api/mutations/useTaskMutations";
import { Task, TaskStatus } from "@/types/task";
import { AIRecommendationButton } from "@/components/AIRecommendationButton";
import { TaskCalendar } from "@/components/TaskCalendar";

type ViewMode = "list" | "calendar";

export default function ChildTasksPage() {
  const { t } = useTranslation(["tasks", "common"]);
  const selectedChildId = useAppSelector((state) => state.child.selectedChildId);

  const [filter, setFilter] = useState<"today" | "all">("today");
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  // TODO: Implement proper child authentication to get child_id
  const { data: allTasks, isLoading} = useTasksByChild(selectedChildId || "");
  const startTaskMutation = useStartTask();
  const pauseTaskMutation = usePauseTask();
  const resumeTaskMutation = useResumeTask();
  const completeTaskMutation = useCompleteTask();

  // Filter tasks for display
  const tasks = allTasks?.filter((task) => {
    if (filter === "today") {
      const today = new Date().toISOString().split("T")[0];
      const taskDate = task.scheduled_date?.split("T")[0];
      return taskDate === today || task.status === "in_progress" || task.status === "paused";
    }
    return task.status !== "completed" && task.status !== "cancelled";
  }) || [];

  // Separate tasks by status for better organization
  const inProgressTasks = tasks.filter(t => t.status === TaskStatus.IN_PROGRESS);
  const pausedTasks = tasks.filter(t => t.status === TaskStatus.PAUSED);
  const todoTasks = tasks.filter(t => t.status === TaskStatus.SCHEDULED || t.status === TaskStatus.DRAFT);
  const completedToday = allTasks?.filter(t => {
    const today = new Date().toISOString().split("T")[0];
    const completedDate = t.completed_at?.split("T")[0];
    return completedDate === today;
  }) || [];

  const handleStartTask = async (taskId: string) => {
    try {
      await startTaskMutation.mutateAsync({ taskId, childId: selectedChildId || "" });
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
      await completeTaskMutation.mutateAsync({ taskId, childId: selectedChildId || "" });
    } catch (error) {
      console.error("Failed to complete task:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4 sm:p-6 lg:p-8">
        <div className="text-center text-2xl text-gray-600">{t("common:loading")}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-6">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          <IconChecklist className="text-blue-600" size={48} />
          {t("tasks:child_portal.my_tasks")}
        </h1>

        {/* Points Display */}
        <div className="flex items-center gap-4 mt-4">
          <div className="bg-white rounded-full px-6 py-3 shadow-lg flex items-center gap-2">
            <IconStar className="text-yellow-500" size={24} />
            <span className="text-xl font-bold text-gray-900">
              {completedToday.length} {t("tasks:child_portal.completed_today")}
            </span>
          </div>
          <div className="bg-white rounded-full px-6 py-3 shadow-lg flex items-center gap-2">
            <IconTrophy className="text-purple-500" size={24} />
            <span className="text-xl font-bold text-gray-900">
              {completedToday.reduce((sum, t) => sum + (t.points_earned || 0), 0)} {t("tasks:child_portal.points")}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* AI Recommendation */}
        <AIRecommendationButton childId={selectedChildId || ""} />

        {/* Filter Tabs */}
        <div className="flex gap-3">
          <button
            onClick={() => setFilter("today")}
            className={`flex-1 py-4 px-6 rounded-2xl font-bold text-lg transition-all shadow-lg min-h-[60px] ${
              filter === "today"
                ? "bg-blue-600 text-white scale-105"
                : "bg-white text-gray-700 hover:bg-blue-50"
            }`}
          >
            {t("tasks:child_portal.today")}
          </button>
          <button
            onClick={() => setFilter("all")}
            className={`flex-1 py-4 px-6 rounded-2xl font-bold text-lg transition-all shadow-lg min-h-[60px] ${
              filter === "all"
                ? "bg-blue-600 text-white scale-105"
                : "bg-white text-gray-700 hover:bg-blue-50"
            }`}
          >
            {t("tasks:child_portal.all_tasks")}
          </button>
        </div>

        {/* View Toggle */}
        <div className="flex justify-center">
          <div className="inline-flex bg-white rounded-2xl shadow-lg overflow-hidden">
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-2 px-6 py-3 font-bold transition-all min-h-[56px] ${
                viewMode === "list"
                  ? "bg-blue-600 text-white"
                  : "text-gray-700 hover:bg-blue-50"
              }`}
            >
              <IconList size={24} />
              <span className="hidden sm:inline">{t("tasks:unified_model.list_view")}</span>
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={`flex items-center gap-2 px-6 py-3 font-bold transition-all min-h-[56px] ${
                viewMode === "calendar"
                  ? "bg-blue-600 text-white"
                  : "text-gray-700 hover:bg-blue-50"
              }`}
            >
              <IconCalendar size={24} />
              <span className="hidden sm:inline">{t("tasks:unified_model.calendar_view")}</span>
            </button>
          </div>
        </div>

        {/* Calendar or List View */}
        {viewMode === "calendar" ? (
          <TaskCalendar
            tasks={allTasks || []}
            childId={selectedChildId || ""}
            onTaskClick={() => {}}
            editable={false}
          />
        ) : (
          <>
            {/* In Progress Tasks */}
            {inProgressTasks.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <IconPlayerPlay className="text-green-600" size={28} />
                  {t("tasks:child_portal.working_on")}
                </h2>
                {inProgressTasks.map((task) => (
                  <TaskCard
                    key={task._id}
                    task={task}
                    onPause={() => handlePauseTask(task._id)}
                    onComplete={() => handleCompleteTask(task._id)}
                  />
                ))}
              </div>
            )}

            {/* Paused Tasks */}
            {pausedTasks.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <IconPlayerPause className="text-yellow-600" size={28} />
                  {t("tasks:child_portal.paused")}
                </h2>
                {pausedTasks.map((task) => (
                  <TaskCard
                    key={task._id}
                    task={task}
                    onResume={() => handleResumeTask(task._id)}
                    onComplete={() => handleCompleteTask(task._id)}
                  />
                ))}
              </div>
            )}

            {/* To Do Tasks */}
            {todoTasks.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <IconChecklist className="text-blue-600" size={28} />
                  {t("tasks:child_portal.to_do")}
                </h2>
                {todoTasks.map((task) => (
                  <TaskCard
                    key={task._id}
                    task={task}
                    onStart={() => handleStartTask(task._id)}
                  />
                ))}
              </div>
            )}

            {/* Empty State */}
            {tasks.length === 0 && (
              <div className="bg-white rounded-3xl shadow-xl p-12 text-center">
                <IconTrophy className="mx-auto text-purple-400 mb-4" size={80} />
                <h3 className="text-3xl font-bold text-gray-900 mb-2">
                  {t("tasks:child_portal.all_done")}
                </h3>
                <p className="text-xl text-gray-600">{t("tasks:child_portal.great_job")}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

interface TaskCardProps {
  task: Task;
  onStart?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onComplete?: () => void;
}

function TaskCard({ task, onStart, onPause, onResume, onComplete }: TaskCardProps) {
  const { t } = useTranslation(["tasks"]);

  const isInProgress = task.status === TaskStatus.IN_PROGRESS;
  const isPaused = task.status === TaskStatus.PAUSED;

  return (
    <div className={`bg-white rounded-3xl shadow-xl p-6 transition-all hover:scale-102 ${
      isInProgress ? "ring-4 ring-green-400" : isPaused ? "ring-4 ring-yellow-400" : ""
    }`}>
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        {/* Task Info */}
        <div className="flex-1">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">{task.title}</h3>
          {task.description && (
            <p className="text-lg text-gray-600 mb-3">{task.description}</p>
          )}

          {/* Metadata */}
          <div className="flex flex-wrap gap-3">
            {task.ai_attributes?.estimated_duration_minutes && (
              <div className="flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full">
                <IconClock size={20} />
                <span className="font-semibold">{task.ai_attributes.estimated_duration_minutes} min</span>
              </div>
            )}
            {task.points_earned && (
              <div className="flex items-center gap-2 bg-yellow-100 text-yellow-700 px-4 py-2 rounded-full">
                <IconStar size={20} />
                <span className="font-semibold">+{task.points_earned} points</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 sm:min-w-[180px]">
          {onStart && (
            <button
              onClick={onStart}
              className="flex items-center justify-center gap-3 bg-green-600 text-white px-8 py-4 rounded-2xl font-bold text-xl hover:bg-green-700 transition-all shadow-lg hover:scale-105 min-h-[64px]"
            >
              <IconPlayerPlay size={28} />
              {t("tasks:start")}
            </button>
          )}

          {onPause && (
            <button
              onClick={onPause}
              className="flex items-center justify-center gap-3 bg-yellow-600 text-white px-8 py-4 rounded-2xl font-bold text-xl hover:bg-yellow-700 transition-all shadow-lg hover:scale-105 min-h-[64px]"
            >
              <IconPlayerPause size={28} />
              {t("tasks:pause")}
            </button>
          )}

          {onResume && (
            <button
              onClick={onResume}
              className="flex items-center justify-center gap-3 bg-green-600 text-white px-8 py-4 rounded-2xl font-bold text-xl hover:bg-green-700 transition-all shadow-lg hover:scale-105 min-h-[64px]"
            >
              <IconPlayerPlay size={28} />
              {t("tasks:resume")}
            </button>
          )}

          {onComplete && (
            <button
              onClick={onComplete}
              className="flex items-center justify-center gap-3 bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold text-xl hover:bg-blue-700 transition-all shadow-lg hover:scale-105 min-h-[64px]"
            >
              <IconCheck size={28} />
              {t("tasks:complete")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
