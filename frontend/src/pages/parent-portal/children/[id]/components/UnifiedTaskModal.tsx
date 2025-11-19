import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { RemoveScroll } from "react-remove-scroll";
import { IconX } from "@tabler/icons-react";
import {
  Task,
  TaskCreate,
  TaskUpdate,
  SchedulingType,
  ObligationLevel,
  DeadlineType,
} from "@/types/task";
import { useTaskCollections } from "@/api/queries/useTaskCollections";
import { TaskTemplateSelector } from "./UnifiedTaskModal/TaskTemplateSelector";
import { BasicInfoSection } from "./UnifiedTaskModal/BasicInfoSection";
import { SchedulingSection } from "./UnifiedTaskModal/SchedulingSection";
import { ObligationPrioritySection } from "./UnifiedTaskModal/ObligationPrioritySection";
import { AdvancedOptionsSection } from "./UnifiedTaskModal/AdvancedOptionsSection";
import { TaskFormActions } from "./UnifiedTaskModal/TaskFormActions";

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
  const informationalCollection = collections?.find((c) => c.collection_type === "informational");

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [taskTemplate, setTaskTemplate] = useState<"standard" | "informational">(
    task?.is_informational ? "informational" : "standard"
  );

  // Get current time and one hour later for defaults
  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const oneHourLaterTime = `${String(oneHourLater.getHours()).padStart(2, '0')}:${String(oneHourLater.getMinutes()).padStart(2, '0')}`;
  const todayDate = now.toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    // Basic Info
    title: task?.title || "",
    description: task?.description || "",
    collection_id: task?.collection_id || defaultCollection?._id || "",
    task_type_code: task?.task_type_code || "default",

    // Scheduling Type
    scheduling_type: task?.scheduling_type || SchedulingType.FLEXIBLE,
    scheduled_date: task?.scheduled_date?.split("T")[0] || todayDate,

    // Time attributes (different for each type)
    fixed_start: task?.fixed_time_slot?.start || currentTime,
    fixed_end: task?.fixed_time_slot?.end || oneHourLaterTime,
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

  // Auto-select default collection on mount
  useEffect(() => {
    if (!task && defaultCollection && !formData.collection_id) {
      setFormData((prev) => ({
        ...prev,
        collection_id: defaultCollection._id,
      }));
    }
  }, [defaultCollection, task, formData.collection_id]);

  // Auto-select collection based on is_informational changes
  useEffect(() => {
    if (formData.is_informational && informationalCollection) {
      if (formData.collection_id !== informationalCollection._id) {
        setFormData((prev) => ({
          ...prev,
          collection_id: informationalCollection._id,
        }));
      }
    } else if (!formData.is_informational && defaultCollection) {
      // If switching back to standard, use default collection if currently using informational
      if (formData.collection_id === informationalCollection?._id) {
        setFormData((prev) => ({
          ...prev,
          collection_id: defaultCollection._id,
        }));
      }
    }
  }, [formData.is_informational, informationalCollection, defaultCollection, formData.collection_id]);

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


  return (
    <RemoveScroll>
      <div className="bg-opacity-50 fixed inset-0 z-50 flex items-start justify-center bg-black p-4 pt-8 overflow-y-auto">
        <div className="w-full max-w-3xl my-8 rounded-lg bg-white shadow-xl max-h-[90vh] flex flex-col">
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
          <form onSubmit={handleSubmit} className="space-y-6 p-4 sm:p-6 overflow-y-auto flex-1">
            {/* Task Template Selector */}
            {!task && (
              <TaskTemplateSelector
                taskTemplate={taskTemplate}
                defaultCollection={defaultCollection}
                informationalCollection={informationalCollection}
                currentCollectionId={formData.collection_id}
                onTemplateChange={(template, updates) => {
                  setTaskTemplate(template);
                  setFormData({ ...formData, ...updates });
                }}
              />
            )}

            {/* Basic Info Section */}
            <BasicInfoSection
              title={formData.title}
              description={formData.description}
              collectionId={formData.collection_id}
              isEditMode={!!task}
              collections={collections}
              onTitleChange={(value) => setFormData({ ...formData, title: value })}
              onDescriptionChange={(value) => setFormData({ ...formData, description: value })}
              onCollectionChange={(value) => setFormData({ ...formData, collection_id: value })}
            />

            {/* Scheduling Section */}
            <SchedulingSection
              schedulingType={formData.scheduling_type}
              scheduledDate={formData.scheduled_date}
              estimatedDuration={formData.estimated_duration}
              isInformational={formData.is_informational}
              timeFieldsData={{
                fixed_start: formData.fixed_start,
                fixed_end: formData.fixed_end,
                window_start: formData.window_start,
                window_end: formData.window_end,
                window_priority: formData.window_priority,
                deadline: formData.deadline,
                deadline_time: formData.deadline_time,
                deadline_type: formData.deadline_type,
                preferred_start: formData.preferred_start,
                preferred_end: formData.preferred_end,
                pool_max_times: formData.pool_max_times,
                pool_max_duration: formData.pool_max_duration,
                pool_cooldown: formData.pool_cooldown,
              }}
              onSchedulingTypeChange={(type) => setFormData({ ...formData, scheduling_type: type })}
              onScheduledDateChange={(date) => setFormData({ ...formData, scheduled_date: date })}
              onTimeFieldsChange={(updates) => setFormData({ ...formData, ...updates })}
              onEstimatedDurationChange={(duration) => setFormData({ ...formData, estimated_duration: duration })}
            />

            {/* Obligation & Priority Section */}
            <ObligationPrioritySection
              obligationLevel={formData.obligation_level}
              priorityBoost={formData.priority_boost}
              isInformational={formData.is_informational}
              onObligationLevelChange={(level) => setFormData({ ...formData, obligation_level: level })}
              onPriorityBoostChange={(boost) => setFormData({ ...formData, priority_boost: boost })}
            />

            {/* Advanced Options */}
            <AdvancedOptionsSection
              showAdvanced={showAdvanced}
              isRecurring={formData.is_recurring}
              recurrencePattern={formData.recurrence_pattern}
              blocksOtherTasks={formData.blocks_other_tasks}
              canBeInterrupted={formData.can_be_interrupted}
              canBeSplit={formData.can_be_split}
              minSessionDuration={formData.min_session_duration}
              isInformational={formData.is_informational}
              onToggleAdvanced={() => setShowAdvanced(!showAdvanced)}
              onIsRecurringChange={(value) => setFormData({ ...formData, is_recurring: value })}
              onRecurrencePatternChange={(pattern) => setFormData({ ...formData, recurrence_pattern: pattern })}
              onBlocksOtherTasksChange={(value) => setFormData({ ...formData, blocks_other_tasks: value })}
              onCanBeInterruptedChange={(value) => setFormData({ ...formData, can_be_interrupted: value })}
              onCanBeSplitChange={(value) => setFormData({ ...formData, can_be_split: value })}
              onMinSessionDurationChange={(duration) => setFormData({ ...formData, min_session_duration: duration })}
            />

            {/* Actions */}
            <TaskFormActions
              isSubmitting={isSubmitting}
              isEditMode={!!task}
              isRecurringTemplate={
                !!task &&
                task.is_recurring &&
                !task.is_virtual
              }
              canSubmit={
                formData.title.trim() !== "" &&
                (!!task || !!formData.collection_id)
              }
              onCancel={onClose}
            />
          </form>
        </div>
      </div>
    </RemoveScroll>
  );
}
