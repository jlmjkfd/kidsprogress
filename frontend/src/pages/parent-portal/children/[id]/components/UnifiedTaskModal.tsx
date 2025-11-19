import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { RemoveScroll } from "react-remove-scroll";
import {
  IconX,
  IconCalendar,
  IconClock,
  IconRepeat,
  IconLock,
  IconTargetArrow,
  IconPool,
  IconChevronDown,
  IconChevronUp,
} from "@tabler/icons-react";
import {
  Task,
  TaskCreate,
  TaskUpdate,
  SchedulingType,
  ObligationLevel,
  DeadlineType,
} from "@/types/task";
import { useTaskCollections } from "@/api/queries/useTaskCollections";
import { RecurrencePicker } from "@/components/RecurrencePicker";

interface UnifiedTaskModalProps {
  childId: string;
  task?: Task;
  onClose: () => void;
  onSubmit: (data: TaskCreate | TaskUpdate) => Promise<void>;
}

export function UnifiedTaskModal({
  childId,
  task,
  onClose,
  onSubmit,
}: UnifiedTaskModalProps) {
  const { t } = useTranslation(["common", "tasks"]);
  const { data: collections } = useTaskCollections(childId);
  const defaultCollection = collections?.find((c) => c.is_default);

  const [showAdvanced, setShowAdvanced] = useState(false);

  const [formData, setFormData] = useState({
    // Basic Info
    title: task?.title || "",
    description: task?.description || "",
    collection_id: task?.collection_id || defaultCollection?._id || "",
    task_type_code: task?.task_type_code || "default",

    // Scheduling Type
    scheduling_type: task?.scheduling_type || SchedulingType.FLEXIBLE,
    scheduled_date: task?.scheduled_date?.split("T")[0] || "",

    // Time attributes (different for each type)
    fixed_start: task?.fixed_time_slot?.start || "",
    fixed_end: task?.fixed_time_slot?.end || "",
    preferred_start: task?.preferred_time_slot?.start || "",
    preferred_end: task?.preferred_time_slot?.end || "",
    window_start: task?.preferred_time_window?.start || "",
    window_end: task?.preferred_time_window?.end || "",
    window_priority: task?.preferred_time_window?.priority_in_window || 5,
    deadline: task?.deadline?.split("T")[0] || "",
    deadline_time: task?.deadline
      ? new Date(task.deadline).toTimeString().slice(0, 5)
      : "",
    deadline_type: task?.deadline_type || DeadlineType.SOFT,
    estimated_duration: task?.estimated_duration_minutes || null,

    // Obligation & Priority
    obligation_level: task?.obligation_level || ObligationLevel.OPTIONAL,
    priority_boost: task?.priority_boost || 0,

    // Recurrence
    is_recurring: task?.is_recurring || false,
    recurrence_pattern: task?.recurrence_pattern || "",

    // Blocking & Interruption
    is_informational: task?.is_informational || false,
    blocks_other_tasks: task?.blocks_other_tasks || false,
    can_be_interrupted: task?.can_be_interrupted ?? true,
    can_be_split: task?.can_be_split || false,
    min_session_duration: task?.min_session_duration || null,

    // Pool / Activity
    is_in_pool: task?.is_in_pool || false,
    pool_max_times: task?.pool_usage_rules?.max_times_per_day || null,
    pool_max_duration:
      task?.pool_usage_rules?.max_duration_per_day_minutes || null,
    pool_cooldown: task?.pool_usage_rules?.cooldown_minutes || null,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!task && defaultCollection && !formData.collection_id) {
      setFormData((prev) => ({
        ...prev,
        collection_id: defaultCollection._id,
      }));
    }
  }, [defaultCollection, task, formData.collection_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || (!task && !formData.collection_id)) return;

    setIsSubmitting(true);
    try {
      const baseData: any = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        task_type_code: formData.task_type_code,
        scheduling_type: formData.scheduling_type,
        scheduled_date: formData.scheduled_date
          ? new Date(formData.scheduled_date).toISOString()
          : undefined,
        obligation_level: formData.obligation_level,
        priority_boost: formData.priority_boost,
        estimated_duration_minutes: formData.estimated_duration || undefined,

        // Recurrence
        is_recurring: formData.is_recurring,
        recurrence_pattern: formData.is_recurring
          ? formData.recurrence_pattern || undefined
          : undefined,

        // Blocking & Interruption
        is_informational: formData.is_informational,
        blocks_other_tasks: formData.blocks_other_tasks,
        can_be_interrupted: formData.can_be_interrupted,
        can_be_split: formData.can_be_split,
        min_session_duration: formData.can_be_split
          ? formData.min_session_duration || undefined
          : undefined,

        // Pool
        is_in_pool: formData.is_in_pool,
      };

      // Add time attributes based on scheduling type
      if (
        formData.scheduling_type === SchedulingType.FIXED_TIME &&
        formData.fixed_start &&
        formData.fixed_end
      ) {
        baseData.fixed_time_slot = {
          start: formData.fixed_start,
          end: formData.fixed_end,
        };
      }

      if (
        formData.scheduling_type === SchedulingType.FLEXIBLE &&
        formData.preferred_start &&
        formData.preferred_end
      ) {
        baseData.preferred_time_slot = {
          start: formData.preferred_start,
          end: formData.preferred_end,
        };
      }

      if (
        formData.scheduling_type === SchedulingType.TIME_WINDOW &&
        formData.window_start &&
        formData.window_end
      ) {
        baseData.preferred_time_window = {
          start: formData.window_start,
          end: formData.window_end,
          priority_in_window: formData.window_priority,
        };
      }

      if (
        formData.scheduling_type === SchedulingType.DEADLINE &&
        formData.deadline
      ) {
        const deadlineDate = new Date(formData.deadline);
        if (formData.deadline_time) {
          const [hours, minutes] = formData.deadline_time.split(":");
          deadlineDate.setHours(parseInt(hours), parseInt(minutes));
        }
        baseData.deadline = deadlineDate.toISOString();
        baseData.deadline_type = formData.deadline_type;
      }

      // Add pool usage rules if in pool
      if (formData.is_in_pool) {
        baseData.pool_usage_rules = {
          max_times_per_day: formData.pool_max_times || undefined,
          max_duration_per_day_minutes: formData.pool_max_duration || undefined,
          cooldown_minutes: formData.pool_cooldown || undefined,
        };
      }

      if (task) {
        // Update existing task
        await onSubmit(baseData as TaskUpdate);
      } else {
        // Create new task
        const createData: TaskCreate = {
          ...baseData,
          collection_id: formData.collection_id,
          child_id: childId,
        };
        await onSubmit(createData);
      }
      onClose();
    } catch (error) {
      console.error("Failed to save task:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderTimeFields = () => {
    switch (formData.scheduling_type) {
      case SchedulingType.FIXED_TIME:
        return (
          <div className="grid grid-cols-1 gap-4 rounded-lg bg-blue-50 p-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                <IconClock className="mr-1 inline" size={16} />
                {t("tasks:unified_model.start_time")}{" "}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={formData.fixed_start}
                onChange={(e) =>
                  setFormData({ ...formData, fixed_start: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                {t("tasks:unified_model.end_time")}{" "}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={formData.fixed_end}
                onChange={(e) =>
                  setFormData({ ...formData, fixed_end: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                required
              />
            </div>
          </div>
        );

      case SchedulingType.TIME_WINDOW:
        return (
          <div className="space-y-4 rounded-lg bg-purple-50 p-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  {t("tasks:unified_model.window_start")}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={formData.window_start}
                  onChange={(e) =>
                    setFormData({ ...formData, window_start: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  {t("tasks:unified_model.window_end")}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={formData.window_end}
                  onChange={(e) =>
                    setFormData({ ...formData, window_end: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  required
                />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                {t("tasks:unified_model.window_priority")} (
                {formData.window_priority})
              </label>
              <input
                type="range"
                min="0"
                max="10"
                value={formData.window_priority}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    window_priority: parseInt(e.target.value),
                  })
                }
                className="w-full"
              />
              <div className="mt-1 flex justify-between text-xs text-gray-500">
                <span>{t("common:flexible")}</span>
                <span>{t("common:important")}</span>
              </div>
            </div>
          </div>
        );

      case SchedulingType.DEADLINE:
        return (
          <div className="space-y-4 rounded-lg bg-red-50 p-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  {t("tasks:unified_model.deadline_date")}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.deadline}
                  onChange={(e) =>
                    setFormData({ ...formData, deadline: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  {t("tasks:unified_model.deadline_time")}
                </label>
                <input
                  type="time"
                  value={formData.deadline_time}
                  onChange={(e) =>
                    setFormData({ ...formData, deadline_time: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                {t("tasks:unified_model.deadline_type")}
              </label>
              <select
                value={formData.deadline_type}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    deadline_type: e.target.value as DeadlineType,
                  })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              >
                <option value={DeadlineType.SOFT}>
                  {t("tasks:unified_model.deadline_soft")}
                </option>
                <option value={DeadlineType.HARD}>
                  {t("tasks:unified_model.deadline_hard")}
                </option>
              </select>
            </div>
          </div>
        );

      case SchedulingType.FLEXIBLE:
        return (
          <div className="rounded-lg bg-green-50 p-4">
            <p className="mb-4 text-sm text-gray-600">
              {t("tasks:unified_model.flexible_hint")}
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  {t("tasks:unified_model.preferred_start")}
                </label>
                <input
                  type="time"
                  value={formData.preferred_start}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      preferred_start: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  {t("tasks:unified_model.preferred_end")}
                </label>
                <input
                  type="time"
                  value={formData.preferred_end}
                  onChange={(e) =>
                    setFormData({ ...formData, preferred_end: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>
            </div>
          </div>
        );

      case SchedulingType.POOL:
        return (
          <div className="space-y-4 rounded-lg bg-yellow-50 p-4">
            <p className="text-sm text-gray-600">{t("tasks:pool_hint")}</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  {t("tasks:unified_model.pool_max_times")}
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.pool_max_times || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      pool_max_times: e.target.value
                        ? parseInt(e.target.value)
                        : null,
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  placeholder="No limit"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  {t("tasks:unified_model.pool_max_duration")}
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.pool_max_duration || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      pool_max_duration: e.target.value
                        ? parseInt(e.target.value)
                        : null,
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  placeholder="Minutes"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  {t("tasks:unified_model.pool_cooldown")}
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.pool_cooldown || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      pool_cooldown: e.target.value
                        ? parseInt(e.target.value)
                        : null,
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  placeholder="Minutes"
                />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <RemoveScroll>
      <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-4">
        <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white shadow-xl">
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-4 sm:p-6">
            <h2 className="text-lg font-bold text-gray-900 sm:text-xl">
              {task ? t("tasks:edit_task") : t("tasks:create_task")}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 transition-colors hover:text-gray-600"
              aria-label={t("common:close")}
            >
              <IconX size={24} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6 p-4 sm:p-6">
            {/* Basic Info Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {t("tasks:unified_model.basic_info")}
              </h3>

              {/* Title */}
              <div>
                <label
                  htmlFor="title"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  {t("tasks:task_title")}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  required
                  maxLength={200}
                />
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="description"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  {t("tasks:description")}
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  rows={3}
                />
              </div>

              {/* Collection (only for new tasks) */}
              {!task && collections && collections.length > 0 && (
                <div>
                  <label
                    htmlFor="collection"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    {t("common:collection")}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="collection"
                    value={formData.collection_id}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        collection_id: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    required
                  >
                    <option value="">{t("common:select")}</option>
                    {collections.map((col) => (
                      <option key={col._id} value={col._id}>
                        {col.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Scheduling Section */}
            <div className="space-y-4 border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900">
                <IconCalendar className="mr-2 inline" size={20} />
                {t("tasks:unified_model.scheduling")}
              </h3>

              {/* Scheduling Type */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  {t("tasks:unified_model.scheduling_type")}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {[
                    {
                      value: SchedulingType.FLEXIBLE,
                      icon: IconTargetArrow,
                      label: t("tasks:unified_model.flexible"),
                    },
                    {
                      value: SchedulingType.FIXED_TIME,
                      icon: IconLock,
                      label: t("tasks:unified_model.fixed"),
                    },
                    {
                      value: SchedulingType.TIME_WINDOW,
                      icon: IconClock,
                      label: t("tasks:unified_model.window"),
                    },
                    {
                      value: SchedulingType.DEADLINE,
                      icon: IconTargetArrow,
                      label: t("tasks:unified_model.deadline"),
                    },
                    {
                      value: SchedulingType.POOL,
                      icon: IconPool,
                      label: t("tasks:unified_model.pool"),
                    },
                  ].map(({ value, icon: Icon, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, scheduling_type: value })
                      }
                      className={`rounded-lg border-2 px-3 py-2 transition-all ${
                        formData.scheduling_type === value
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      <Icon size={20} className="mx-auto mb-1" />
                      <div className="text-xs">{label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Scheduled Date */}
              <div>
                <label
                  htmlFor="scheduled_date"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  {t("tasks:scheduled_date")}
                </label>
                <input
                  type="date"
                  id="scheduled_date"
                  value={formData.scheduled_date}
                  onChange={(e) =>
                    setFormData({ ...formData, scheduled_date: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>

              {/* Time Fields (dynamic based on scheduling type) */}
              {renderTimeFields()}

              {/* Estimated Duration */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  {t("tasks:unified_model.estimated_duration")}
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.estimated_duration || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      estimated_duration: e.target.value
                        ? parseInt(e.target.value)
                        : null,
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  placeholder={t("tasks:unified_model.minutes")}
                />
              </div>
            </div>

            {/* Obligation & Priority Section */}
            <div className="space-y-4 border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900">
                {t("tasks:unified_model.importance")}
              </h3>

              {/* Obligation Level */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  {t("tasks:unified_model.obligation_level")}
                </label>
                <select
                  value={formData.obligation_level}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      obligation_level: e.target.value as ObligationLevel,
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                >
                  <option value={ObligationLevel.MUST_DO}>
                    {t("tasks:unified_model.must_do")}
                  </option>
                  <option value={ObligationLevel.SHOULD_DO}>
                    {t("tasks:unified_model.should_do")}
                  </option>
                  <option value={ObligationLevel.OPTIONAL}>
                    {t("tasks:unified_model.optional")}
                  </option>
                </select>
              </div>

              {/* Priority Boost */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  {t("tasks:unified_model.priority_boost")} (
                  {formData.priority_boost > 0 ? "+" : ""}
                  {formData.priority_boost})
                </label>
                <input
                  type="range"
                  min="-5"
                  max="5"
                  value={formData.priority_boost}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      priority_boost: parseInt(e.target.value),
                    })
                  }
                  className="w-full"
                />
                <div className="mt-1 flex justify-between text-xs text-gray-500">
                  <span>{t("common:low")}</span>
                  <span>{t("common:normal")}</span>
                  <span>{t("common:high")}</span>
                </div>
              </div>
            </div>

            {/* Advanced Options */}
            <div className="border-t pt-6">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 font-medium text-blue-600 hover:text-blue-700"
              >
                {showAdvanced ? (
                  <IconChevronUp size={20} />
                ) : (
                  <IconChevronDown size={20} />
                )}
                {t("tasks:unified_model.advanced_options")}
              </button>

              {showAdvanced && (
                <div className="mt-4 space-y-4">
                  {/* Recurrence */}
                  <div className="space-y-3 rounded-lg bg-gray-50 p-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.is_recurring}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            is_recurring: e.target.checked,
                          })
                        }
                        className="h-4 w-4"
                      />
                      <IconRepeat size={18} />
                      <span className="font-medium">
                        {t("tasks:unified_model.recurring")}
                      </span>
                    </label>
                    {formData.is_recurring && (
                      <RecurrencePicker
                        value={formData.recurrence_pattern}
                        onChange={(rrule) =>
                          setFormData({
                            ...formData,
                            recurrence_pattern: rrule,
                          })
                        }
                      />
                    )}
                  </div>

                  {/* Blocking & Interruption */}
                  <div className="space-y-3 rounded-lg bg-gray-50 p-4">
                    {/* Informational Task Checkbox */}
                    <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.is_informational}
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            setFormData({
                              ...formData,
                              is_informational: isChecked,
                              // Auto-check related fields when informational is true
                              blocks_other_tasks: isChecked ? true : formData.blocks_other_tasks,
                              can_be_interrupted: isChecked ? false : formData.can_be_interrupted,
                              scheduling_type: isChecked ? SchedulingType.FIXED_TIME : formData.scheduling_type,
                            });
                          }}
                          className="h-4 w-4"
                        />
                        <span className="font-medium text-blue-900">
                          {t("tasks:is_informational")}
                        </span>
                      </label>
                      <p className="ml-6 mt-1 text-xs text-blue-700">
                        {t("tasks:is_informational_hint")}
                      </p>
                    </div>

                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.blocks_other_tasks}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            blocks_other_tasks: e.target.checked,
                          })
                        }
                        disabled={formData.is_informational}
                        className="h-4 w-4 disabled:opacity-50"
                      />
                      <IconLock size={18} className={formData.is_informational ? "text-gray-400" : ""} />
                      <span className={`font-medium ${formData.is_informational ? "text-gray-400" : ""}`}>
                        {t("tasks:unified_model.blocks_other_tasks")}
                      </span>
                    </label>

                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.can_be_interrupted}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            can_be_interrupted: e.target.checked,
                          })
                        }
                        disabled={formData.is_informational}
                        className="h-4 w-4 disabled:opacity-50"
                      />
                      <span className={`font-medium ${formData.is_informational ? "text-gray-400" : ""}`}>
                        {t("tasks:unified_model.can_be_interrupted")}
                      </span>
                    </label>

                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.can_be_split}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            can_be_split: e.target.checked,
                          })
                        }
                        className="h-4 w-4"
                      />
                      <span className="font-medium">
                        {t("tasks:unified_model.can_be_split")}
                      </span>
                    </label>

                    {formData.can_be_split && (
                      <div>
                        <label className="mb-2 block text-sm text-gray-600">
                          {t("tasks:unified_model.min_session_duration")}
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={formData.min_session_duration || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              min_session_duration: e.target.value
                                ? parseInt(e.target.value)
                                : null,
                            })
                          }
                          placeholder={t("tasks:unified_model.minutes")}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50"
                disabled={isSubmitting}
              >
                {t("common:cancel")}
              </button>
              <button
                type="submit"
                className="min-h-[44px] flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                disabled={
                  isSubmitting ||
                  !formData.title.trim() ||
                  (!task && !formData.collection_id)
                }
              >
                {isSubmitting
                  ? t("common:saving")
                  : task
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
