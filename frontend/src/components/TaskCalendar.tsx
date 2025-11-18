/**
 * TaskCalendar - Calendar view for tasks
 * Shows tasks organized by date in a monthly calendar grid with day type colors
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  IconChevronLeft,
  IconChevronRight,
  IconCircle,
  IconCheck,
} from "@tabler/icons-react";
import { Task, TaskStatus, ObligationLevel } from "@/types/task";
import { useDayTypesBatch } from "@/api/queries/useSchoolCalendar";
import { DayType } from "@/types/schoolCalendar";

interface TaskCalendarProps {
  tasks: Task[];
  childId: string; // Required for fetching day types
  onTaskClick?: (task: Task) => void;
  editable?: boolean; // If false, tasks are read-only
}

export function TaskCalendar({
  tasks,
  childId,
  onTaskClick,
  editable = true,
}: TaskCalendarProps) {
  const { t } = useTranslation(["tasks", "common"]);
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Get date range for current month (using local dates to avoid timezone issues)
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;

  // Fetch day types for the month
  const { data: dayTypes } = useDayTypesBatch(childId, startDate, endDate);

  // Get number of days and start day of week
  const daysInMonth = lastDay.getDate();
  const startDayOfWeek = firstDay.getDay(); // 0 = Sunday

  // Create day type map for quick lookup
  const dayTypeMap = new Map<string, DayType>();
  dayTypes?.forEach((dt) => {
    dayTypeMap.set(dt.date, dt.day_type);
  });

  // Navigate months
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Get tasks for a specific date
  const getTasksForDate = (day: number): Task[] => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return tasks.filter((task) => {
      const taskDate = task.scheduled_date?.split("T")[0];
      return taskDate === dateStr;
    });
  };

  // Generate calendar grid
  const calendarDays: (number | null)[] = [];
  // Add empty cells for days before month starts
  for (let i = 0; i < startDayOfWeek; i++) {
    calendarDays.push(null);
  }
  // Add days of month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  const monthName = new Date(year, month).toLocaleDateString("en-US", {
    month: "long",
  });
  const today = new Date();
  const isToday = (day: number) => {
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  };

  const getStatusBadgeColor = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.COMPLETED:
        return "bg-green-500";
      case TaskStatus.IN_PROGRESS:
        return "bg-blue-500";
      case TaskStatus.PAUSED:
        return "bg-yellow-500";
      case TaskStatus.CANCELLED:
        return "bg-gray-400";
      default:
        return "bg-gray-300";
    }
  };

  const getObligationColor = (level: ObligationLevel) => {
    switch (level) {
      case ObligationLevel.MUST_DO:
        return "border-l-red-500";
      case ObligationLevel.SHOULD_DO:
        return "border-l-orange-500";
      default:
        return "border-l-gray-300";
    }
  };

  const getDayTypeBgColor = (
    dayType: DayType | undefined,
    isToday: boolean
  ) => {
    if (isToday) return "bg-blue-100 border-blue-500";

    switch (dayType) {
      case "school_day":
        return "bg-blue-50 border-blue-200";
      case "holiday":
        return "bg-green-50 border-green-200";
      case "special_school_day":
        return "bg-purple-50 border-purple-200";
      case "weekend":
      default:
        return "bg-white border-gray-200";
    }
  };

  return (
    <div className="rounded-lg bg-white shadow">
      {/* Calendar Header */}
      <div className="flex items-center justify-between border-b p-4">
        <h2 className="text-lg font-bold text-gray-900">
          {monthName} {year}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm transition-colors hover:bg-gray-50"
          >
            {t("common:today")}
          </button>
          <button
            onClick={goToPreviousMonth}
            className="rounded-lg p-2 transition-colors hover:bg-gray-100"
            aria-label="Previous month"
          >
            <IconChevronLeft size={20} />
          </button>
          <button
            onClick={goToNextMonth}
            className="rounded-lg p-2 transition-colors hover:bg-gray-100"
            aria-label="Next month"
          >
            <IconChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-2 sm:p-4">
        {/* Day headers */}
        <div className="mb-2 grid grid-cols-7 gap-1">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="py-2 text-center text-xs font-semibold text-gray-600"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} className="aspect-square" />;
            }

            const dayTasks = getTasksForDate(day);
            const isTodayDate = isToday(day);
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayType = dayTypeMap.get(dateStr);

            return (
              <div
                key={day}
                className={`aspect-square overflow-hidden rounded-lg border p-1 sm:p-2 ${getDayTypeBgColor(
                  dayType,
                  isTodayDate
                )} transition-colors hover:border-gray-400`}
              >
                {/* Day number */}
                <div
                  className={`mb-1 text-xs font-semibold sm:text-sm ${
                    isTodayDate ? "text-blue-700" : "text-gray-700"
                  }`}
                >
                  {day}
                </div>

                {/* Tasks */}
                <div className="space-y-0.5">
                  {dayTasks.slice(0, 3).map((task) => (
                    <button
                      key={task._id}
                      onClick={() => editable && onTaskClick?.(task)}
                      disabled={!editable}
                      className={`w-full truncate rounded border-l-2 px-1 py-0.5 text-left text-xs ${getObligationColor(
                        task.obligation_level
                      )} ${
                        task.status === TaskStatus.COMPLETED
                          ? "bg-green-50 text-green-700 line-through"
                          : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                      } ${!editable ? "cursor-default" : "cursor-pointer"} transition-colors`}
                      title={task.title}
                    >
                      <div className="flex items-center gap-1">
                        {task.status === TaskStatus.COMPLETED ? (
                          <IconCheck size={10} />
                        ) : (
                          <IconCircle
                            size={8}
                            className={getStatusBadgeColor(task.status)}
                          />
                        )}
                        <span className="truncate">{task.title}</span>
                      </div>
                    </button>
                  ))}
                  {dayTasks.length > 3 && (
                    <div className="px-1 text-xs text-gray-500">
                      +{dayTasks.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="space-y-3 border-t p-4">
        <div className="text-xs font-semibold text-gray-700">
          {t("tasks:unified_model.task_types")}:
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 border-l-4 border-l-red-500 bg-gray-50"></div>
            <span>{t("tasks:unified_model.must_do")}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 border-l-4 border-l-orange-500 bg-gray-50"></div>
            <span>{t("tasks:unified_model.should_do")}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 border-l-4 border-l-gray-300 bg-gray-50"></div>
            <span>{t("tasks:unified_model.optional")}</span>
          </div>
          <div className="flex items-center gap-2">
            <IconCheck size={12} className="text-green-700" />
            <span>{t("tasks:completed")}</span>
          </div>
        </div>

        <div className="text-xs font-semibold text-gray-700">
          {t("tasks:school_calendar.day_types")}:
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded border border-blue-200 bg-blue-50"></div>
            <span>{t("tasks:school_calendar.school_day")}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded border border-gray-200 bg-white"></div>
            <span>{t("tasks:school_calendar.weekend")}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded border border-green-200 bg-green-50"></div>
            <span>{t("tasks:school_calendar.holiday")}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded border border-purple-200 bg-purple-50"></div>
            <span>{t("tasks:school_calendar.special_school_day")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
