/**
 * Child Portal - My Tasks Page
 * Kid-friendly task interface with responsive, space-efficient design
 * Features: Collapsible sections, FAB, compact cards, split layouts
 */
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { useAppSelector } from "@/store/hooks";
import {
  IconChecklist,
  IconPlayerPlay,
  IconClock,
  IconStar,
  IconTrophy,
  IconList,
  IconCalendar,
  IconCheckbox,
  IconHistory,
} from "@tabler/icons-react";
import { useTasksByChild, useOverdueTasks } from "@/api/queries/useTasks";
import {
  useStartTask,
  useCompleteTask,
} from "@/api/mutations/useTaskMutations";
import { Task } from "@/types/task";
import { DayType } from "@/types/schoolCalendar";
import { AIRecommendationPanel } from "@/components/AIRecommendationPanel";
import { TaskCalendar } from "@/components/calendar";
import LoadingSpinner from "@/components/LoadingSpinner";
import { QuickCaptureModal } from "@/components/QuickCaptureModal";
import { PlanAheadModal } from "@/components/PlanAheadModal";
import { isToday, formatLocalDate } from "@/utils/timezone";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { FloatingActionButton } from "@/components/FloatingActionButton";
import { OverdueTaskCard } from "@/components/OverdueTaskCard";

type ViewMode = "list" | "calendar";

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
  const [selectedDayType, setSelectedDayType] = useState<DayType>();
  const [selectedDateTasks, setSelectedDateTasks] = useState<Task[]>([]);

  // TODO: Implement proper child authentication to get child_id
  const { data: allTasks, isLoading } = useTasksByChild(selectedChildId || "");
  const { data: overdueData } = useOverdueTasks(selectedChildId || "");
  const startTaskMutation = useStartTask();
  const completeTaskMutation = useCompleteTask();

  // Initialize selected date tasks when allTasks loads or selectedDate changes
  useEffect(() => {
    if (allTasks) {
      const tasksForDate = allTasks.filter((t) => {
        const taskDate = t.scheduled_date?.split("T")[0];
        return taskDate === selectedDate;
      });
      setSelectedDateTasks(tasksForDate);
    }
  }, [allTasks, selectedDate]);

  // Filter tasks for today only
  const tasks =
    allTasks?.filter((task) => {
      const today = getLocalDateString();
      const taskDate = task.scheduled_date?.split("T")[0];
      // Only show tasks scheduled for today (removed || task.status === "in_progress"
      // because virtual instances inherit in_progress status from recurring task)
      return taskDate === today;
    }) || [];

  // Get current time for informational task categorization
  const getCurrentTime = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  };

  // Categorize informational tasks by time
  // Returns null if the date is not today (no time-based categorization for past/future dates)
  const categorizeInformationalTask = (
    task: Task,
    forDate?: string
  ): "upcoming" | "current" | "past" | null => {
    if (!task.fixed_time_slot) return null;

    const { start, end } = task.fixed_time_slot;
    const today = getLocalDateString();

    // If viewing a specific date (calendar view)
    if (forDate) {
      const taskDate = task.scheduled_date?.split("T")[0];

      // If task is not on the selected date, shouldn't happen but return null
      if (taskDate !== forDate) {
        return null;
      }

      // Only categorize by time if selected date is today
      if (forDate !== today) {
        return null;
      }

      // Selected date is today - use current time to categorize
      const currentTime = getCurrentTime();
      if (currentTime < start) return "upcoming";
      if (currentTime >= start && currentTime <= end) return "current";
      return "past";
    }

    // For list view (no specific date), use current time
    const currentTime = getCurrentTime();
    if (currentTime < start) return "upcoming";
    if (currentTime >= start && currentTime <= end) return "current";
    return "past";
  };

  // Separate informational tasks by time
  const informationalTasks = tasks.filter((t) => t.is_informational);
  const upcomingSchedule = informationalTasks.filter(
    (t) => categorizeInformationalTask(t) === "upcoming"
  );
  const currentSchedule = informationalTasks.filter(
    (t) => categorizeInformationalTask(t) === "current"
  );
  const pastSchedule = informationalTasks.filter(
    (t) => categorizeInformationalTask(t) === "past"
  );

  // Separate tasks by status for better organization
  // Use string comparison to ensure matching works regardless of enum typing
  // Filter out informational tasks from in-progress and todo sections
  const inProgressTasks = tasks.filter(
    (t) => t.status === "in_progress" && !t.is_informational
  );
  const todoTasks = tasks.filter(
    (t) => t.status === "pending" && !t.is_informational
  );
  const completedToday =
    allTasks?.filter((t) => {
      const today = getLocalDateString();
      const completedDate = t.completed_at?.split("T")[0];
      return completedDate === today && t.status === "completed";
    }) || [];

  // Combine all overdue tasks from different obligation levels
  const allOverdueTasks = [
    ...(overdueData?.must_do || []),
    ...(overdueData?.should_do || []),
    ...(overdueData?.optional || []),
  ];

  // Tasks for selected date in calendar view - updated by onDayClick callback
  // State is updated when user clicks a day in the calendar

  const handleStartTask = async (taskId: string) => {
    try {
      // Start the task - this may materialize a virtual task into a real one
      const result = await startTaskMutation.mutateAsync({
        taskId,
        childId: selectedChildId || "",
      });

      // Navigate to the executor page for all tasks (template and standard)
      // Use the returned task's ID (may be different if virtual task was materialized)
      const realTaskId = result?.task?._id || taskId;
      navigate(`/child-portal/${childId}/tasks/execute/${realTaskId}`);
    } catch (error) {
      console.error("Failed to start task:", error);
    }
  };

  // Check if task is informational/blocking (no action buttons needed)
  const isInformationalTask = (task: Task): boolean => {
    return (
      task.is_informational ||
      (task.blocks_other_tasks && task.scheduling_type === "fixed_time")
    );
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
    <div className="min-h-full bg-gradient-to-br from-blue-50 to-purple-50 pb-4">
      <div className="space-y-4 px-4 pt-4 pb-10 sm:px-6 lg:px-8">
        {/* Mobile (<768px): View Toggle - Centered with text */}
        <div className="flex justify-center md:hidden">
          <div className="inline-flex gap-1.5 rounded-xl bg-white p-1 shadow">
            <button
              onClick={() => setViewMode("list")}
              className={`flex h-8 items-center gap-1 rounded-lg px-3 text-xs font-semibold transition-all ${
                viewMode === "list"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <IconList size={16} />
              <span>{t("tasks:list_view")}</span>
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={`flex h-8 items-center gap-1 rounded-lg px-3 text-xs font-semibold transition-all ${
                viewMode === "calendar"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <IconCalendar size={16} />
              <span>{t("tasks:unified_model.calendar_view")}</span>
            </button>
          </div>
        </div>

        {/* Tablet (768-1024px): View Toggle left (icons only) + Action Buttons right */}
        <div className="hidden items-center justify-between md:flex lg:hidden">
          {/* View Toggle - Left, icons only */}
          <div className="inline-flex gap-1.5 rounded-xl bg-white p-1 shadow">
            <button
              onClick={() => setViewMode("list")}
              className={`flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold transition-all ${
                viewMode === "list"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
              title={t("tasks:list_view")}
            >
              <IconList size={16} />
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={`flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold transition-all ${
                viewMode === "calendar"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
              title={t("tasks:unified_model.calendar_view")}
            >
              <IconCalendar size={16} />
            </button>
          </div>

          {/* Action Buttons - Right */}
          <div className="flex gap-2">
            <button
              onClick={() => setIsQuickCaptureOpen(true)}
              className="flex h-10 items-center gap-2 rounded-lg bg-green-600 px-4 text-sm font-semibold text-white shadow-sm transition-all hover:bg-green-700"
            >
              <IconPlayerPlay size={18} />
              <span>{t("tasks:quick_capture.button")}</span>
            </button>
            <button
              onClick={() => setIsPlanAheadOpen(true)}
              className="flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700"
            >
              <IconCalendar size={18} />
              <span>{t("tasks:plan_ahead.button")}</span>
            </button>
          </div>
        </div>

        {/* Desktop (≥1024px): View Toggle left + Action Buttons right, with text */}
        <div className="hidden items-center justify-between lg:flex">
          {/* View Toggle - Left */}
          <div className="inline-flex gap-1.5 rounded-xl bg-white p-1 shadow">
            <button
              onClick={() => setViewMode("list")}
              className={`flex h-8 items-center gap-1 rounded-lg px-3 text-xs font-semibold transition-all ${
                viewMode === "list"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <IconList size={16} />
              <span>{t("tasks:list_view")}</span>
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={`flex h-8 items-center gap-1 rounded-lg px-3 text-xs font-semibold transition-all ${
                viewMode === "calendar"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <IconCalendar size={16} />
              <span>{t("tasks:unified_model.calendar_view")}</span>
            </button>
          </div>

          {/* Action Buttons - Right */}
          <div className="flex gap-2">
            <button
              onClick={() => setIsQuickCaptureOpen(true)}
              className="flex h-10 items-center gap-2 rounded-lg bg-green-600 px-4 text-sm font-semibold text-white shadow-sm transition-all hover:bg-green-700"
            >
              <IconPlayerPlay size={18} />
              <span>{t("tasks:quick_capture.button")}</span>
            </button>
            <button
              onClick={() => setIsPlanAheadOpen(true)}
              className="flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700"
            >
              <IconCalendar size={18} />
              <span>{t("tasks:plan_ahead.button")}</span>
            </button>
          </div>
        </div>

        {/* View Content */}
        {viewMode === "calendar" ? (
          /* Calendar View - Split Layout: Calendar | Task List */
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
            {/* Left: Calendar */}
            <div className="rounded-2xl bg-white p-4 shadow-lg">
              <TaskCalendar
                tasks={allTasks || []}
                childId={selectedChildId || ""}
                onTaskClick={() => {}}
                onDayClick={(date, tasks, dayType) => {
                  setSelectedDate(date);
                  setSelectedDateTasks(tasks);
                  setSelectedDayType(dayType);
                }}
                editable={false}
              />
            </div>

            {/* Right: Task List for Selected Date */}
            <div className="rounded-2xl bg-white p-4 shadow-lg">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">
                  {new Date(selectedDate + "T00:00:00").toLocaleDateString(
                    undefined,
                    {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    }
                  )}
                </h3>
                {selectedDayType && (
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      selectedDayType === "school_day"
                        ? "bg-blue-100 text-blue-800"
                        : selectedDayType === "holiday"
                          ? "bg-green-100 text-green-800"
                          : selectedDayType === "special_school_day"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {selectedDayType === "school_day"
                      ? t("tasks:school_calendar.school_day")
                      : selectedDayType === "holiday"
                        ? t("tasks:school_calendar.holiday")
                        : selectedDayType === "special_school_day"
                          ? t("tasks:school_calendar.special_school_day")
                          : t("tasks:school_calendar.weekend")}
                  </span>
                )}
              </div>
              {selectedDateTasks.length === 0 ? (
                <p className="text-gray-600">{t("tasks:no_tasks_for_date")}</p>
              ) : (
                <div className="space-y-2">
                  {selectedDateTasks.map((task) => {
                    // Check if task is informational
                    if (isInformationalTask(task)) {
                      const timeCategory = categorizeInformationalTask(task, selectedDate);

                      // Current/happening now
                      if (timeCategory === "current") {
                        return (
                          <div
                            key={task._id}
                            className="rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 p-4 shadow-sm ring-2 ring-green-400"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-green-500">
                                <IconClock className="text-white" size={20} />
                              </div>
                              <div className="flex-1">
                                <h3 className="text-base font-bold text-gray-900">
                                  {task.title}
                                </h3>
                                {task.description && (
                                  <p className="mt-1 text-sm text-gray-600">
                                    {task.description}
                                  </p>
                                )}
                                {task.fixed_time_slot && (
                                  <div className="mt-1.5">
                                    <span className="rounded-full bg-green-500 px-3 py-1 text-xs font-medium text-white">
                                      {t("tasks:child_portal.happening_now")} •{" "}
                                      {task.fixed_time_slot.start} - {task.fixed_time_slot.end}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // Upcoming
                      if (timeCategory === "upcoming") {
                        return (
                          <div
                            key={task._id}
                            className="rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 p-4 shadow-sm"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-500">
                                <IconClock className="text-white" size={20} />
                              </div>
                              <div className="flex-1">
                                <h3 className="text-base font-bold text-gray-900">
                                  {task.title}
                                </h3>
                                {task.description && (
                                  <p className="mt-1 text-sm text-gray-600">
                                    {task.description}
                                  </p>
                                )}
                                {task.fixed_time_slot && (
                                  <div className="mt-1.5">
                                    <span className="rounded-full bg-blue-500 px-3 py-1 text-xs font-medium text-white">
                                      {t("tasks:child_portal.upcoming")} •{" "}
                                      {task.fixed_time_slot.start} - {task.fixed_time_slot.end}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // Past (time has passed today)
                      if (timeCategory === "past") {
                        return (
                          <div
                            key={task._id}
                            className="rounded-xl bg-gradient-to-r from-gray-50 to-slate-50 p-4 opacity-60 shadow-sm"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-400">
                                <IconClock className="text-white" size={20} />
                              </div>
                              <div className="flex-1">
                                <h3 className="text-base font-bold text-gray-600 line-through">
                                  {task.title}
                                </h3>
                                {task.description && (
                                  <p className="mt-1 text-sm text-gray-500">
                                    {task.description}
                                  </p>
                                )}
                                {task.fixed_time_slot && (
                                  <div className="mt-1.5">
                                    <span className="rounded-full bg-gray-400 px-3 py-1 text-xs font-medium text-white">
                                      {t("tasks:child_portal.finished")} •{" "}
                                      {task.fixed_time_slot.start} - {task.fixed_time_slot.end}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // Neutral style for past/future dates (timeCategory === null)
                      return (
                        <div
                          key={task._id}
                          className="rounded-xl bg-gradient-to-r from-purple-50 to-indigo-50 p-4 shadow-sm"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-purple-500">
                              <IconClock className="text-white" size={20} />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-base font-bold text-gray-900">
                                {task.title}
                              </h3>
                              {task.description && (
                                <p className="mt-1 text-sm text-gray-600">
                                  {task.description}
                                </p>
                              )}
                              {task.fixed_time_slot && (
                                <div className="mt-1.5">
                                  <span className="rounded-full bg-purple-500 px-3 py-1 text-xs font-medium text-white">
                                    {task.fixed_time_slot.start} - {task.fixed_time_slot.end}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // Regular task - use TaskCard
                    const canStart =
                      task.status === "pending" && !isInformationalTask(task);
                    return (
                      <TaskCard
                        key={task._id}
                        task={task}
                        isCompact={true}
                        onStart={
                          canStart ? () => handleStartTask(task._id) : undefined
                        }
                        onResume={
                          task.status === "in_progress" &&
                          !isInformationalTask(task)
                            ? () =>
                                navigate(
                                  `/child-portal/${childId}/tasks/execute/${task._id}`
                                )
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
          /* List View - Split Layout: Today's Tasks | Overdue Tasks */
          <>
            {/* AI Recommendation Panel - Full width above task lists */}
            <AIRecommendationPanel childId={selectedChildId || ""} defaultExpanded={false} />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
              {/* Left Column: Today's Tasks */}
              <div className="space-y-3">
              {/* Today's Schedule - Informational Tasks */}
              {informationalTasks.length > 0 && (
                <CollapsibleSection
                  title={t("tasks:child_portal.todays_schedule")}
                  icon={<IconCalendar size={18} />}
                  count={informationalTasks.length}
                  variant="primary"
                  defaultExpanded={true}
                >
                  {/* Current Schedule (happening now) */}
                  {currentSchedule.map((task) => (
                    <div
                      key={task._id}
                      className="rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 p-4 shadow-sm ring-2 ring-green-400"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-green-500">
                          <IconClock className="text-white" size={24} />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-900">
                            {task.title}
                          </h3>
                          {task.description && (
                            <p className="mt-1 text-sm text-gray-600">
                              {task.description}
                            </p>
                          )}
                          {task.fixed_time_slot && (
                            <div className="mt-1.5 flex items-center gap-2">
                              <span className="rounded-full bg-green-500 px-3 py-1 text-sm font-medium text-white">
                                {t("tasks:child_portal.happening_now")} •{" "}
                                {task.fixed_time_slot.start} -{" "}
                                {task.fixed_time_slot.end}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Upcoming Schedule */}
                  {upcomingSchedule.map((task) => (
                    <div
                      key={task._id}
                      className="rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 p-4 shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-500">
                          <IconClock className="text-white" size={24} />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-900">
                            {task.title}
                          </h3>
                          {task.description && (
                            <p className="mt-1 text-sm text-gray-600">
                              {task.description}
                            </p>
                          )}
                          {task.fixed_time_slot && (
                            <div className="mt-1.5 flex items-center gap-2">
                              <span className="rounded-full bg-blue-500 px-3 py-1 text-sm font-medium text-white">
                                {t("tasks:child_portal.upcoming")} •{" "}
                                {task.fixed_time_slot.start} -{" "}
                                {task.fixed_time_slot.end}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Past Schedule */}
                  {pastSchedule.map((task) => (
                    <div
                      key={task._id}
                      className="rounded-xl bg-gradient-to-r from-gray-50 to-slate-50 p-4 opacity-60 shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gray-400">
                          <IconClock className="text-white" size={24} />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-600 line-through">
                            {task.title}
                          </h3>
                          {task.description && (
                            <p className="mt-1 text-sm text-gray-500">
                              {task.description}
                            </p>
                          )}
                          {task.fixed_time_slot && (
                            <div className="mt-1.5 flex items-center gap-2">
                              <span className="rounded-full bg-gray-400 px-3 py-1 text-sm font-medium text-white">
                                {t("tasks:child_portal.finished")} •{" "}
                                {task.fixed_time_slot.start} -{" "}
                                {task.fixed_time_slot.end}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </CollapsibleSection>
              )}

              {/* In Progress Tasks */}
              {inProgressTasks.length > 0 && (
                <CollapsibleSection
                  title={t("tasks:child_portal.working_on")}
                  icon={<IconPlayerPlay size={20} />}
                  count={inProgressTasks.length}
                  variant="success"
                  defaultExpanded={true}
                >
                  {inProgressTasks.map((task) => (
                    <TaskCard
                      key={task._id}
                      task={task}
                      isCompact={true}
                      onResume={
                        !isInformationalTask(task)
                          ? () =>
                              navigate(
                                `/child-portal/${childId}/tasks/execute/${task._id}`
                              )
                          : undefined
                      }
                      onViewAttempts={() => handleViewAttempts(task._id)}
                    />
                  ))}
                </CollapsibleSection>
              )}

              {/* To Do Tasks */}
              {todoTasks.length > 0 && (
                <CollapsibleSection
                  title={t("tasks:child_portal.to_do")}
                  icon={<IconChecklist size={20} />}
                  count={todoTasks.length}
                  variant="primary"
                  defaultExpanded={true}
                >
                  {todoTasks.map((task) => (
                    <TaskCard
                      key={task._id}
                      task={task}
                      isCompact={true}
                      onStart={
                        !isInformationalTask(task)
                          ? () => handleStartTask(task._id)
                          : undefined
                      }
                      onViewAttempts={() => handleViewAttempts(task._id)}
                    />
                  ))}
                </CollapsibleSection>
              )}

              {/* Completed Today */}
              {completedToday.length > 0 && (
                <CollapsibleSection
                  title={t("tasks:child_portal.completed_today")}
                  icon={<IconTrophy size={20} />}
                  count={completedToday.length}
                  variant="default"
                  defaultExpanded={false}
                >
                  {completedToday.map((task) => (
                    <TaskCard
                      key={task._id}
                      task={task}
                      isCompact={true}
                      onViewResult={
                        task.template_id
                          ? () => handleViewResult(task._id)
                          : undefined
                      }
                      onViewAttempts={() => handleViewAttempts(task._id)}
                      showScheduledDate={true}
                    />
                  ))}
                </CollapsibleSection>
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
            </div>

            {/* Right Column: Overdue Tasks */}
            <div className="space-y-3">
              <h2 className="flex items-center gap-2 text-lg font-bold text-red-600">
                <IconClock size={20} />
                {t("tasks:overdue")}
              </h2>

              {allOverdueTasks.length === 0 ? (
                <div className="rounded-2xl bg-white p-8 text-center shadow-lg">
                  <IconTrophy
                    className="mx-auto mb-2 text-green-400"
                    size={48}
                  />
                  <p className="text-gray-600">{t("tasks:no_overdue_tasks")}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {allOverdueTasks.map((task) => (
                    <OverdueTaskCard
                      key={task.task_id}
                      task={task}
                      childId={selectedChildId || ""}
                      onMarkDone={async (taskId) => {
                        await completeTaskMutation.mutateAsync({
                          taskId,
                          childId: selectedChildId || "",
                        });
                      }}
                      onMarkAllDone={async (sourceId) => {
                        // Mark all overdue instances of this recurring task as done
                        const tasksToComplete = allOverdueTasks.filter(
                          (t) => t.is_recurring && t.source_id === sourceId
                        );
                        for (const t of tasksToComplete) {
                          await completeTaskMutation.mutateAsync({
                            taskId: t.task_id,
                            childId: selectedChildId || "",
                          });
                        }
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
          </>
        )}
      </div>

      {/* Floating Action Button - Small Mobile Only (below md breakpoint) */}
      <div className="md:hidden">
        <FloatingActionButton
          onQuickCapture={() => setIsQuickCaptureOpen(true)}
          onPlanAhead={() => setIsPlanAheadOpen(true)}
          onAIRecommendation={() => setShowAIRecommendation(true)}
        />
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
  onResume?: () => void; // Resume task execution
  onViewResult?: () => void;
  onViewAttempts?: () => void;
  showScheduledDate?: boolean; // Show scheduled date for completed tasks
  isCompact?: boolean; // Compact mode for tighter spacing
}

function TaskCard({
  task,
  onStart,
  onResume,
  onViewResult,
  onViewAttempts,
  showScheduledDate,
  isCompact = false,
}: TaskCardProps) {
  const { t, i18n } = useTranslation(["tasks"]);

  const isInProgress = task.status === "in_progress";

  // Responsive sizing based on compact mode
  const cardPadding = isCompact ? "p-4" : "p-5 md:p-6";
  const titleSize = isCompact ? "text-xl" : "text-xl md:text-2xl";
  const descSize = isCompact ? "text-base" : "text-lg";
  const metadataGap = isCompact ? "gap-2" : "gap-3";

  return (
    <div
      className={`rounded-2xl bg-white shadow-lg transition-all hover:shadow-xl ${cardPadding} ${
        isInProgress ? "ring-4 ring-green-400" : ""
      }`}
    >
      {/* Task Info */}
      <div className="mb-3">
        <h3 className={`mb-2 font-bold text-gray-900 ${titleSize}`}>
          {task.title}
        </h3>
        {task.description && (
          <p className={`mb-2 text-gray-600 ${descSize}`}>{task.description}</p>
        )}

        {/* Metadata Tags */}
        <div className={`flex flex-wrap ${metadataGap}`}>
          {/* Fixed Time Slot */}
          {task.fixed_time_slot && (
            <div className="flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1 text-purple-700">
              <IconClock size={14} />
              <span className="text-sm font-medium">
                {task.fixed_time_slot.start} - {task.fixed_time_slot.end}
              </span>
            </div>
          )}
          {/* Preferred Time Window */}
          {task.preferred_time_window && (
            <div className="flex items-center gap-1.5 rounded-full bg-cyan-100 px-3 py-1 text-cyan-700">
              <IconClock size={14} />
              <span className="text-sm font-medium">
                {task.preferred_time_window.start} -{" "}
                {task.preferred_time_window.end}
              </span>
            </div>
          )}
          {/* Preferred Time Slot (only if no fixed_time_slot or time_window) */}
          {task.preferred_time_slot &&
            !task.fixed_time_slot &&
            !task.preferred_time_window && (
              <div className="flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-blue-700">
                <IconClock size={14} />
                <span className="text-sm font-medium">
                  {task.preferred_time_slot.start} -{" "}
                  {task.preferred_time_slot.end}
                </span>
              </div>
            )}
          {/* Estimated Duration */}
          {task.ai_attributes?.estimated_duration_minutes !== undefined &&
            task.ai_attributes.estimated_duration_minutes > 0 && (
              <div className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-gray-700">
                <IconClock size={14} />
                <span className="text-sm font-medium">
                  {task.ai_attributes.estimated_duration_minutes} min
                </span>
              </div>
            )}
          {task.points_earned !== undefined && task.points_earned > 0 && (
            <div className="flex items-center gap-1.5 rounded-full bg-yellow-100 px-3 py-1 text-yellow-700">
              <IconStar size={14} />
              <span className="text-sm font-medium">
                +{task.points_earned} points
              </span>
            </div>
          )}
          {task.max_completions_per_period !== undefined &&
            (task.max_completions_per_period === 0 ||
              task.max_completions_per_period > 1) && (
              <div className="flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1 text-purple-700">
                <IconCheckbox size={14} />
                <span className="text-sm font-medium">
                  {task.completion_count || 0} /{" "}
                  {task.max_completions_per_period === 0
                    ? "∞"
                    : task.max_completions_per_period}{" "}
                  {t("tasks:completed")}
                </span>
              </div>
            )}

          {/* Completion Condition - for template tasks with required_attempts */}
          {task.template_id && task.execution_config?.required_attempts && (
            <div className="flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-green-700">
              <IconCheckbox size={14} />
              <span className="text-sm font-medium">
                {t("tasks:completion_condition")}: {task.completion_count || 0}{" "}
                / {task.execution_config.required_attempts}{" "}
                {t("tasks:attempts")}
              </span>
            </div>
          )}

          {/* Scheduled Date - for completed tasks */}
          {showScheduledDate && task.scheduled_date && (
            <div className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-gray-700">
              <IconCalendar size={14} />
              <span className="text-sm font-medium">
                {t("tasks:scheduled")}:{" "}
                {isToday(task.scheduled_date)
                  ? t("tasks:today")
                  : formatLocalDate(task.scheduled_date, i18n.language)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons - Bottom Right */}
      <div className="flex justify-end gap-2">
        {/* View Previous Attempts Button - Show if task has at least one completion */}
        {onViewAttempts &&
          task.completion_count !== undefined &&
          task.completion_count > 0 && (
            <button
              onClick={onViewAttempts}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-md transition-all hover:bg-indigo-700"
            >
              <IconHistory size={16} />
              <span>{t("tasks:view_attempts")}</span>
            </button>
          )}

        {onViewResult && (
          <button
            onClick={onViewResult}
            className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-sm font-bold text-white shadow-md transition-all hover:bg-purple-700"
          >
            <IconStar size={16} />
            <span>{t("tasks:view_result")}</span>
          </button>
        )}

        {/* Resume button for in-progress tasks - rightmost */}
        {onResume && (
          <button
            onClick={onResume}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-md transition-all hover:bg-blue-700"
          >
            <IconPlayerPlay size={16} />
            <span>{t("tasks:resume")}</span>
          </button>
        )}

        {/* Start button - rightmost when present */}
        {onStart && (
          <button
            onClick={onStart}
            className="flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white shadow-md transition-all hover:bg-green-700"
          >
            <IconPlayerPlay size={16} />
            <span>
              {task.completion_count && task.completion_count > 0
                ? t("tasks:start_again")
                : t("tasks:start")}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
