/**
 * Routine Create/Edit Modal
 */
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { RemoveScroll } from "react-remove-scroll";
import { IconX, IconCalendar, IconClock, IconRepeat } from "@tabler/icons-react";
import { Routine, RoutineCreate, RoutineUpdate, Frequency, Weekday } from "@/types/enhanced-tasks";

interface RoutineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: RoutineCreate | RoutineUpdate) => Promise<void>;
  routine?: Routine;
  childId: string;
  collectionId: string;
}

const FREQUENCIES: Frequency[] = ["daily", "weekly", "monthly", "yearly"];
const WEEKDAYS: Weekday[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const SCHEDULING_TYPES = ["fixed_time", "preferred_time", "flexible"] as const;
const OBLIGATION_LEVELS = ["must_do", "should_do", "can_do"] as const;

export default function RoutineModal({
  isOpen,
  onClose,
  onSubmit,
  routine,
  childId,
  collectionId,
}: RoutineModalProps) {
  const { t } = useTranslation(["tasks", "common"]);
  const isEdit = !!routine;

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [taskTypeCode, setTaskTypeCode] = useState("homework");
  const [frequency, setFrequency] = useState<Frequency>("daily");
  const [interval, setInterval] = useState(1);
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState("");
  const [selectedWeekdays, setSelectedWeekdays] = useState<Weekday[]>([]);
  const [schedulingType, setSchedulingType] = useState<"fixed_time" | "preferred_time" | "flexible">("flexible");
  const [obligationLevel, setObligationLevel] = useState<"must_do" | "should_do" | "can_do">("must_do");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [priorityBoost, setPriorityBoost] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load routine data for editing
  useEffect(() => {
    if (routine) {
      setTitle(routine.title);
      setDescription(routine.description || "");
      setTaskTypeCode(routine.task_type_code);
      setFrequency(routine.recurrence.frequency);
      setInterval(routine.recurrence.interval);
      setStartDate(routine.recurrence.start_date.split("T")[0]);
      setEndDate(routine.recurrence.end_date?.split("T")[0] || "");
      setSelectedWeekdays(routine.recurrence.by_weekday || []);
      setSchedulingType(routine.scheduling_type);
      setObligationLevel(routine.obligation_level);
      setStartTime(routine.preferred_time_slot?.start || "");
      setEndTime(routine.preferred_time_slot?.end || "");
      setDurationMinutes(routine.estimated_duration_minutes?.toString() || "");
      setPriorityBoost(routine.priority_boost);
    } else {
      // Reset for new routine
      setTitle("");
      setDescription("");
      setTaskTypeCode("homework");
      setFrequency("daily");
      setInterval(1);
      setStartDate(new Date().toISOString().split("T")[0]);
      setEndDate("");
      setSelectedWeekdays([]);
      setSchedulingType("flexible");
      setObligationLevel("must_do");
      setStartTime("");
      setEndTime("");
      setDurationMinutes("");
      setPriorityBoost(0);
    }
  }, [routine, isOpen]);

  const handleWeekdayToggle = (day: Weekday) => {
    setSelectedWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const data: RoutineCreate | RoutineUpdate = {
        ...(isEdit ? {} : { child_id: childId, collection_id: collectionId }),
        title,
        description: description || undefined,
        recurrence: {
          frequency,
          interval,
          start_date: startDate,
          end_date: endDate || undefined,
          by_weekday: selectedWeekdays.length > 0 ? selectedWeekdays : undefined,
        },
        task_type_code: taskTypeCode,
        preferred_time_slot:
          startTime && endTime
            ? { start: startTime, end: endTime }
            : undefined,
        scheduling_type: schedulingType,
        obligation_level: obligationLevel,
        priority_boost: priorityBoost,
        estimated_duration_minutes: durationMinutes ? parseInt(durationMinutes) : undefined,
      };

      await onSubmit(data);
      onClose();
    } catch (error) {
      console.error("Failed to save routine:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <RemoveScroll>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            {isEdit ? t("tasks:routine.edit") : t("tasks:routine.create")}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <IconX size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Info */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("common:title")}*
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={t("tasks:routine.title_placeholder")}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("common:description")}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={t("tasks:routine.description_placeholder")}
            />
          </div>

          {/* Recurrence Pattern */}
          <div className="border-t pt-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <IconRepeat size={18} />
              {t("tasks:routine.recurrence")}
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("tasks:routine.frequency")}*
                </label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as Frequency)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {FREQUENCIES.map((freq) => (
                    <option key={freq} value={freq}>
                      {t(`tasks:routine.frequency_${freq}`)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("tasks:routine.interval")}
                </label>
                <input
                  type="number"
                  value={interval}
                  onChange={(e) => setInterval(parseInt(e.target.value) || 1)}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {frequency === "weekly" && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("tasks:routine.weekdays")}
                </label>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleWeekdayToggle(day)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        selectedWeekdays.includes(day)
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {t(`common:weekday_${day}_short`)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <IconCalendar size={16} className="inline mr-1" />
                  {t("tasks:routine.start_date")}*
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <IconCalendar size={16} className="inline mr-1" />
                  {t("tasks:routine.end_date")}
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Scheduling & Priority */}
          <div className="border-t pt-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-4">
              {t("tasks:routine.scheduling_settings")}
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("tasks:routine.scheduling_type")}*
                </label>
                <select
                  value={schedulingType}
                  onChange={(e) => setSchedulingType(e.target.value as "fixed_time" | "preferred_time" | "flexible")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {SCHEDULING_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {t(`tasks:routine.scheduling_${type}`)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("tasks:routine.obligation_level")}*
                </label>
                <select
                  value={obligationLevel}
                  onChange={(e) => setObligationLevel(e.target.value as "must_do" | "should_do" | "can_do")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {OBLIGATION_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {t(`tasks:routine.obligation_${level}`)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {(schedulingType === "fixed_time" || schedulingType === "preferred_time") && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <IconClock size={16} className="inline mr-1" />
                    {t("tasks:routine.start_time")}
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <IconClock size={16} className="inline mr-1" />
                    {t("tasks:routine.end_time")}
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("tasks:routine.duration_minutes")}
                </label>
                <input
                  type="number"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  min="1"
                  placeholder="30"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("tasks:routine.priority_boost")}
                </label>
                <input
                  type="number"
                  value={priorityBoost}
                  onChange={(e) => setPriorityBoost(parseInt(e.target.value) || 0)}
                  min="-10"
                  max="10"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors min-h-[44px]"
            >
              {t("common:cancel")}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors min-h-[44px]"
            >
              {isSubmitting
                ? t("common:saving")
                : isEdit
                ? t("common:save")
                : t("common:create")}
            </button>
          </div>
        </form>
        </div>
      </div>
    </RemoveScroll>
  );
}
