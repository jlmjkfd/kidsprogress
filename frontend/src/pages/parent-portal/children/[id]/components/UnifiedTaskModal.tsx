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
import { useMyTemplates } from "@/api/queries/useTemplates";
import { TaskTemplate } from "@/types/template";
import { TaskTemplateSelector } from "./UnifiedTaskModal/TaskTemplateSelector";
import { PluginSettingsEditor } from "./UnifiedTaskModal/PluginSettingsEditor";
import { BasicInfoSection } from "./UnifiedTaskModal/BasicInfoSection";
import { SchedulingSection } from "./UnifiedTaskModal/SchedulingSection";
import { ObligationPrioritySection } from "./UnifiedTaskModal/ObligationPrioritySection";
import { AdvancedOptionsSection } from "./UnifiedTaskModal/AdvancedOptionsSection";
import { TaskFormActions } from "./UnifiedTaskModal/TaskFormActions";

type EditScope = "single" | "all";

interface UnifiedTaskModalProps {
  childId: string;
  task?: Task;
  templateTask?: Task; // The recurring template (when editing occurrence)
  onClose: () => void;
  onSubmit: (data: TaskCreate | TaskUpdate) => Promise<void>;
  // For editing recurring task occurrences
  isRecurringOccurrence?: boolean;
  occurrenceDate?: string; // YYYY-MM-DD
  onEditScopeChange?: (scope: EditScope, overrides: Record<string, unknown>) => Promise<void>;
}

export function UnifiedTaskModal({
  childId,
  task,
  templateTask,
  onClose,
  onSubmit,
  isRecurringOccurrence = false,
  occurrenceDate,
  onEditScopeChange,
}: UnifiedTaskModalProps) {
  const { t } = useTranslation(["common", "tasks"]);
  const { data: collections } = useTaskCollections(childId);
  const defaultCollection = collections?.find((c) => c.is_default);
  const informationalCollection = collections?.find((c) => c.collection_type === "informational");

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [taskTemplate, setTaskTemplate] = useState<"standard" | "informational" | "from_library">(
    task?.is_informational ? "informational" : "standard"
  );
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(null);
  const [editScope, setEditScope] = useState<EditScope>("single");

  // Determine which fields should be disabled for single occurrence edits
  const isSingleOccurrenceEdit = isRecurringOccurrence && editScope === "single";
  const disabledFields = {
    title: isSingleOccurrenceEdit,
    collection: isSingleOccurrenceEdit,
    template: isSingleOccurrenceEdit,
    recurrence: isSingleOccurrenceEdit,
    schedulingType: isSingleOccurrenceEdit,
    scheduledDate: isSingleOccurrenceEdit,
  };

  // Load user's templates to find the template when editing
  const { data: myTemplates } = useMyTemplates();
  const loadedTemplate = task?.template_id
    ? myTemplates?.find(t => t.template_id === task.template_id)
    : undefined;

  // Get current time and one hour later for defaults
  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const oneHourLaterTime = `${String(oneHourLater.getHours()).padStart(2, '0')}:${String(oneHourLater.getMinutes()).padStart(2, '0')}`;
  const todayDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const [formData, setFormData] = useState({
    // Basic Info
    title: task?.title || "",
    description: task?.description || "",
    collection_id: task?.collection_id || defaultCollection?._id || "",
    task_type_code: task?.task_type_code || "default",
    template_id: task?.template_id || undefined,
    execution_config: task?.execution_config || {} as Record<string, any>,

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

    // Pool / Activity
    is_in_pool: task?.is_in_pool || false,
    pool_max_times: task?.pool_usage_rules?.max_times_per_day || null,
    pool_max_duration:
      task?.pool_usage_rules?.max_duration_per_day_minutes || null,
    pool_cooldown: task?.pool_usage_rules?.cooldown_minutes || null,

    // Multi-completion support
    max_completions_per_period: task?.max_completions_per_period !== undefined ? task.max_completions_per_period : undefined as number | null | undefined,
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

  // Update recurrence fields when switching to "all" scope for recurring occurrences
  useEffect(() => {
    if (isRecurringOccurrence && editScope === "all" && templateTask) {
      setFormData((prev) => ({
        ...prev,
        is_recurring: templateTask.is_recurring || false,
        recurrence_pattern: templateTask.recurrence_pattern || "",
      }));
    }
  }, [editScope, isRecurringOccurrence, templateTask]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || (!task && !formData.collection_id)) return;

    // Validate required_attempts configuration
    if (formData.template_id && formData.execution_config) {
      const requiredAttempts = formData.execution_config.required_attempts;
      const maxCompletions = formData.max_completions_per_period;

      if (requiredAttempts && requiredAttempts > 1) {
        // required_attempts > 1 requires max_completions_per_period to be set
        if (maxCompletions === undefined || maxCompletions === null) {
          alert(
            `Error: This task requires ${requiredAttempts} attempts to complete.\n\n` +
            `You must enable "Allow multiple attempts per day" and set it to "Unlimited" or at least ${requiredAttempts}.`
          );
          setIsSubmitting(false);
          return;
        }

        // If max_completions is set but less than required_attempts, that's also invalid
        if (maxCompletions > 0 && maxCompletions < requiredAttempts) {
          alert(
            `Error: Maximum attempts per day (${maxCompletions}) is less than required attempts (${requiredAttempts}).\n\n` +
            `Set maximum attempts to at least ${requiredAttempts}, or use "Unlimited".`
          );
          setIsSubmitting(false);
          return;
        }
      }
    }

    setIsSubmitting(true);
    try {
      const baseData: Partial<TaskCreate & TaskUpdate> = {
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

      // Add template_id and execution_config if using a template
      if (formData.template_id || task?.template_id) {
        baseData.template_id = formData.template_id || task?.template_id;
        baseData.execution_config = formData.execution_config;
        baseData.max_completions_per_period = formData.max_completions_per_period;
      }

      // Handle recurring occurrence edits differently
      if (isRecurringOccurrence && onEditScopeChange) {
        if (editScope === "single") {
          // Edit only this occurrence - send overrides via exception
          const overrides: Record<string, unknown> = {};
          if (formData.description !== (task?.description || "")) {
            overrides.description = formData.description;
          }
          if (
            formData.fixed_start !== task?.fixed_time_slot?.start ||
            formData.fixed_end !== task?.fixed_time_slot?.end
          ) {
            overrides.fixed_time_slot = {
              start: formData.fixed_start,
              end: formData.fixed_end,
            };
          }
          if (formData.obligation_level !== task?.obligation_level) {
            overrides.obligation_level = formData.obligation_level;
          }
          if (formData.priority_boost !== task?.priority_boost) {
            overrides.priority_boost = formData.priority_boost;
          }
          if (formData.estimated_duration !== task?.estimated_duration_minutes) {
            overrides.estimated_duration_minutes = formData.estimated_duration;
          }

          await onEditScopeChange("single", overrides);
        } else {
          // Edit all occurrences - send full update via normal flow
          await onEditScopeChange("all", baseData);
        }
      } else if (task) {
        // Normal task update
        await onSubmit(baseData as TaskUpdate);
      } else {
        // Create new task
        const createData: TaskCreate = {
          ...baseData,
          title: baseData.title!, // Already validated in form check
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
          <div className="sticky top-0 z-10 border-b bg-white">
            <div className="flex items-center justify-between p-4 sm:p-6">
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

            {/* Edit Scope Tabs (only for recurring occurrence edits) */}
            {isRecurringOccurrence && occurrenceDate && (
              <div className="border-t border-gray-200 px-4 sm:px-6">
                <div className="flex items-center gap-2 py-3">
                  <span className="text-sm text-gray-600 mr-2">{t("tasks:editing")}:</span>
                  <div className="inline-flex rounded-lg border border-gray-300 bg-gray-50 p-1">
                    <button
                      type="button"
                      onClick={() => setEditScope("single")}
                      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                        editScope === "single"
                          ? "bg-white text-blue-600 shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      {t("tasks:this_occurrence")} ({occurrenceDate})
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditScope("all")}
                      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                        editScope === "all"
                          ? "bg-white text-blue-600 shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      {t("tasks:all_occurrences")}
                    </button>
                  </div>
                </div>
              </div>
            )}
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
                onLibraryTemplateSelect={(template) => {
                  setSelectedTemplate(template);
                  setTaskTemplate("from_library");

                  // Pre-fill form data from template
                  setFormData({
                    ...formData,
                    title: template.name,
                    description: template.description || "",
                    template_id: template.template_id,
                  });
                }}
              />
            )}

            {/* Template Info Banner */}
            {(selectedTemplate || loadedTemplate) && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-purple-900">
                      {t("tasks:templates.using_template")}: {selectedTemplate?.name || loadedTemplate?.name}
                    </h4>
                    <p className="text-sm text-purple-700 mt-1">
                      {t("tasks:templates.template_locked_hint")}
                    </p>
                  </div>
                  {!task && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTemplate(null);
                        setTaskTemplate("standard");
                        setFormData({
                          ...formData,
                          title: "",
                          description: "",
                          template_id: undefined,
                        });
                      }}
                      className="text-purple-600 hover:text-purple-800 text-sm font-medium"
                    >
                      {t("tasks:templates.remove_template")}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Template Configuration Editor */}
            {(selectedTemplate || loadedTemplate) && (
              <PluginSettingsEditor
                template={selectedTemplate || loadedTemplate!}
                config={formData.execution_config}
                onChange={(config) => {
                  setFormData({ ...formData, execution_config: config });
                }}
              />
            )}

            {/* Multi-Completion Settings (for template tasks) */}
            {(selectedTemplate || task?.template_id) && (
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Practice Settings
                </h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={formData.max_completions_per_period !== undefined}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          max_completions_per_period: e.target.checked ? 3 : undefined,
                        });
                      }}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Allow multiple attempts per day
                    </span>
                  </label>

                  {formData.max_completions_per_period !== undefined && (
                    <div className="ml-7 space-y-3">
                      <div className="space-y-2">
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="completion_limit"
                            checked={formData.max_completions_per_period === 0}
                            onChange={() => {
                              setFormData({
                                ...formData,
                                max_completions_per_period: 0,
                              });
                            }}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span className="text-sm text-gray-700">Unlimited attempts</span>
                        </label>

                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="completion_limit"
                            checked={(formData.max_completions_per_period || 0) > 0}
                            onChange={() => {
                              setFormData({
                                ...formData,
                                max_completions_per_period: 3,
                              });
                            }}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span className="text-sm text-gray-700">Set maximum</span>
                        </label>
                      </div>

                      {(formData.max_completions_per_period || 0) > 0 && (
                        <div className="ml-6 space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Maximum attempts per day
                          </label>
                          <input
                            type="number"
                            min="2"
                            max="20"
                            value={formData.max_completions_per_period || 3}
                            onChange={(e) => {
                              setFormData({
                                ...formData,
                                max_completions_per_period: parseInt(e.target.value) || 2,
                              });
                            }}
                            className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <p className="text-xs text-gray-500">
                            Child can complete this task up to {formData.max_completions_per_period} times per day
                          </p>
                        </div>
                      )}

                      {formData.max_completions_per_period === 0 && (
                        <p className="text-xs text-gray-500 ml-6">
                          Child can practice as many times as they want per day
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Basic Info Section */}
            <BasicInfoSection
              title={formData.title}
              description={formData.description}
              collectionId={formData.collection_id}
              isEditMode={!!task}
              isTemplateMode={!!selectedTemplate || !!task?.template_id}
              collections={collections}
              onTitleChange={(value) => setFormData({ ...formData, title: value })}
              onDescriptionChange={(value) => setFormData({ ...formData, description: value })}
              onCollectionChange={(value) => setFormData({ ...formData, collection_id: value })}
              disabledFields={{
                title: disabledFields.title,
                collection: disabledFields.collection,
              }}
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

            {/* Advanced Options - Hide recurrence section when editing single occurrence */}
            {!isSingleOccurrenceEdit && (
              <AdvancedOptionsSection
                showAdvanced={showAdvanced}
                isRecurring={formData.is_recurring}
                recurrencePattern={formData.recurrence_pattern}
                blocksOtherTasks={formData.blocks_other_tasks}
                isInformational={formData.is_informational}
                onToggleAdvanced={() => setShowAdvanced(!showAdvanced)}
                onIsRecurringChange={(value) => setFormData({ ...formData, is_recurring: value })}
                onRecurrencePatternChange={(pattern) => setFormData({ ...formData, recurrence_pattern: pattern })}
                onBlocksOtherTasksChange={(value) => setFormData({ ...formData, blocks_other_tasks: value })}
              />
            )}

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
