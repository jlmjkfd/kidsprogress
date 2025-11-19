/**
 * Task List Page - Refactored version with componentization
 */
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { IconPlus, IconCalendar, IconList } from "@tabler/icons-react";
import { useTasksByChild } from "@/api/queries/useTasks";
import {
  useStartTask,
  usePauseTask,
  useCompleteTask,
  useCreateTask,
  useResumeTask,
  useUpdateTask,
  useDeleteTask,
  useRemoveRecurrenceException,
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
import { TaskFilters } from "./components/TaskFilters";
import { TaskListView } from "./components/TaskListView";
import { CalendarView } from "./components/CalendarView";
import { SchoolCalendarModal } from "@/components/SchoolCalendarModal";
import { EditOccurrenceModal } from "@/components/EditOccurrenceModal";
import { DeleteOccurrenceModal } from "@/components/DeleteOccurrenceModal";
import { EditRecurringTemplateDialog } from "@/components/EditRecurringTemplateDialog";
import { useScheduleConflicts } from "@/api/queries/useAISchedule";
import { useReplanSchedule } from "@/api/mutations/useAIScheduleMutations";

type ViewMode = "list" | "calendar";

export default function ChildTasksPage() {
  const { childId } = useParams<{ childId: string }>();
  const { t } = useTranslation(["common", "tasks"]);

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  // Filter state
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [schedulingTypeFilter, setSchedulingTypeFilter] = useState<
    SchedulingType | "all"
  >("all");
  const [obligationFilter, setObligationFilter] = useState<
    ObligationLevel | "all"
  >("all");

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingOccurrence, setEditingOccurrence] = useState<Task | null>(null);
  const [deletingOccurrence, setDeletingOccurrence] = useState<Task | null>(null);
  const [showSchoolCalendar, setShowSchoolCalendar] = useState(false);
  const [showRecurringDialog, setShowRecurringDialog] = useState(false);
  const [pendingEditTask, setPendingEditTask] = useState<Task | null>(null);

  // Calendar state
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedDateTasks, setSelectedDateTasks] = useState<Task[]>([]);

  // Data fetching
  const { data: tasks, isLoading } = useTasksByChild(childId || "");

  // Mutations
  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();
  const startTaskMutation = useStartTask();
  const pauseTaskMutation = usePauseTask();
  const resumeTaskMutation = useResumeTask();
  const completeTaskMutation = useCompleteTask();
  const replanMutation = useReplanSchedule();
  const removeExceptionMutation = useRemoveRecurrenceException();

  const parentId = tasks && tasks.length > 0 ? tasks[0].parent_id : "";

  // Initialize calendar with today's tasks (use local timezone)
  useEffect(() => {
    if (viewMode === "calendar" && tasks && !selectedDate) {
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const todayTasks = tasks.filter((task) => {
        // Filter out recurring templates (only show virtual instances)
        if (task.is_recurring && !task.is_virtual) return false;
        const taskDate = task.scheduled_date?.split("T")[0];
        return taskDate === today;
      });
      setSelectedDate(today);
      setSelectedDateTasks(todayTasks);
    }
  }, [viewMode, tasks, selectedDate]);

  // Update selectedDateTasks when tasks data changes (after delete/add/update)
  useEffect(() => {
    if (selectedDate && tasks) {
      const dateTasks = tasks.filter((task) => {
        // Filter out recurring templates (only show virtual instances)
        if (task.is_recurring && !task.is_virtual) return false;
        const taskDate = task.scheduled_date?.split("T")[0];
        return taskDate === selectedDate;
      });
      setSelectedDateTasks(dateTasks);
    }
  }, [tasks, selectedDate]);

  // Task action handlers
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
      );
      const estimatedDuration =
        task?.ai_attributes?.estimated_duration_minutes || 30;

      await completeTaskMutation.mutateAsync({
        taskId,
        childId: childId || "",
      });

      if (actualDuration > estimatedDuration + 10) {
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

  const handleDeleteTask = async (taskId: string) => {
    const task = tasks?.find((t) => t._id === taskId);

    // If it's a virtual instance of a recurring task, open DeleteOccurrenceModal
    if (task && task.is_virtual && task.source_recurring_task_id) {
      setDeletingOccurrence(task);
      return;
    }

    // Otherwise, confirm and delete directly
    if (!window.confirm(t("tasks:confirm_delete"))) {
      return;
    }
    try {
      await deleteTaskMutation.mutateAsync(taskId);
    } catch (error) {
      console.error("Failed to delete task:", error);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!window.confirm(t("tasks:confirm_delete"))) {
      return;
    }
    try {
      await deleteTaskMutation.mutateAsync(templateId);
    } catch (error) {
      console.error("Failed to delete template:", error);
    }
  };

  const handleRestoreOccurrence = async (templateId: string, occurrenceDate: string) => {
    try {
      await removeExceptionMutation.mutateAsync({
        taskId: templateId,
        exceptionDate: occurrenceDate,
      });
    } catch (error) {
      console.error("Failed to restore occurrence:", error);
    }
  };

  const handleTaskEdit = (task: Task) => {
    // Check if this is a virtual instance (recurring task occurrence)
    if (task.is_virtual && task.scheduled_date) {
      setEditingOccurrence(task);
    } else if (task.is_recurring && !task.is_virtual) {
      // This is a recurring template - show dialog to choose edit option
      setPendingEditTask(task);
      setShowRecurringDialog(true);
    } else {
      // Regular one-time task
      setEditingTask(task);
    }
  };

  const handleEditTemplate = async (templateId: string) => {
    // Close the occurrence modal first
    setEditingOccurrence(null);

    // Find the template in the tasks list
    const template = tasks?.find((t) => t._id === templateId && t.is_recurring && !t.is_virtual);
    if (template) {
      setEditingTask(template);
    }
  };

  const handleDayClick = (date: string, dayTasks: Task[]) => {
    // Filter out recurring templates (only show virtual instances)
    const filteredTasks = dayTasks.filter(task => !(task.is_recurring && !task.is_virtual));
    setSelectedDate(date);
    setSelectedDateTasks(filteredTasks);
  };

  const isTaskOverdue = (task: Task): boolean => {
    // Informational tasks can't be overdue
    if (task.is_informational) {
      return false;
    }

    const today = new Date().toISOString().split("T")[0];
    const taskDate = task.scheduled_date?.split("T")[0];
    return !!(
      taskDate &&
      taskDate < today &&
      task.status !== TaskStatus.COMPLETED &&
      task.status !== TaskStatus.CANCELLED
    );
  };

  // Apply filters to tasks
  const filteredTasks =
    tasks?.filter((task) => {
      // Hide recurring templates from the list (only show virtual instances)
      // But keep templates in the tasks array so handleEditTemplate can find them
      if (task.is_recurring && !task.is_virtual) return false;

      if (statusFilter !== "all" && task.status !== statusFilter) return false;
      if (
        schedulingTypeFilter !== "all" &&
        task.scheduling_type !== schedulingTypeFilter
      )
        return false;
      if (
        obligationFilter !== "all" &&
        task.obligation_level !== obligationFilter
      )
        return false;
      return true;
    }) || [];

  if (isLoading) {
    return <div className="p-8 text-center">{t("common:loading")}</div>;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t("tasks:title")}</h1>
        <div className="flex gap-3">
          <button
            onClick={() => setShowSchoolCalendar(true)}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {t("tasks:school_calendar_button")}
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <IconPlus size={18} />
            {t("tasks:create_task")}
          </button>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setViewMode("list")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${
            viewMode === "list"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-700 hover:bg-gray-50"
          }`}
        >
          <IconList size={18} />
          {t("tasks:list_view")}
        </button>
        <button
          onClick={() => setViewMode("calendar")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${
            viewMode === "calendar"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-700 hover:bg-gray-50"
          }`}
        >
          <IconCalendar size={18} />
          {t("tasks:calendar_view")}
        </button>
      </div>

      {/* Filters */}
      <TaskFilters
        statusFilter={statusFilter}
        schedulingTypeFilter={schedulingTypeFilter}
        obligationFilter={obligationFilter}
        onStatusFilterChange={setStatusFilter}
        onSchedulingTypeFilterChange={setSchedulingTypeFilter}
        onObligationFilterChange={setObligationFilter}
      />

      {/* Main Content */}
      {viewMode === "calendar" ? (
        <CalendarView
          tasks={filteredTasks}
          childId={childId || ""}
          selectedDate={selectedDate}
          selectedDateTasks={selectedDateTasks}
          onTaskClick={handleTaskEdit}
          onDayClick={handleDayClick}
          onTaskDelete={handleDeleteTask}
          onRestoreOccurrence={handleRestoreOccurrence}
        />
      ) : (
        <TaskListView
          tasks={filteredTasks}
          childId={childId || ""}
          onTaskEdit={handleTaskEdit}
          onTaskDelete={handleDeleteTask}
          onTaskStart={handleStartTask}
          onTaskPause={handlePauseTask}
          onTaskResume={handleResumeTask}
          onTaskComplete={handleCompleteTask}
          onCreateClick={() => setShowCreateModal(true)}
          isTaskOverdue={isTaskOverdue}
          onRestoreOccurrence={handleRestoreOccurrence}
        />
      )}

      {/* Modals */}
      {showCreateModal && (
        <UnifiedTaskModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateTask}
          childId={childId || ""}
        />
      )}

      {editingTask && (
        <UnifiedTaskModal
          onClose={() => setEditingTask(null)}
          onSubmit={handleUpdateTask}
          task={editingTask}
          childId={childId || ""}
        />
      )}

      {editingOccurrence && (
        <EditOccurrenceModal
          isOpen={true}
          onClose={() => setEditingOccurrence(null)}
          task={editingOccurrence}
          onEditTemplate={handleEditTemplate}
        />
      )}

      {deletingOccurrence && (
        <DeleteOccurrenceModal
          isOpen={true}
          onClose={() => setDeletingOccurrence(null)}
          task={deletingOccurrence}
          onDeleteTemplate={handleDeleteTemplate}
        />
      )}

      <SchoolCalendarModal
        isOpen={showSchoolCalendar}
        onClose={() => setShowSchoolCalendar(false)}
        childId={childId || ""}
      />

      {/* Edit Recurring Template Dialog */}
      {showRecurringDialog && pendingEditTask && (
        <EditRecurringTemplateDialog
          isOpen={true}
          onClose={() => {
            setShowRecurringDialog(false);
            setPendingEditTask(null);
          }}
          onEditTemplate={() => {
            // Open unified task modal with the template
            setEditingTask(pendingEditTask);
            setPendingEditTask(null);
          }}
          onEditOccurrence={() => {
            // This shouldn't happen for templates, but handle gracefully
            setEditingTask(pendingEditTask);
            setPendingEditTask(null);
          }}
          taskTitle={pendingEditTask.title}
        />
      )}
    </div>
  );
}
