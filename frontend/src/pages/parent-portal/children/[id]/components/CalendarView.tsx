/**
 * CalendarView - Calendar with task list below
 */
import { useTranslation } from "react-i18next";
import { IconEdit, IconRepeat, IconTrash, IconRestore } from "@tabler/icons-react";
import { Task } from "@/types/task";
import { TaskCalendar } from "@/components/calendar";

interface CalendarViewProps {
  tasks: Task[];
  childId: string;
  selectedDate: string;
  selectedDateTasks: Task[];
  onTaskClick: (task: Task) => void;
  onDayClick: (date: string, dayTasks: Task[]) => void;
  onTaskDelete?: (taskId: string) => void;
  onRestoreOccurrence?: (templateId: string, occurrenceDate: string) => void;
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
            {selectedDateTasks.map((task) => {
              // Handle deleted tasks
              if (task.is_deleted && task.source_recurring_task_id && task.scheduled_date) {
                const occurrenceDate = task.scheduled_date.split("T")[0];
                return (
                  <div
                    key={task._id}
                    className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4 opacity-60"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-500 line-through">{task.title}</h4>
                        <span className="rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-600">
                          {t("tasks:deleted")}
                        </span>
                      </div>
                      {task.fixed_time_slot && (
                        <p className="text-sm text-gray-500">
                          {task.fixed_time_slot.start} - {task.fixed_time_slot.end}
                        </p>
                      )}
                    </div>
                    {onRestoreOccurrence && (
                      <button
                        onClick={() => onRestoreOccurrence(task.source_recurring_task_id!, occurrenceDate)}
                        className="flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm text-white transition-colors hover:bg-blue-700"
                        title={t("tasks:restore_occurrence")}
                      >
                        <IconRestore size={16} />
                        <span>{t("common:restore")}</span>
                      </button>
                    )}
                  </div>
                );
              }

              // Normal task
              return (
                <div
                  key={task._id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 p-4 hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900">{task.title}</h4>
                      {task.is_informational && (
                        <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                          {t("tasks:informational")}
                        </span>
                      )}
                      {task.is_recurring && (
                        <IconRepeat size={16} className="text-gray-500" />
                      )}
                    </div>
                    {task.fixed_time_slot && (
                      <p className="text-sm text-gray-600">
                        {task.fixed_time_slot.start} - {task.fixed_time_slot.end}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onTaskClick(task)}
                      className="rounded-md p-2 text-gray-600 hover:bg-gray-100"
                      title={t("common:edit")}
                    >
                      <IconEdit size={18} />
                    </button>
                    {onTaskDelete && (
                      <button
                        onClick={() => onTaskDelete(task._id)}
                        className="rounded-md p-2 text-red-600 hover:bg-red-50"
                        title={t("common:delete")}
                      >
                        <IconTrash size={18} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
