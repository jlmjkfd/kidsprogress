/**
 * CalendarView - Calendar with task list below
 */
import { useTranslation } from "react-i18next";
import { Task } from "@/types/task";
import { TaskCalendar } from "@/components/calendar";
import { TaskCard } from "./TaskCard";

interface CalendarViewProps {
  tasks: Task[];
  childId: string;
  selectedDate: string;
  selectedDateTasks: Task[];
  onTaskClick: (task: Task) => void;
  onDayClick: (date: string, dayTasks: Task[]) => void;
  onTaskDelete?: (taskId: string) => void;
  onRestoreOccurrence?: (templateId: string, occurrenceDate: string) => void;
  onTaskComplete?: (task: Task) => void; // Parent complete with time modal
  onTaskUncomplete?: (taskId: string) => void;
  onTaskSkip?: (taskId: string) => void;
  onRestoreSkipped?: (taskId: string) => void;
  isTaskOverdue?: (task: Task) => boolean;
}

export function CalendarView({
  tasks,
  childId,
  selectedDate,
  selectedDateTasks,
  onTaskClick,
  onDayClick,
  onTaskDelete,
  onRestoreOccurrence,
  onTaskComplete,
  onTaskUncomplete,
  onTaskSkip,
  onRestoreSkipped,
  isTaskOverdue,
}: CalendarViewProps) {
  const { t } = useTranslation(["common", "tasks"]);

  return (
    <div className="space-y-6">
      <TaskCalendar
        tasks={tasks}
        childId={childId}
        onTaskClick={onTaskClick}
        onDayClick={onDayClick}
        editable={true}
      />

      {/* Task list for selected/today's date */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          {selectedDate
            ? `${t("tasks:tasks_for_date")}: ${new Date(selectedDate + "T00:00:00").toLocaleDateString()}`
            : `${t("tasks:tasks_for_today")}`
          }
        </h3>
        {selectedDateTasks.length === 0 ? (
          <p className="text-gray-600">{t("tasks:no_tasks_for_date")}</p>
        ) : (
          <div className="space-y-3">
            {selectedDateTasks.map((task) => (
              <TaskCard
                key={task._id}
                task={task}
                isOverdue={isTaskOverdue?.(task) ?? false}
                onComplete={onTaskComplete}
                onUncomplete={onTaskUncomplete}
                onSkip={onTaskSkip}
                onEdit={onTaskClick}
                onDelete={onTaskDelete}
                onRestore={onRestoreOccurrence}
                onRestoreSkipped={onRestoreSkipped}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
