/**
 * Task List Page - All task instances for a child
 */
import { useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  IconPlus,
  IconChecklist,
  IconFilter,
  IconCalendar,
  IconPlayerPlay,
  IconPlayerPause,
  IconCheck,
  IconCopy,
  IconClock,
  IconAlertCircle,
  IconEdit,
  IconList,
  IconRepeat,
  IconLock,
  IconSchool,
} from "@tabler/icons-react";
import { useTasksByChild } from "@/api/queries/useTasks";
import {
  useStartTask,
  usePauseTask,
  useCompleteTask,
  useCreateTask,
  useResumeTask,
  useUpdateTask,
} from "@/api/mutations/useTaskMutations";
import {
  Task,
  TaskStatus,
  TaskCreate,
  TaskUpdate,
  SchedulingType,
  ObligationLevel,
} from "@/types/task";
import { UnifiedTaskModal } from "./components/UnifiedTaskModal";
import { useScheduleConflicts } from "@/api/queries/useAISchedule";
import { useReplanSchedule } from "@/api/mutations/useAIScheduleMutations";
import { TaskCalendar } from "@/components/TaskCalendar";
import { SchoolCalendarModal } from "@/components/SchoolCalendarModal";
import { DayDetailModal } from "@/components/DayDetailModal";
import { DayType } from "@/types/schoolCalendar";

type FilterType = "all" | "today" | "upcoming" | "completed";
type ViewMode = "list" | "calendar";

export default function ChildTasksPage() {
  const { childId } = useParams<{ childId: string }>();
  const { t } = useTranslation(["common", "tasks"]);

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [filterType, setFilterType] = useState<FilterType>("today");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [schedulingTypeFilter, setSchedulingTypeFilter] = useState<
    SchedulingType | "all"
  >("all");
  const [obligationFilter, setObligationFilter] = useState<
    ObligationLevel | "all"
  >("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showSchoolCalendar, setShowSchoolCalendar] = useState(false);
  const [showDayDetail, setShowDayDetail] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedDateTasks, setSelectedDateTasks] = useState<Task[]>([]);
  const [selectedDayType, setSelectedDayType] = useState<DayType | undefined>();

  const { data: tasks, isLoading } = useTasksByChild(childId || "");
  const { data: conflicts } = useScheduleConflicts(childId || "");
  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();
  const startTaskMutation = useStartTask();
  const pauseTaskMutation = usePauseTask();
  const resumeTaskMutation = useResumeTask();
  const completeTaskMutation = useCompleteTask();
  const replanMutation = useReplanSchedule();

  // Get parent ID from tasks (since parent is authenticated)
  const parentId = tasks && tasks.length > 0 ? tasks[0].parent_id : "";

  const handleStartTask = async (taskId: string) => {
    try {
      await startTaskMutation.mutateAsync({ taskId, childId: childId || "" });
    } catch (error) {
      console.error("Failed to start task:", error);
    }
  };

  const handlePauseTask = async (taskId: string) => {
    try {
      await pauseTaskMutation.mutateAsync({ taskId, pausedBy: "PARENT" });
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
      const task = tasks?.find((t) => t._id === taskId);
      const startTime = task?.started_at
        ? new Date(task.started_at)
        : new Date();
      const endTime = new Date();
      const actualDuration = Math.round(
        (endTime.getTime() - startTime.getTime()) / 60000
      ); // minutes
      const estimatedDuration =
        task?.ai_attributes?.estimated_duration_minutes || 30;

      await completeTaskMutation.mutateAsync({
        taskId,
        childId: childId || "",
      });

      // Check if task took longer than expected
      if (actualDuration > estimatedDuration + 10) {
        // Trigger replanning
        replanMutation.mutate({
          child_id: childId || "",
          parent_id: parentId,
          current_task_id: taskId,
          actual_duration: actualDuration,
          estimated_duration: estimatedDuration,
        });
      }
    } catch (error) {
      console.error("Failed to complete task:", error);
    }
  };

  const handleCreateTask = async (data: TaskCreate | TaskUpdate) => {
    if ("collection_id" in data && "child_id" in data) {
      await createTaskMutation.mutateAsync(data as TaskCreate);
    }
  };

  const handleUpdateTask = async (data: TaskCreate | TaskUpdate) => {
    if (editingTask && !("collection_id" in data)) {
      await updateTaskMutation.mutateAsync({
        taskId: editingTask._id,
        data: data as TaskUpdate,
      });
      setEditingTask(null);
    }
  };

  const handleDayClick = (date: string, dayTasks: Task[], dayType?: DayType) => {
    setSelectedDate(date);
    setSelectedDateTasks(dayTasks);
    setSelectedDayType(dayType);
    setShowDayDetail(true);
  };

  // Get overdue tasks (past tasks that are not completed or cancelled)
  const getOverdueTasks = () => {
    if (!tasks) return [];
    const today = new Date().toISOString().split("T")[0];
    return tasks.filter((task) => {
      const taskDate = task.scheduled_date?.split("T")[0];
      return (
        taskDate &&
        taskDate < today &&
        task.status !== TaskStatus.COMPLETED &&
        task.status !== TaskStatus.CANCELLED
      );
    });
  };

  const overdueTasks = getOverdueTasks();

  // Check if a task is overdue
  const isTaskOverdue = (task: Task): boolean => {
    const today = new Date().toISOString().split("T")[0];
    const taskDate = task.scheduled_date?.split("T")[0];
    return !!(
      taskDate &&
      taskDate < today &&
      task.status !== TaskStatus.COMPLETED &&
      task.status !== TaskStatus.CANCELLED
    );
  };

  // Filter tasks based on current filters
  const filteredTasks =
    tasks?.filter((task) => {
      // Date filter
      if (filterType === "today") {
        const today = new Date().toISOString().split("T")[0];
        const taskDate = task.scheduled_date?.split("T")[0];
        // Show tasks scheduled for today OR overdue tasks (past incomplete tasks)
        // OR tasks without a scheduled date (draft/unscheduled tasks)
        const isOverdue =
          taskDate &&
          taskDate < today &&
          task.status !== TaskStatus.COMPLETED &&
          task.status !== TaskStatus.CANCELLED;
        if (taskDate && taskDate !== today && !isOverdue) return false;
      } else if (filterType === "upcoming") {
        const today = new Date().toISOString().split("T")[0];
        const taskDate = task.scheduled_date?.split("T")[0];
        // Only show tasks with future dates
        if (!taskDate || taskDate <= today) return false;
      } else if (filterType === "completed") {
        if (task.status !== TaskStatus.COMPLETED) return false;
      }

      // Status filter
      if (statusFilter !== "all" && task.status !== statusFilter) return false;

      // Scheduling Type filter
      if (
        schedulingTypeFilter !== "all" &&
        task.scheduling_type !== schedulingTypeFilter
      )
        return false;

      // Obligation Level filter
      if (
        obligationFilter !== "all" &&
        task.obligation_level !== obligationFilter
      )
        return false;

      return true;
    }) || [];

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.COMPLETED:
        return "bg-green-100 text-green-700";
      case TaskStatus.IN_PROGRESS:
        return "bg-blue-100 text-blue-700";
      case TaskStatus.PAUSED:
        return "bg-yellow-100 text-yellow-700";
      case TaskStatus.CANCELLED:
        return "bg-red-100 text-red-700";
      case TaskStatus.ARCHIVED:
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  const getSchedulingTypeBadge = (schedulingType: SchedulingType) => {
    switch (schedulingType) {
      case SchedulingType.FIXED_TIME:
        return { label: t("tasks:fixed"), color: "bg-blue-100 text-blue-700" };
      case SchedulingType.TIME_WINDOW:
        return {
          label: t("tasks:window"),
          color: "bg-purple-100 text-purple-700",
        };
      case SchedulingType.DEADLINE:
        return { label: t("tasks:deadline"), color: "bg-red-100 text-red-700" };
      case SchedulingType.POOL:
        return {
          label: t("tasks:pool"),
          color: "bg-yellow-100 text-yellow-700",
        };
      default:
        return {
          label: t("tasks:flexible"),
          color: "bg-green-100 text-green-700",
        };
    }
  };

  const getObligationBadge = (obligationLevel: ObligationLevel) => {
    switch (obligationLevel) {
      case ObligationLevel.MUST_DO:
        return { label: t("tasks:must_do"), color: "bg-red-100 text-red-700" };
      case ObligationLevel.SHOULD_DO:
        return {
          label: t("tasks:should_do"),
          color: "bg-orange-100 text-orange-700",
        };
      default:
        return {
          label: t("tasks:optional"),
          color: "bg-gray-100 text-gray-700",
        };
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="text-gray-600">{t("common:loading")}</div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
            {t("tasks:task_list.title")}
          </h1>
          <p className="mt-1 text-sm text-gray-600 md:text-base">
            {t("tasks:task_list.description")}
          </p>
        </div>
        <div className="flex gap-2">
          {/* View Toggle */}
          <div className="flex overflow-hidden rounded-lg border border-gray-300">
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-2 px-3 py-2 transition-colors ${
                viewMode === "list"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
              title={t("tasks:unified_model.list_view")}
            >
              <IconList size={18} />
              <span className="hidden sm:inline">
                {t("tasks:unified_model.list_view")}
              </span>
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={`flex items-center gap-2 px-3 py-2 transition-colors ${
                viewMode === "calendar"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
              title={t("tasks:unified_model.calendar_view")}
            >
              <IconCalendar size={18} />
              <span className="hidden sm:inline">
                {t("tasks:unified_model.calendar_view")}
              </span>
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowSchoolCalendar(true)}
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg border-2 border-blue-600 px-4 py-2 text-blue-600 transition-colors hover:bg-blue-50"
              title={t("tasks:school_calendar.title")}
            >
              <IconSchool size={20} />
              <span className="hidden sm:inline">{t("tasks:school_calendar.title")}</span>
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
            >
              <IconPlus size={20} />
              <span>{t("tasks:create_task")}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 space-y-4 rounded-lg bg-white p-4 shadow">
        {/* Date Filter */}
        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
            <IconCalendar size={16} />
            {t("tasks:task_list.date_filter")}
          </label>
          <div className="flex flex-wrap gap-2">
            {(["all", "today", "upcoming", "completed"] as FilterType[]).map(
              (filter) => (
                <button
                  key={filter}
                  onClick={() => setFilterType(filter)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    filterType === filter
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {t(`tasks:task_list.filter_${filter}`)}
                </button>
              )
            )}
          </div>
        </div>

        {/* Scheduling Type Filter */}
        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
            <IconFilter size={16} />
            {t("tasks:unified_model.scheduling_type_filter")}
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSchedulingTypeFilter("all")}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                schedulingTypeFilter === "all"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {t("tasks:all")}
            </button>
            {[
              SchedulingType.FLEXIBLE,
              SchedulingType.FIXED_TIME,
              SchedulingType.TIME_WINDOW,
              SchedulingType.DEADLINE,
              SchedulingType.POOL,
            ].map((type) => (
              <button
                key={type}
                onClick={() => setSchedulingTypeFilter(type)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  schedulingTypeFilter === type
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {t(`tasks:unified_model.scheduling_type_${type}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Obligation Level Filter */}
        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
            <IconFilter size={16} />
            {t("tasks:unified_model.obligation_filter")}
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setObligationFilter("all")}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                obligationFilter === "all"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {t("tasks:all")}
            </button>
            {[
              ObligationLevel.MUST_DO,
              ObligationLevel.SHOULD_DO,
              ObligationLevel.OPTIONAL,
            ].map((level) => (
              <button
                key={level}
                onClick={() => setObligationFilter(level)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  obligationFilter === level
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {t(`tasks:unified_model.obligation_${level}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Status Filter */}
        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
            <IconChecklist size={16} />
            {t("tasks:task_list.status_filter")}
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setStatusFilter("all")}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                statusFilter === "all"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {t("tasks:all")}
            </button>
            {[
              TaskStatus.DRAFT,
              TaskStatus.SCHEDULED,
              TaskStatus.IN_PROGRESS,
              TaskStatus.PAUSED,
              TaskStatus.COMPLETED,
            ].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {t(`tasks:${status}`)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Task List or Calendar View */}
      {viewMode === "calendar" ? (
        <TaskCalendar
          tasks={tasks || []}
          childId={childId || ""}
          onTaskClick={setEditingTask}
          onDayClick={handleDayClick}
          editable={true}
        />
      ) : (
        <>
          {filteredTasks.length === 0 ? (
            <div className="rounded-lg bg-white p-8 text-center shadow">
              <IconChecklist className="mx-auto mb-4 h-16 w-16 text-gray-400" />
              <h3 className="mb-2 text-lg font-semibold text-gray-900">
                {t("tasks:task_list.empty_title")}
              </h3>
              <p className="mb-6 text-gray-600">
                {t("tasks:task_list.empty_description")}
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700"
              >
                <IconPlus size={20} />
                <span>{t("tasks:task_list.create_first")}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTasks.map((task) => {
                const schedulingBadge = getSchedulingTypeBadge(
                  task.scheduling_type
                );
                const obligationBadge = getObligationBadge(
                  task.obligation_level
                );
                const isOverdue = isTaskOverdue(task);
                return (
                  <div
                    key={task._id}
                    className={`rounded-lg p-4 shadow transition-shadow hover:shadow-md ${
                      isOverdue
                        ? "border-2 border-red-300 bg-red-50"
                        : "bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        {/* Title and badges */}
                        <div className="mb-2 flex items-start gap-2">
                          <h3 className="flex-1 text-lg font-semibold text-gray-900">
                            {task.title}
                          </h3>
                          <div className="flex flex-shrink-0 flex-wrap gap-2">
                            <span
                              className={`rounded px-2 py-1 text-xs font-medium ${getStatusColor(task.status)}`}
                            >
                              {t(`tasks:${task.status}`)}
                            </span>
                            <span
                              className={`rounded px-2 py-1 text-xs font-medium ${schedulingBadge.color}`}
                            >
                              {schedulingBadge.label}
                            </span>
                            <span
                              className={`rounded px-2 py-1 text-xs font-medium ${obligationBadge.color}`}
                            >
                              {obligationBadge.label}
                            </span>
                            {task.is_recurring && (
                              <span className="rounded bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-700">
                                <IconRepeat className="inline" size={12} />{" "}
                                {t("tasks:recurring")}
                              </span>
                            )}
                            {task.blocks_other_tasks && (
                              <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                                <IconLock className="inline" size={12} />{" "}
                                {t("tasks:blocks")}
                              </span>
                            )}
                            {isOverdue && (
                              <span className="rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
                                <IconAlertCircle className="inline" size={12} />{" "}
                                {t("tasks:overdue")}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Description */}
                        {task.description && (
                          <p className="mb-2 text-sm text-gray-600">
                            {task.description}
                          </p>
                        )}

                        {/* Meta info */}
                        <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                          {task.scheduled_date && (
                            <div className="flex items-center gap-1">
                              <IconCalendar size={16} />
                              <span>
                                {new Date(
                                  task.scheduled_date
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                          {task.ai_attributes?.estimated_duration_minutes && (
                            <div className="flex items-center gap-1">
                              <IconClock size={16} />
                              <span>
                                {task.ai_attributes.estimated_duration_minutes}{" "}
                                min
                              </span>
                            </div>
                          )}
                          {task.priority_boost !== 0 && (
                            <div className="flex items-center gap-1">
                              <IconAlertCircle size={16} />
                              <span>
                                Priority: {task.priority_boost > 0 ? "+" : ""}
                                {task.priority_boost}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Conflict Warnings */}
                        {conflicts &&
                          conflicts
                            .filter(
                              (c) =>
                                c.conflicting_item?.id === task._id ||
                                !c.conflicting_item
                            )
                            .map((conflict, idx) => (
                              <div
                                key={idx}
                                className={`mt-2 flex items-start gap-2 rounded p-2 text-sm ${
                                  conflict.severity === "error"
                                    ? "border border-red-200 bg-red-50 text-red-700"
                                    : conflict.severity === "warning"
                                      ? "border border-yellow-200 bg-yellow-50 text-yellow-700"
                                      : "border border-blue-200 bg-blue-50 text-blue-700"
                                }`}
                              >
                                <span>
                                  {conflict.severity === "error"
                                    ? "⚠️"
                                    : conflict.severity === "warning"
                                      ? "⚡"
                                      : "ℹ️"}
                                </span>
                                <span>{conflict.description}</span>
                              </div>
                            ))}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-shrink-0 items-center gap-2">
                        {task.status === TaskStatus.SCHEDULED && (
                          <button
                            onClick={() => handleStartTask(task._id)}
                            className="min-h-[44px] min-w-[44px] rounded-md p-2 text-green-600 transition-colors hover:bg-green-50"
                            title={t("tasks:start")}
                          >
                            <IconPlayerPlay size={18} />
                          </button>
                        )}
                        {task.status === TaskStatus.IN_PROGRESS && (
                          <>
                            <button
                              onClick={() => handlePauseTask(task._id)}
                              className="min-h-[44px] min-w-[44px] rounded-md p-2 text-yellow-600 transition-colors hover:bg-yellow-50"
                              title={t("tasks:pause")}
                            >
                              <IconPlayerPause size={18} />
                            </button>
                            <button
                              onClick={() => handleCompleteTask(task._id)}
                              className="min-h-[44px] min-w-[44px] rounded-md p-2 text-blue-600 transition-colors hover:bg-blue-50"
                              title={t("tasks:complete")}
                            >
                              <IconCheck size={18} />
                            </button>
                          </>
                        )}
                        {task.status === TaskStatus.PAUSED && (
                          <>
                            <button
                              onClick={() => handleResumeTask(task._id)}
                              className="min-h-[44px] min-w-[44px] rounded-md p-2 text-green-600 transition-colors hover:bg-green-50"
                              title={t("tasks:resume")}
                            >
                              <IconPlayerPlay size={18} />
                            </button>
                            <button
                              onClick={() => handleCompleteTask(task._id)}
                              className="min-h-[44px] min-w-[44px] rounded-md p-2 text-blue-600 transition-colors hover:bg-blue-50"
                              title={t("tasks:complete")}
                            >
                              <IconCheck size={18} />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => setEditingTask(task)}
                          className="min-h-[44px] min-w-[44px] rounded-md p-2 text-gray-600 transition-colors hover:bg-gray-50"
                          title={t("tasks:edit_task")}
                        >
                          <IconEdit size={18} />
                        </button>
                        <button
                          onClick={() => {
                            /* TODO: Copy modal */
                          }}
                          className="min-h-[44px] min-w-[44px] rounded-md p-2 text-gray-600 transition-colors hover:bg-gray-50"
                          title={t("tasks:copy")}
                        >
                          <IconCopy size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Result count */}
      {filteredTasks.length > 0 && (
        <div className="mt-4 text-center text-sm text-gray-600">
          {t("tasks:task_list.showing_count", { count: filteredTasks.length })}
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateModal && (
        <UnifiedTaskModal
          childId={childId || ""}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateTask}
        />
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <UnifiedTaskModal
          childId={childId || ""}
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSubmit={handleUpdateTask}
        />
      )}

      {/* School Calendar Modal */}
      <SchoolCalendarModal
        isOpen={showSchoolCalendar}
        onClose={() => setShowSchoolCalendar(false)}
        childId={childId || ""}
      />

      {/* Day Detail Modal */}
      <DayDetailModal
        isOpen={showDayDetail}
        onClose={() => setShowDayDetail(false)}
        date={selectedDate}
        tasks={selectedDateTasks}
        dayType={selectedDayType}
        onTaskClick={setEditingTask}
        editable={true}
      />
    </div>
  );
}
