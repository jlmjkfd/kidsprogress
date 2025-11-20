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
    <div className="overflow-x-auto">
      <div className="flex min-w-[800px] items-center gap-2 border-b bg-gray-50 p-3">
        {/* Previous Week Button - fixed width */}
        <button
          onClick={onPrevWeek}
          className="flex-shrink-0 rounded-lg p-2 transition-colors hover:bg-gray-200"
          aria-label="Previous week"
          style={{ width: "44px" }}
        >
          <IconChevronLeft size={20} />
        </button>

        {/* Week day buttons - fills available space */}
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
                className={`flex min-w-0 flex-1 flex-col items-center rounded-lg p-2 transition-all ${
                  isSelected
                    ? "bg-blue-600 text-white shadow-md"
                    : isToday
                      ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                      : "hover:bg-gray-200"
                }`}
              >
                <span className="truncate text-xs font-medium">{dayName}</span>
                <span
                  className={`text-lg font-bold ${isSelected ? "text-white" : ""}`}
                >
                  {dayNum}
                </span>
              </button>
            );
          })}
        </div>

        {/* Next Week Button - fixed width */}
        <button
          onClick={onNextWeek}
          className="flex-shrink-0 rounded-lg p-2 transition-colors hover:bg-gray-200"
          aria-label="Next week"
          style={{ width: "44px" }}
        >
          <IconChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}
