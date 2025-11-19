/**
 * Task management type definitions
 * Matches backend models for task system
 */

// ==================== Enums ====================

export enum TaskStatus {
  DRAFT = "draft",
  SCHEDULED = "scheduled",
  IN_PROGRESS = "in_progress",
  PAUSED = "paused",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
  ARCHIVED = "archived",
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

export interface TaskPauseRecord {
  paused_at: string;
  resumed_at?: string;
  paused_by: "PARENT" | "CHILD";
  reason?: string;
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

  // Pause/Resume
  pause_history: TaskPauseRecord[];
  current_pause?: TaskPauseRecord;

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

  // Existing fields
  activation_rule?: ActivationRule;
  constraints?: TaskConstraints;
  metrics?: QuantifiableMetric[];
  quality_aspects?: QualityAspect[];
  tools?: ToolUsage[];
  subtasks?: Subtask[];
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
