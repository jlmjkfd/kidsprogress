/**
 * Type definitions for enhanced task management
 * Routines, Activities, Time Blocks, Schedule, Tools
 */

// ============ Routines ============

export type Frequency = "daily" | "weekly" | "monthly" | "yearly";
export type Weekday = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

export interface TimeSlot {
  start: string; // HH:MM format
  end: string;
}

export interface RecurrencePattern {
  frequency: Frequency;
  interval: number;
  start_date: string; // ISO date
  end_date?: string;
  by_weekday?: Weekday[];
  by_month_day?: number[];
  by_set_pos?: number[];
}

export interface Routine {
  _id: string;
  child_id: string;
  parent_id: string;
  collection_id: string;
  title: string;
  description?: string;
  recurrence: RecurrencePattern;
  task_type_code: string;
  preferred_time_slot?: TimeSlot;
  scheduling_type: "fixed_time" | "preferred_time" | "flexible";
  obligation_level: "must_do" | "should_do" | "can_do";
  priority_boost: number;
  estimated_duration_minutes?: number;
  is_active: boolean;
  skip_dates: string[];
  created_at: string;
  updated_at: string;
}

export interface RoutineCreate {
  child_id: string;
  collection_id: string;
  title: string;
  description?: string;
  recurrence: RecurrencePattern;
  task_type_code: string;
  preferred_time_slot?: TimeSlot;
  scheduling_type: "fixed_time" | "preferred_time" | "flexible";
  obligation_level: "must_do" | "should_do" | "can_do";
  priority_boost?: number;
  estimated_duration_minutes?: number;
}

export interface RoutineUpdate {
  title?: string;
  description?: string;
  recurrence?: RecurrencePattern;
  preferred_time_slot?: TimeSlot;
  scheduling_type?: "fixed_time" | "preferred_time" | "flexible";
  obligation_level?: "must_do" | "should_do" | "can_do";
  priority_boost?: number;
  estimated_duration_minutes?: number;
  is_active?: boolean;
}

// ============ Activities ============

export type ActivityType = "optional_pool" | "reward_activity";

export interface UsageRule {
  max_times_per_day?: number;
  max_duration_minutes?: number;
  allowed_days?: Weekday[];
  requires_completion_of?: string[];
}

export interface Activity {
  _id: string;
  child_id: string;
  parent_id: string;
  collection_id: string;
  title: string;
  description?: string;
  activity_type: ActivityType;
  task_type_code: string;
  usage_rules?: UsageRule;
  preferred_time_slot?: TimeSlot;
  scheduling_type: "fixed_time" | "preferred_time" | "flexible";
  obligation_level: "must_do" | "should_do" | "can_do";
  priority_boost: number;
  estimated_duration_minutes?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ActivityCreate {
  child_id: string;
  collection_id: string;
  title: string;
  description?: string;
  activity_type: ActivityType;
  task_type_code: string;
  usage_rules?: UsageRule;
  preferred_time_slot?: TimeSlot;
  scheduling_type: "fixed_time" | "preferred_time" | "flexible";
  obligation_level: "must_do" | "should_do" | "can_do";
  priority_boost?: number;
  estimated_duration_minutes?: number;
}

export interface ActivityUpdate {
  title?: string;
  description?: string;
  usage_rules?: UsageRule;
  preferred_time_slot?: TimeSlot;
  scheduling_type?: "fixed_time" | "preferred_time" | "flexible";
  obligation_level?: "must_do" | "should_do" | "can_do";
  priority_boost?: number;
  estimated_duration_minutes?: number;
  is_active?: boolean;
}

export interface ActivityAvailability {
  activity_id: string;
  title: string;
  available: boolean;
  reason?: string;
  usage_today: number;
  limit?: number;
}

// ============ Time Blocks ============

export type DayTypeEnum = "school_day" | "weekend" | "holiday" | "special_event";

export interface TimeBlock {
  _id: string;
  child_id: string;
  parent_id: string;
  date: string; // ISO date
  time_slot: TimeSlot;
  title: string;
  description?: string;
  day_type?: DayTypeEnum;
  blocks_scheduling: boolean;
  as_fixed_task: boolean;
  task_id?: string;
  created_at: string;
  updated_at: string;
}

export interface TimeBlockCreate {
  child_id: string;
  date: string;
  time_slot: TimeSlot;
  title: string;
  description?: string;
  day_type?: DayTypeEnum;
  blocks_scheduling?: boolean;
  as_fixed_task?: boolean;
  collection_id?: string;
  task_type_code?: string;
}

export interface TimeBlockUpdate {
  date?: string;
  time_slot?: TimeSlot;
  title?: string;
  description?: string;
  day_type?: DayTypeEnum;
  blocks_scheduling?: boolean;
  as_fixed_task?: boolean;
}

export interface DayType {
  _id: string;
  child_id: string;
  parent_id: string;
  date: string;
  day_type: DayTypeEnum;
  notes?: string;
  created_at: string;
}

export interface DayTypeCreate {
  child_id: string;
  date: string;
  day_type: DayTypeEnum;
  notes?: string;
}

// ============ Schedule ============

export interface DailySchedule {
  date: string;
  day_type?: DayTypeEnum;
  tasks: Array<Record<string, unknown>>; // Tasks array - actual Task type imported would create circular dependency
  time_blocks: TimeBlock[];
  conflicts: ScheduleConflict[];
}

export interface ScheduleConflict {
  type: "task_task_conflict" | "task_block_conflict" | "block_block_conflict";
  task1_id?: string;
  task1_title?: string;
  task2_id?: string;
  task2_title?: string;
  block_id?: string;
  block_title?: string;
  time_slot: TimeSlot;
}

export interface AvailableSlot {
  start: string;
  end: string;
  duration_minutes: number;
}

// ============ Tools ============

export type ToolCategory = "writing" | "math" | "reading" | "timer" | "reference" | "other";
export type ToolScope = "all_children" | "specific_child" | "parent_only";

export interface Tool {
  _id: string;
  code: string;
  name: string;
  description: string;
  category: ToolCategory;
  scope: ToolScope;
  is_system: boolean;
  is_active: boolean;
  applicable_task_types: string[];
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ToolCreate {
  code: string;
  name: string;
  description: string;
  category: ToolCategory;
  scope: ToolScope;
  applicable_task_types: string[];
}

export interface ToolUpdate {
  name?: string;
  description?: string;
  category?: ToolCategory;
  scope?: ToolScope;
  applicable_task_types?: string[];
  is_active?: boolean;
}
