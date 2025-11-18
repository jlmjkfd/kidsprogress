/**
 * RecurrencePicker - User-friendly recurrence pattern builder
 * Generates RRULE strings from user selections
 */
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { IconRepeat, IconCalendar, IconX } from "@tabler/icons-react";

interface RecurrencePickerProps {
  value?: string; // RRULE string
  onChange: (rrule: string) => void;
}

type Frequency = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY" | "SCHOOL_DAYS" | "HOLIDAYS";
type EndType = "never" | "on_date" | "after_count";

const WEEKDAYS = [
  { label: "Mon", value: "MO" },
  { label: "Tue", value: "TU" },
  { label: "Wed", value: "WE" },
  { label: "Thu", value: "TH" },
  { label: "Fri", value: "FR" },
  { label: "Sat", value: "SA" },
  { label: "Sun", value: "SU" },
];

export function RecurrencePicker({ value, onChange }: RecurrencePickerProps) {
  const { t } = useTranslation(["tasks", "common"]);

  const [frequency, setFrequency] = useState<Frequency>("WEEKLY");
  const [interval, setInterval] = useState(1);
  const [selectedDays, setSelectedDays] = useState<string[]>(["MO", "TU", "WE", "TH", "FR"]);
  const [endType, setEndType] = useState<EndType>("never");
  const [endDate, setEndDate] = useState("");
  const [endCount, setEndCount] = useState(10);

  // Parse existing RRULE on mount
  useEffect(() => {
    if (value && value.startsWith("FREQ=")) {
      parseRRule(value);
    }
  }, [value]);

  const parseRRule = (rrule: string) => {
    const parts = rrule.split(";");
    parts.forEach((part) => {
      const [key, val] = part.split("=");
      if (key === "FREQ") setFrequency(val as Frequency);
      if (key === "INTERVAL") setInterval(parseInt(val));
      if (key === "BYDAY") setSelectedDays(val.split(","));
      if (key === "UNTIL") {
        setEndType("on_date");
        // Parse RRULE date format (YYYYMMDD)
        const year = val.substring(0, 4);
        const month = val.substring(4, 6);
        const day = val.substring(6, 8);
        setEndDate(`${year}-${month}-${day}`);
      }
      if (key === "COUNT") {
        setEndType("after_count");
        setEndCount(parseInt(val));
      }
    });
  };

  const generateRRule = (): string => {
    // Special handling for school days and holidays
    // We use a custom format: FREQ=SCHOOL_DAYS or FREQ=HOLIDAYS
    // The backend will need to expand these based on the school calendar
    if (frequency === "SCHOOL_DAYS" || frequency === "HOLIDAYS") {
      let rrule = `FREQ=${frequency}`;

      if (endType === "on_date" && endDate) {
        const formattedDate = endDate.replace(/-/g, "");
        rrule += `;UNTIL=${formattedDate}`;
      }

      if (endType === "after_count" && endCount > 0) {
        rrule += `;COUNT=${endCount}`;
      }

      return rrule;
    }

    // Standard RRULE for regular frequencies
    let rrule = `FREQ=${frequency}`;

    if (interval > 1) {
      rrule += `;INTERVAL=${interval}`;
    }

    if (frequency === "WEEKLY" && selectedDays.length > 0) {
      rrule += `;BYDAY=${selectedDays.join(",")}`;
    }

    if (endType === "on_date" && endDate) {
      // Convert YYYY-MM-DD to YYYYMMDD format
      const formattedDate = endDate.replace(/-/g, "");
      rrule += `;UNTIL=${formattedDate}`;
    }

    if (endType === "after_count" && endCount > 0) {
      rrule += `;COUNT=${endCount}`;
    }

    return rrule;
  };

  useEffect(() => {
    const rrule = generateRRule();
    onChange(rrule);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frequency, interval, selectedDays, endType, endDate, endCount]);

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  return (
    <div className="space-y-4 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
      <div className="flex items-center gap-2 text-indigo-900 font-medium">
        <IconRepeat size={18} />
        <span>{t("tasks:unified_model.recurrence_pattern")}</span>
      </div>

      {/* Frequency */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t("tasks:unified_model.repeat")}
        </label>
        <select
          value={frequency}
          onChange={(e) => setFrequency(e.target.value as Frequency)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
        >
          <option value="DAILY">{t("tasks:unified_model.repeat_daily")}</option>
          <option value="WEEKLY">{t("tasks:unified_model.repeat_weekly")}</option>
          <option value="MONTHLY">{t("tasks:unified_model.repeat_monthly")}</option>
          <option value="YEARLY">Yearly</option>
          <option value="SCHOOL_DAYS">{t("tasks:unified_model.repeat_school_days")}</option>
          <option value="HOLIDAYS">{t("tasks:unified_model.repeat_holidays")}</option>
        </select>
      </div>

      {/* Interval - hide for school days/holidays */}
      {frequency !== "SCHOOL_DAYS" && frequency !== "HOLIDAYS" && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("tasks:unified_model.repeat_every")}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              max="999"
              value={interval}
              onChange={(e) => setInterval(parseInt(e.target.value) || 1)}
              className="w-20 px-3 py-2 border border-gray-300 rounded-lg"
            />
            <span className="text-sm text-gray-600">
              {frequency === "DAILY" && (interval === 1 ? "day" : "days")}
              {frequency === "WEEKLY" && (interval === 1 ? "week" : "weeks")}
              {frequency === "MONTHLY" && (interval === 1 ? "month" : "months")}
              {frequency === "YEARLY" && (interval === 1 ? "year" : "years")}
            </span>
          </div>
        </div>
      )}

      {/* Weekdays (for WEEKLY) */}
      {frequency === "WEEKLY" && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("tasks:unified_model.repeat_on_days")}
          </label>
          <div className="flex gap-2">
            {WEEKDAYS.map((day) => (
              <button
                key={day.value}
                type="button"
                onClick={() => toggleDay(day.value)}
                className={`w-10 h-10 rounded-full text-sm font-medium transition-colors ${
                  selectedDays.includes(day.value)
                    ? "bg-indigo-600 text-white"
                    : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                {day.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* End Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t("tasks:unified_model.repeat_ends")}
        </label>
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              value="never"
              checked={endType === "never"}
              onChange={(e) => setEndType(e.target.value as EndType)}
              className="w-4 h-4"
            />
            <span className="text-sm">{t("tasks:unified_model.repeat_never")}</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="radio"
              value="on_date"
              checked={endType === "on_date"}
              onChange={(e) => setEndType(e.target.value as EndType)}
              className="w-4 h-4"
            />
            <span className="text-sm">{t("tasks:unified_model.repeat_on_date")}</span>
          </label>
          {endType === "on_date" && (
            <div className="ml-6">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          )}

          <label className="flex items-center gap-2">
            <input
              type="radio"
              value="after_count"
              checked={endType === "after_count"}
              onChange={(e) => setEndType(e.target.value as EndType)}
              className="w-4 h-4"
            />
            <span className="text-sm">{t("tasks:unified_model.repeat_after_occurrences")}</span>
          </label>
          {endType === "after_count" && (
            <div className="ml-6 flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="999"
                value={endCount}
                onChange={(e) => setEndCount(parseInt(e.target.value) || 1)}
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg"
              />
              <span className="text-sm text-gray-600">occurrences</span>
            </div>
          )}
        </div>
      </div>

      {/* Generated RRULE (for debugging/advanced users) */}
      <div className="pt-3 border-t border-indigo-200">
        <details>
          <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
            Advanced: Generated RRULE
          </summary>
          <code className="block mt-2 text-xs bg-white p-2 rounded border border-gray-300 text-gray-700">
            {generateRRule()}
          </code>
        </details>
      </div>
    </div>
  );
}
