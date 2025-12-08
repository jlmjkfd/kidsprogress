/**
 * TaskCalendar - Multi-view calendar for tasks
 * Supports Month, Week, and Day views with task scheduling
 */
import { useState } from "react";
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
}

export function TaskCalendar({
  tasks,
  childId,
  onTaskClick,
  onDayClick,
  defaultView = "month",
}: TaskCalendarProps) {
  const { t, i18n } = useTranslation(["tasks", "common"]);
  const currentLocale = i18n.language || "en";
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>(defaultView);
  const [hideInformational, setHideInformational] = useState(false);

  // Selected date state (shared across all views)
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

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

  const goToToday = () => {
    setCurrentDate(new Date());
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
  };

  const handleNextWeek = () => {
    const [y, m, d] = selectedDate.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + 7);
    const newDateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    setSelectedDate(newDateStr);
    setCurrentDate(date);
  };

  const handleDateSelect = (date: string) => {
    const [y, m, d] = date.split("-").map(Number);
    setSelectedDate(date);
    setCurrentDate(new Date(y, m - 1, d));
  };

  // Get week start date (Sunday, using local dates to avoid timezone issues)
  const getWeekStartDate = (): string => {
    const date = new Date(currentDate);
    const day = date.getDay();
    const diff = date.getDate() - day; // Adjust to Sunday
    const weekStart = new Date(date.setDate(diff));

    // Format as YYYY-MM-DD using local date components
    const year = weekStart.getFullYear();
    const month = String(weekStart.getMonth() + 1).padStart(2, '0');
    const dayOfMonth = String(weekStart.getDate()).padStart(2, '0');
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Title */}
          <h2 className="text-lg font-bold text-gray-900">
            {monthName} {year}
          </h2>

          {/* View Switcher - Icon only on mobile, with text on desktop */}
          <div className="flex items-center gap-2">
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
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={goToToday}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm transition-colors hover:bg-gray-50"
            >
              {t("common:today")}
            </button>
            <button
              onClick={goToPrevious}
              className="rounded-lg p-2 transition-colors hover:bg-gray-100"
              aria-label={`Previous ${view}`}
            >
              <IconChevronLeft size={20} />
            </button>
            <button
              onClick={goToNext}
              className="rounded-lg p-2 transition-colors hover:bg-gray-100"
              aria-label={`Next ${view}`}
            >
              <IconChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* Hide Informational Toggle */}
        <div className="mt-3 flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={hideInformational}
              onChange={(e) => setHideInformational(e.target.checked)}
              className="rounded"
            />
            {t("tasks:hide_informational")} ({tasks.filter(t => t.is_informational).length})
          </label>
        </div>
      </div>

      {/* View Content */}
      <div className="p-2 sm:p-4">
        {view === "month" && (
          <>
            {/* Day headers with collapse/expand button */}
            <div className="mb-2 relative">
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
              {/* Collapse/expand button overlaid in the right padding area */}
              <button
                onClick={() => setMonthCollapsed(!monthCollapsed)}
                className="absolute right-0 top-1/2 -translate-y-1/2 rounded-lg p-1.5 transition-colors hover:bg-gray-100"
                title={monthCollapsed ? t("common:expand") : t("common:collapse")}
              >
                {monthCollapsed ? <IconChevronDown size={18} /> : <IconChevronUp size={18} />}
              </button>
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-1 px-8">
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
          </>
        )}

        {view === "week" && (
          <WeekView
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
            hideInformational={hideInformational}
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
            hideInformational={hideInformational}
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
