/**
 * TaskCalendar - Multi-view calendar for tasks
 * Supports Month, Week, and Day views with task scheduling
 */
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronUp,
  IconChevronDown,
  IconCheck,
  IconCalendar,
  IconCalendarWeek,
  IconCalendarEvent,
} from "@tabler/icons-react";
import { Task } from "@/types/task";
import { useDayTypesBatch } from "@/api/queries/useSchoolCalendar";
import { DayType } from "@/types/schoolCalendar";
import { DayView } from "./DayView";
import { WeekView } from "./WeekView";

type CalendarView = "month" | "week" | "day";

interface TaskCalendarProps {
  tasks: Task[];
  childId: string; // Required for fetching day types
  onTaskClick?: (task: Task) => void;
  onDayClick?: (date: string, tasks: Task[], dayType?: DayType) => void; // Callback when day is clicked
  editable?: boolean; // If false, tasks are read-only
  defaultView?: CalendarView;
  defaultSelectedDate?: string; // Default selected date (YYYY-MM-DD format)
}

export function TaskCalendar({
  tasks,
  childId,
  onTaskClick,
  onDayClick,
  defaultView = "month",
  defaultSelectedDate,
}: TaskCalendarProps) {
  const { t, i18n } = useTranslation(["tasks", "common"]);
  const currentLocale = i18n.language || "en";

  // Initialize currentDate based on defaultSelectedDate if provided
  const getInitialDate = () => {
    if (defaultSelectedDate) {
      const [year, month, day] = defaultSelectedDate.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    return new Date();
  };

  const [currentDate, setCurrentDate] = useState(getInitialDate());
  const [view, setView] = useState<CalendarView>(defaultView);

  // Selected date state (shared across all views)
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const [selectedDate, setSelectedDate] = useState<string>(defaultSelectedDate || todayStr);

  // Month view collapse state
  const [monthCollapsed, setMonthCollapsed] = useState(false);

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

  // Initialize selected date data on mount
  useEffect(() => {
    if (onDayClick && tasks && dayTypes) {
      const tasksForDate = tasks.filter(task => {
        if (!task.scheduled_date) return false;
        return task.scheduled_date.startsWith(selectedDate);
      });
      const dayType = dayTypeMap.get(selectedDate);
      onDayClick(selectedDate, tasksForDate, dayType);
    }
    // Only run when tasks and dayTypes are loaded
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks?.length, dayTypes?.length]);

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    setSelectedDate(todayStr);

    // Trigger onDayClick to update the task list
    if (onDayClick) {
      const todayTasks = tasks.filter(task => {
        if (!task.scheduled_date) return false;
        return task.scheduled_date.startsWith(todayStr);
      });
      const dayType = dayTypeMap.get(todayStr);
      onDayClick(todayStr, todayTasks, dayType);
    }
  };


  // Generate calendar grid with full 6 weeks (42 days)
  interface CalendarDay {
    day: number;
    month: 'prev' | 'current' | 'next';
  }

  const calendarDays: CalendarDay[] = [];

  // Fill previous month days
  const daysInPrevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    calendarDays.push({ day: daysInPrevMonth - i, month: 'prev' });
  }

  // Fill current month days
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push({ day, month: 'current' });
  }

  // Fill next month days only if needed to complete current week (no row with only next month days)
  const totalDays = startDayOfWeek + daysInMonth;
  const weeksNeeded = Math.ceil(totalDays / 7);
  const targetDays = weeksNeeded * 7;
  const remainingDays = targetDays - calendarDays.length;
  for (let day = 1; day <= remainingDays; day++) {
    calendarDays.push({ day, month: 'next' });
  }

  const monthName = new Date(year, month).toLocaleDateString(currentLocale, {
    month: "long",
  });
  const isToday = (day: number) => {
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  };

  // Helper to get overdue level for a date
  // Returns: 'must-do' | 'other' | null
  const getOverdueLevel = (dateStr: string): 'must-do' | 'other' | null => {
    const taskDate = new Date(dateStr + 'T00:00:00');
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    if (taskDate >= todayDate) return null; // Not overdue if today or future

    let hasMustDo = false;
    let hasOther = false;

    tasks.forEach(task => {
      if (!task.scheduled_date) return;
      if (!task.scheduled_date.startsWith(dateStr)) return;

      // Skip informational tasks (they can't be overdue)
      if (task.is_informational) return;

      // Skip completed/skipped/archived tasks
      if (task.status === 'completed' || task.status === 'skipped' || task.status === 'archived') return;

      if (task.obligation_level === 'must_do') {
        hasMustDo = true;
      } else if (task.obligation_level === 'should_do' || task.obligation_level === 'optional') {
        hasOther = true;
      }
    });

    if (hasMustDo) return 'must-do';
    if (hasOther) return 'other';
    return null;
  };

  // Dimension 1: Day Type - Controls background color
  const getDayTypeBgColor = (
    dayType: DayType | undefined,
    isToday: boolean
  ) => {
    if (isToday) return "bg-blue-100";

    switch (dayType) {
      case "school_day":
        return "bg-blue-50";
      case "holiday":
        return "bg-green-50";
      case "special_school_day":
        return "bg-purple-50";
      case "weekend":
      default:
        return "bg-white";
    }
  };

  // Dimension 2: Overdue Status - Controls border style
  const getOverdueBorderClass = (overdueLevel: 'must-do' | 'other' | null) => {
    if (overdueLevel === 'must-do') {
      return "border-2 border-red-500"; // Thick red border for urgent
    }
    if (overdueLevel === 'other') {
      return "border-2 border-orange-400"; // Thick orange border for medium priority
    }
    return "border border-gray-200"; // Thin gray border for normal
  };

  // Helper functions for different views
  const goToPrevious = () => {
    if (view === "month") {
      const newDate = new Date(year, month - 1, 1);
      setCurrentDate(newDate);
      // Select first day of the new month
      const newDateStr = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}-01`;
      setSelectedDate(newDateStr);
    } else if (view === "week") {
      handlePrevWeek();
    } else {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() - 1);
      setCurrentDate(newDate);
    }
  };

  const goToNext = () => {
    if (view === "month") {
      const newDate = new Date(year, month + 1, 1);
      setCurrentDate(newDate);
      // Select first day of the new month
      const newDateStr = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}-01`;
      setSelectedDate(newDateStr);
    } else if (view === "week") {
      handleNextWeek();
    } else {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() + 1);
      setCurrentDate(newDate);
    }
  };

  // Week navigation handlers (maintain day-of-week selection)
  const handlePrevWeek = () => {
    const [y, m, d] = selectedDate.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() - 7);
    const newDateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    setSelectedDate(newDateStr);
    setCurrentDate(date);

    // Trigger onDayClick to update the task list
    if (onDayClick) {
      const dateTasks = tasks.filter(task => {
        if (!task.scheduled_date) return false;
        return task.scheduled_date.startsWith(newDateStr);
      });
      const dayType = dayTypeMap.get(newDateStr);
      onDayClick(newDateStr, dateTasks, dayType);
    }
  };

  const handleNextWeek = () => {
    const [y, m, d] = selectedDate.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + 7);
    const newDateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    setSelectedDate(newDateStr);
    setCurrentDate(date);

    // Trigger onDayClick to update the task list
    if (onDayClick) {
      const dateTasks = tasks.filter(task => {
        if (!task.scheduled_date) return false;
        return task.scheduled_date.startsWith(newDateStr);
      });
      const dayType = dayTypeMap.get(newDateStr);
      onDayClick(newDateStr, dateTasks, dayType);
    }
  };

  const handleDateSelect = (date: string) => {
    const [y, m, d] = date.split("-").map(Number);
    setSelectedDate(date);
    setCurrentDate(new Date(y, m - 1, d));

    // Trigger onDayClick to update the task list
    if (onDayClick) {
      const dateTasks = tasks.filter(task => {
        if (!task.scheduled_date) return false;
        return task.scheduled_date.startsWith(date);
      });
      const dayType = dayTypeMap.get(date);
      onDayClick(date, dateTasks, dayType);
    }
  };

  // Get week start date (Sunday) based on selectedDate, not currentDate
  const getWeekStartDate = (): string => {
    // Parse selectedDate
    const [y, m, d] = selectedDate.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    const day = date.getDay();
    const diff = date.getDate() - day; // Adjust to Sunday
    date.setDate(diff);

    // Format as YYYY-MM-DD using local date components
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const dayOfMonth = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${dayOfMonth}`;
  };

  // Get current day string for day view
  const getCurrentDayString = (): string => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
  };

  // Handle day cell click
  const handleDayClick = (date: string, dayTasks: Task[], dayType?: DayType) => {
    // Update currentDate to the selected day so week/day views show this date
    const [yearStr, monthStr, dayStr] = date.split("-").map(Number);
    setCurrentDate(new Date(yearStr, monthStr - 1, dayStr));

    // Update selected date
    setSelectedDate(date);

    // Pass to parent handler
    onDayClick?.(date, dayTasks, dayType);
  };

  return (
    <div className="rounded-lg bg-white shadow">
      {/* Calendar Header */}
      <div className="border-b p-4">
        {/* Row 1: Month/Year Title */}
        <div className="mb-3">
          <h2 className="text-lg font-bold text-gray-900">
            {monthName} {year}
          </h2>
        </div>

        {/* Row 2: View Switcher (left) and Today Button (right) */}
        <div className="flex items-center justify-between">
          <div className="flex rounded-lg border bg-gray-50 p-1">
            <button
              onClick={() => setView("month")}
              className={`rounded px-2 md:px-3 py-1.5 text-xs font-medium transition-colors min-w-[40px] md:min-w-0 ${
                view === "month"
                  ? "bg-white text-blue-600 shadow"
                  : "text-gray-600 hover:text-gray-900"
              }`}
              title={t("tasks:view_month")}
            >
              <div className="flex items-center justify-center gap-1">
                <IconCalendar size={16} />
                <span className="hidden md:inline">{t("tasks:view_month")}</span>
              </div>
            </button>
            <button
              onClick={() => setView("week")}
              className={`rounded px-2 md:px-3 py-1.5 text-xs font-medium transition-colors min-w-[40px] md:min-w-0 ${
                view === "week"
                  ? "bg-white text-blue-600 shadow"
                  : "text-gray-600 hover:text-gray-900"
              }`}
              title={t("tasks:view_week")}
            >
              <div className="flex items-center justify-center gap-1">
                <IconCalendarWeek size={16} />
                <span className="hidden md:inline">{t("tasks:view_week")}</span>
              </div>
            </button>
            <button
              onClick={() => setView("day")}
              className={`rounded px-2 md:px-3 py-1.5 text-xs font-medium transition-colors min-w-[40px] md:min-w-0 ${
                view === "day"
                  ? "bg-white text-blue-600 shadow"
                  : "text-gray-600 hover:text-gray-900"
              }`}
              title={t("tasks:view_day")}
            >
              <div className="flex items-center justify-center gap-1">
                <IconCalendarEvent size={16} />
                <span className="hidden md:inline">{t("tasks:view_day")}</span>
              </div>
            </button>
          </div>

          <button
            onClick={goToToday}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm transition-colors hover:bg-gray-50"
          >
            {t("common:today")}
          </button>
        </div>
      </div>

      {/* View Content */}
      <div className="p-2 sm:p-4">
        {view === "month" && (
          <>
            {/* Day headers with navigation buttons */}
            <div className="mb-1 relative">
              {/* Previous Month Button - Left */}
              <button
                onClick={goToPrevious}
                className="absolute left-0 top-1/2 -translate-y-1/2 rounded-lg p-1.5 transition-colors hover:bg-gray-100 z-20"
                aria-label={`Previous ${view}`}
              >
                <IconChevronLeft size={20} />
              </button>

              <div className="grid grid-cols-7 gap-1 px-8">
                {Array.from({ length: 7 }, (_, i) => {
                  const date = new Date(2024, 0, i); // Jan 2024 starts on Monday, so day 0 is Sunday
                  const dayName = date.toLocaleDateString(currentLocale, { weekday: "short" });
                  return (
                    <div
                      key={i}
                      className="py-2 text-center text-xs font-semibold text-gray-600"
                    >
                      {dayName}
                    </div>
                  );
                })}
              </div>

              {/* Next Month Button - Right */}
              <button
                onClick={goToNext}
                className="absolute right-0 top-1/2 -translate-y-1/2 rounded-lg p-1.5 transition-colors hover:bg-gray-100 z-20"
                aria-label={`Next ${view}`}
              >
                <IconChevronRight size={20} />
              </button>
            </div>

            {/* Calendar days - Wrapper with collapse button */}
            <div className="relative px-8">
              {/* Collapse/expand button - Right side aligned with first row */}
              <button
                onClick={() => setMonthCollapsed(!monthCollapsed)}
                className="absolute top-3 -right-2 rounded-lg p-1.5 transition-colors hover:bg-gray-100 bg-white shadow-sm z-10"
                title={monthCollapsed ? t("common:expand") : t("common:collapse")}
              >
                {monthCollapsed ? <IconChevronDown size={18} /> : <IconChevronUp size={18} />}
              </button>

              <div className="grid grid-cols-7 gap-1">
              {calendarDays
                .slice(0, monthCollapsed ? 7 : calendarDays.length)
                .map((calDay, index) => {
                const { day, month: monthType } = calDay;

                // Calculate actual year/month for this day
                let actualYear = year;
                let actualMonth = month;
                if (monthType === 'prev') {
                  actualMonth = month - 1;
                  if (actualMonth < 0) {
                    actualMonth = 11;
                    actualYear = year - 1;
                  }
                } else if (monthType === 'next') {
                  actualMonth = month + 1;
                  if (actualMonth > 11) {
                    actualMonth = 0;
                    actualYear = year + 1;
                  }
                }

                const dateStr = `${actualYear}-${String(actualMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

                // Get tasks for this date (including prev/next month)
                const dayTasks = tasks.filter(task => {
                  if (!task.scheduled_date) return false;
                  return task.scheduled_date.startsWith(dateStr);
                });

                // Filter non-informational tasks for indicator
                const nonInfoTasks = dayTasks.filter(t => !t.is_informational && !t.is_deleted);
                const hasNonInfoTasks = nonInfoTasks.length > 0;

                const isTodayDate = monthType === 'current' && isToday(day);
                const dayType = dayTypeMap.get(dateStr);
                const isOtherMonth = monthType !== 'current';
                const isSelected = dateStr === selectedDate;
                const overdueLevel = monthType === 'current' ? getOverdueLevel(dateStr) : null;

                return (
                  <div
                    key={`${monthType}-${day}-${index}`}
                    onClick={() => {
                      // If clicking on adjacent month day, switch to that month and select that day
                      if (monthType === 'prev' || monthType === 'next') {
                        const newDate = new Date(actualYear, actualMonth, day);
                        setCurrentDate(newDate);
                      }
                      handleDayClick(dateStr, dayTasks, dayType);
                    }}
                    className={`flex flex-col items-center justify-center rounded-md p-1 min-h-[48px] sm:min-h-[56px] ${
                      isSelected
                        ? 'border-blue-500 border-2 ring-1 ring-blue-200 ' + getDayTypeBgColor(dayType, isTodayDate)
                        : isOtherMonth
                          ? 'bg-gray-50 border border-gray-200'
                          : getDayTypeBgColor(dayType, isTodayDate) + ' ' + getOverdueBorderClass(overdueLevel)
                    } transition-colors hover:border-gray-400 cursor-pointer ${
                      hasNonInfoTasks && !isOtherMonth ? 'font-semibold' : ''
                    }`}
                  >
                    {/* Day number */}
                    <div
                      className={`text-sm font-semibold ${
                        isOtherMonth
                          ? 'text-gray-400'
                          : isTodayDate
                            ? 'text-blue-700'
                            : 'text-gray-700'
                      }`}
                    >
                      {day}
                    </div>

                    {/* Task indicator dot - matches overdue border color */}
                    {hasNonInfoTasks && (
                      <div className="mt-0.5">
                        <div className={`h-1.5 w-1.5 rounded-full ${
                          isOtherMonth
                            ? 'bg-gray-400'
                            : overdueLevel === 'must-do'
                              ? 'bg-red-500'
                              : overdueLevel === 'other'
                                ? 'bg-orange-400'
                                : 'bg-blue-500'
                        }`} />
                      </div>
                    )}
                  </div>
                );
              })}
              </div>
            </div>
          </>
        )}

        {view === "week" && (
          <WeekView
            key={`week-${getWeekStartDate()}`}
            startDate={getWeekStartDate()}
            tasks={tasks.filter(t => {
              // Filter out deleted tasks
              if (t.is_deleted) return false;
              // Filter out recurring templates (only show virtual instances)
              if (t.is_recurring && !t.is_virtual) return false;
              return true;
            })}
            dayTypes={dayTypeMap}
            onTaskClick={onTaskClick}
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
            onPrevWeek={handlePrevWeek}
            onNextWeek={handleNextWeek}
          />
        )}

        {view === "day" && (
          <DayView
            date={getCurrentDayString()}
            tasks={tasks.filter(t => {
              if (!t.scheduled_date?.startsWith(getCurrentDayString())) return false;
              // Filter out deleted tasks
              if (t.is_deleted) return false;
              // Filter out recurring templates (only show virtual instances)
              if (t.is_recurring && !t.is_virtual) return false;
              return true;
            })}
            dayType={dayTypeMap.get(getCurrentDayString())}
            onTaskClick={onTaskClick}
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
            onPrevWeek={handlePrevWeek}
            onNextWeek={handleNextWeek}
          />
        )}
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
