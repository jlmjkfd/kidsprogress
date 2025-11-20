/**
 * WeekSelector - Shared week calendar header for week/day views
 * Displays 7 days in a row, each clickable to select that day
 */
import { useTranslation } from "react-i18next";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

interface WeekSelectorProps {
  selectedDate: string; // YYYY-MM-DD format
  onDateSelect: (date: string) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
}

export function WeekSelector({
  selectedDate,
  onDateSelect,
  onPrevWeek,
  onNextWeek,
}: WeekSelectorProps) {
  const { i18n } = useTranslation();
  const currentLocale = i18n.language || "en";

  // Parse selected date
  const [year, monthIdx, day] = selectedDate.split("-").map(Number);
  const selectedDateObj = new Date(year, monthIdx - 1, day);

  // Calculate week start (Sunday)
  const weekStart = new Date(selectedDateObj);
  const dayOfWeek = weekStart.getDay();
  weekStart.setDate(weekStart.getDate() - dayOfWeek);

  // Generate 7 days of the week
  const weekDays: { date: Date; dateStr: string }[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    weekDays.push({ date, dateStr });
  }

  // Get today for highlighting
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  return (
    <div className="rounded-xl bg-white shadow-sm">
      <div className="flex items-center gap-1 md:gap-2 border-b bg-gradient-to-r from-gray-50 to-blue-50 p-2 md:p-3">
        {/* Previous Week Button */}
        <button
          onClick={onPrevWeek}
          className="flex-shrink-0 rounded-lg p-2 transition-colors hover:bg-white/80 min-w-[40px] md:min-w-[44px]"
          aria-label="Previous week"
        >
          <IconChevronLeft size={20} className="mx-auto" />
        </button>

        {/* Week day buttons - Responsive grid */}
        <div className="flex min-w-0 flex-1 gap-1">
          {weekDays.map(({ date, dateStr }) => {
            const isSelected = dateStr === selectedDate;
            const isToday = dateStr === todayStr;
            const dayName = date.toLocaleDateString(currentLocale, {
              weekday: "short",
            });
            const dayNum = date.getDate();

            return (
              <button
                key={dateStr}
                onClick={() => onDateSelect(dateStr)}
                className={`flex min-w-0 flex-1 flex-col items-center justify-center rounded-lg p-1.5 md:p-2 transition-all min-h-[56px] md:min-h-[64px] ${
                  isSelected
                    ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md scale-105"
                    : isToday
                      ? "bg-blue-100 text-blue-700 hover:bg-blue-200 font-semibold"
                      : "hover:bg-gray-100 text-gray-700"
                }`}
              >
                <span className="text-[10px] md:text-xs font-medium uppercase leading-tight">{dayName}</span>
                <span
                  className={`text-base md:text-lg font-bold leading-tight ${isSelected ? "text-white" : ""}`}
                >
                  {dayNum}
                </span>
              </button>
            );
          })}
        </div>

        {/* Next Week Button */}
        <button
          onClick={onNextWeek}
          className="flex-shrink-0 rounded-lg p-2 transition-colors hover:bg-white/80 min-w-[40px] md:min-w-[44px]"
          aria-label="Next week"
        >
          <IconChevronRight size={20} className="mx-auto" />
        </button>
      </div>
    </div>
  );
}
