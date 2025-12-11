/**
 * Task management type definitions
 * Matches backend models for task system
 */

// ==================== Enums ====================

export enum TaskStatus {
  PENDING = "pending", // Task waiting to be done (replaces DRAFT + SCHEDULED)
  IN_PROGRESS = "in_progress", // Child clicked start
  COMPLETED = "completed", // Task finished
  SKIPPED = "skipped", // Task was not done (overdue or manually skipped)
  ARCHIVED = "archived", // Completed and archived
}

export enum TaskSource {
  ONE_TIME = "one_time",
  ROUTINE = "routine",
  ACTIVITY = "activity",
}

export enum SchedulingType {
  FLEXIBLE = "flexible",
  FIXED_TIME = "fixed_time",
  TIME_WINDOW = "time_window",
  DEADLINE = "deadline",
  POOL = "pool",
}

export enum DeadlineType {
  HARD = "hard",
  SOFT = "soft",
}

export enum ObligationLevel {
  MUST_DO = "must_do",
  SHOULD_DO = "should_do",
  OPTIONAL = "optional",
}

export enum ActivationType {
  MANUAL = "manual",
  DATE_BASED = "date_based",
  DEPENDENCY = "dependency",
}

export enum MediaPurpose {
  WORK_SUBMISSION = "work_submission",
  MOMENT = "moment",
  PROGRESS_PHOTO = "progress_photo",
}

export enum EvaluationMethod {
  AI_EVALUATION = "ai_evaluation",
  PARENT_REVIEW = "parent_review",
  SELF_ASSESSMENT = "self_assessment",
  NONE = "none",
}

// ==================== Task Metadata ====================

export interface TaskTypeDefinition {
  _id: string;
  code: string;
  display_name: string;
  description?: string;
  is_system: boolean;
  suggested_tools: string[];
  suggested_metrics: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaskTypeCreate {
  code: string;
  display_name: string;
  description?: string;
  suggested_tools?: string[];
  suggested_metrics?: string[];
}

export interface TaskTypeUpdate {
  display_name?: string;
  description?: string;
  suggested_tools?: string[];
  suggested_metrics?: string[];
  active?: boolean;
}

export interface MetricTypeDefinition {
  _id: string;
  code: string;
  display_name: string;
  description?: string;
  unit?: string;
  is_system: boolean;
  data_type: "integer" | "decimal" | "duration" | "boolean";
  min_value?: number;
  max_value?: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MetricTypeCreate {
  code: string;
  display_name: string;
  description?: string;
  unit?: string;
  data_type?: "integer" | "decimal" | "duration" | "boolean";
  min_value?: number;
  max_value?: number;
}

export interface MetricTypeUpdate {
  display_name?: string;
  description?: string;
  unit?: string;
  min_value?: number;
  max_value?: number;
  active?: boolean;
}

// ==================== Task Collection ====================

export interface TaskCollection {
  _id: string;
  child_id: string;
  parent_id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  is_default: boolean;
  is_system: boolean; // System collections are undeletable
  collection_type?: string; // "informational", "general", etc.
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaskCollectionCreate {
  child_id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

export interface TaskCollectionUpdate {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  is_archived?: boolean;
}

// ==================== Task Sub-models ====================

export interface TimeSlot {
  start: string; // HH:MM format
  end: string; // HH:MM format
}

export interface TimeWindow {
  start: string; // HH:MM format
  end: string; // HH:MM format
  priority_in_window: number; // 0-10
}

export interface PoolUsageRules {
  max_times_per_day?: number;
  max_duration_per_day_minutes?: number;
  max_duration_per_session_minutes?: number;
  cooldown_minutes?: number;
  allowed_day_types?: string[];
  requires_completion_of?: string[];
}

export interface TaskSourceMetadata {
  source_name?: string;
  source_description?: string;
  generation_date?: string;
  recurrence_info?: string;
}

export interface ActivationRule {
  activation_type: ActivationType;
  activate_on?: string; // ISO datetime
  depends_on_task_id?: string;
}

export interface TaskConstraints {
  available_from?: string; // ISO datetime
  available_until?: string; // ISO datetime
  must_complete_by?: string; // ISO datetime
  cannot_start_before_time?: string; // HH:MM
  cannot_start_after_time?: string; // HH:MM
  is_recurring: boolean;
  recurrence_pattern?: string;
  prerequisite_tasks: string[];
}

export interface RecurrenceException {
  date: string; // YYYY-MM-DD
  type: "deleted" | "modified";
  overrides?: Record<string, any>; // Fields to override
}

export interface QuantifiableMetric {
  metric_type_code: string;
  target_value?: number;
  actual_value?: number;
  unit?: string;
}

export interface QualityAspect {
  name: string;
  description?: string;
  evaluation_method: EvaluationMethod;
  criteria?: string;
  rating?: number; // 1-5
  feedback?: string;
}

export interface MediaAttachment {
  _id: string;
  file_url: string;
  file_type: "image" | "audio" | "video";
  purpose: MediaPurpose;
  uploaded_at: string;
  uploaded_by: "PARENT" | "CHILD";
  description?: string;
  ai_analysis?: Record<string, any>;
}

export interface ToolUsage {
  tool_code: string;
  enabled: boolean;
  config?: Record<string, any>;
}

export interface AIGeneratedAttributes {
  suggested_task_type?: string;
  suggested_metrics: QuantifiableMetric[];
  suggested_quality_aspects: QualityAspect[];
  suggested_tools: string[];
  estimated_duration_minutes?: number;
  difficulty_level?: number; // 1-5
  generated_at: string;
  accepted: boolean;
}

export interface Subtask {
  _id: string;
  title: string;
  description?: string;
  completed: boolean;
  completed_at?: string;
  order: number;
}

// ==================== Task ====================

export interface Task {
  _id: string;
  collection_id: string;
  child_id: string;
  parent_id: string;

  // Basic Info
  title: string;
  description?: string;
  task_type_code?: string;

  // Source tracking (Enhanced)
  task_source: TaskSource;
  source_id?: string;
  source_metadata?: TaskSourceMetadata;
  template_id?: string; // Reference to TaskTemplate for template-based tasks
  execution_config?: Record<string, any>; // Template execution configuration (overrides from template)

  // Scheduling (Enhanced - Unified Model)
  scheduling_type: SchedulingType;
  scheduled_date?: string;

  // Time attributes (different for each scheduling_type)
  fixed_time_slot?: TimeSlot; // For FIXED_TIME
  preferred_time_slot?: TimeSlot; // For FLEXIBLE (soft constraint)
  preferred_time_window?: TimeWindow; // For TIME_WINDOW
  deadline?: string; // For DEADLINE
  deadline_type?: DeadlineType; // HARD or SOFT
  estimated_duration_minutes?: number;

  // Recurrence (Unified Model - replaces separate Routine)
  is_recurring: boolean;
  recurrence_pattern?: string; // RRULE string
  source_recurring_task_id?: string;
  exceptions: RecurrenceException[]; // Exceptions for specific occurrences
  is_virtual?: boolean; // True if this is a virtual instance (not stored in DB)
  is_deleted?: boolean; // True if this virtual occurrence was deleted (can be restored)

  // Multi-completion support (for practice tasks that can be done multiple times per day)
  max_completions_per_period?: number; // Max attempts per period (undefined = single completion)
  completion_count?: number; // Track how many times completed in current period
  progress_state?: Record<string, any>; // Temporary storage for in-progress work

  // Blocking & Interruption (Unified Model - replaces TimeBlock)
  is_informational: boolean; // Informational tasks (school time, sleep) - no start/complete buttons
  blocks_other_tasks: boolean;
  can_be_interrupted: boolean;
  can_be_split: boolean;
  min_session_duration?: number;

  // Pool / Activity (Unified Model - replaces Activity)
  is_in_pool: boolean;
  pool_usage_rules?: PoolUsageRules;

  // Rollover tracking (Enhanced)
  original_date?: string;
  rollover_count: number;
  is_in_backlog: boolean;
  is_delayed: boolean;

  // Kids create tasks support
  created_by: string; // "PARENT" or "CHILD"
  quick_capture: boolean;

  // Concurrent task support (Enhanced)
  concurrent_allowed: boolean;
  concurrent_compatible_with: string[];

  // Priority (Enhanced)
  priority_boost: number;
  obligation_level: ObligationLevel;

  // Lifecycle
  status: TaskStatus;
  activation_rule?: ActivationRule;
  constraints?: TaskConstraints;

  // Evaluation
  metrics: QuantifiableMetric[];
  quality_aspects: QualityAspect[];

  // Media & Tools
  attachments: MediaAttachment[];
  tools: ToolUsage[];

  // AI Support
  ai_attributes?: AIGeneratedAttributes;

  // Subtasks
  subtasks: Subtask[];

  // Timestamps
  created_at: string;
  updated_at: string;
  activated_at?: string;
  started_at?: string;
  completed_at?: string;

  // Points & Rewards
  points_earned?: number;
}

export interface TaskCreate {
  collection_id: string;
  child_id: string;
  title: string;
  description?: string;
  task_type_code?: string;
  template_id?: string; // Reference to TaskTemplate for template-based tasks
  execution_config?: Record<string, any>; // Template execution configuration (overrides from template)

  // Scheduling fields (Unified Model)
  scheduling_type?: SchedulingType;
  scheduled_date?: string; // ISO datetime

  // Time attributes
  fixed_time_slot?: TimeSlot;
  preferred_time_slot?: TimeSlot;
  preferred_time_window?: TimeWindow;
  deadline?: string;
  deadline_type?: DeadlineType;
  estimated_duration_minutes?: number;

  // Obligation & Priority
  obligation_level?: ObligationLevel;
  priority_boost?: number; // -5 to 5

  // Recurrence
  is_recurring?: boolean;
  recurrence_pattern?: string;

  // Blocking & Interruption
  is_informational?: boolean;
  blocks_other_tasks?: boolean;
  can_be_interrupted?: boolean;
  can_be_split?: boolean;
  min_session_duration?: number;

  // Pool / Activity
  is_in_pool?: boolean;
  pool_usage_rules?: PoolUsageRules;

  // Multi-completion support
  max_completions_per_period?: number | null;
  completion_count?: number;
  progress_state?: Record<string, any>;

  // Existing fields
  activation_rule?: ActivationRule;
  constraints?: TaskConstraints;
  metrics?: QuantifiableMetric[];
  quality_aspects?: QualityAspect[];
  tools?: ToolUsage[];
  subtasks?: Subtask[];
}

export interface TaskUpdate {
  title?: string;
  description?: string;
  task_type_code?: string;

  // Scheduling fields (Unified Model)
  scheduling_type?: SchedulingType;
  scheduled_date?: string; // ISO datetime

  // Time attributes
  fixed_time_slot?: TimeSlot;
  preferred_time_slot?: TimeSlot;
  preferred_time_window?: TimeWindow;
  deadline?: string;
  deadline_type?: DeadlineType;
  estimated_duration_minutes?: number;

  // Obligation & Priority
  obligation_level?: ObligationLevel;
  priority_boost?: number; // -5 to 5

  // Recurrence
  is_recurring?: boolean;
  recurrence_pattern?: string;

  // Blocking & Interruption
  is_informational?: boolean;
  blocks_other_tasks?: boolean;
  can_be_interrupted?: boolean;
  can_be_split?: boolean;
  min_session_duration?: number;

  // Pool / Activity
  is_in_pool?: boolean;
  pool_usage_rules?: PoolUsageRules;

  // Multi-completion support
  max_completions_per_period?: number | null;
  completion_count?: number;
  progress_state?: Record<string, any>;

  // Existing fields
  activation_rule?: ActivationRule;
  constraints?: TaskConstraints;
  metrics?: QuantifiableMetric[];
  quality_aspects?: QualityAspect[];
  tools?: ToolUsage[];
  subtasks?: Subtask[];
}

export interface ChildTaskCreate {
  title: string;
  description?: string;
  scheduled_date?: string; // ISO datetime - optional for planning ahead
  scheduled_time?: string; // HH:MM format
  estimated_duration_minutes?: number;
  quick_capture: boolean; // True if "What I'm Doing Now"
}

// ==================== Active Task Session ====================

export interface ActiveTaskSession {
  _id: string;
  child_id: string;
  task_id: string;
  started_at: string;
  last_activity: string;
  tools_in_use: string[];
}

export interface ConcurrentTaskWarning {
  task_id: string;
  title: string;
  started_at: string;
}

export interface StartTaskResponse {
  task: Task;
  concurrent_tasks: ConcurrentTaskWarning[];
}

// ==================== Overdue Task Types ====================

export interface OverdueTaskBase {
  task_id: string;
  title: string;
  description: string | null;
  task_type_code: string | null;
  task_source: string;
  completion_type: "simple" | "with_criteria";
  has_metrics: boolean;
  has_quality_aspects: boolean;
  has_tools: boolean;
  has_subtasks: boolean;
  days_overdue: number;
}

export interface OverdueOneOffTask extends OverdueTaskBase {
  is_recurring: false;
  scheduled_date: string;
}

export interface OverdueRecurringTask extends OverdueTaskBase {
  is_recurring: true;
  source_id: string;
  total_missed_days: number;
  missed_date_range: {
    start: string;
    end: string;
  };
  recent_missed_dates: string[];  // Last 7 dates (for initial display)
  all_missed_dates: string[];     // All dates (for "Show All" feature)
  older_count: number;
}

export type OverdueTask = OverdueOneOffTask | OverdueRecurringTask;

export interface OverdueTasksResponse {
  must_do: OverdueTask[];
  should_do: OverdueTask[];
  optional: OverdueTask[];
}
