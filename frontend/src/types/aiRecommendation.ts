import { Task } from "./task";

export interface ChildState {
  current_time: string; // ISO datetime
  last_task_completed_id?: string;
  last_task_completed_at?: string; // ISO datetime
  last_task_category?: "mental" | "physical" | "creative" | "rest";
  minutes_since_last_break: number;
  consecutive_mental_tasks?: number;
  energy_level?: number; // 1-5
  focus_level?: number; // 1-5
}

export interface ScheduleConflict {
  type: "time_block" | "prerequisite" | "break_needed" | "deadline";
  description: string;
  severity: "warning" | "error" | "info";
  conflicting_item?: Record<string, unknown>;
}

export interface TaskRecommendation {
  suggested_task: Task;
  reasoning: string;
  priority_score: number; // 0-100
  estimated_minutes: number;
  break_suggested: boolean;
  break_duration_minutes: number;
  alternatives: Task[];
  conflicts: ScheduleConflict[];
  confidence: number; // 0-1
}

export interface ReplanChange {
  task_id: string;
  task_title: string;
  old_time?: string; // HH:MM
  new_time?: string; // HH:MM
  action: "reschedule" | "move_to_tomorrow" | "remove" | "reduce_duration";
  reason: string;
}

export interface ReplannedSchedule {
  changes: ReplanChange[];
  tasks_moved_to_tomorrow: Task[];
  tasks_removed: Task[];
  summary: string;
  new_estimated_end_time?: string; // HH:MM
}

export interface DayTasksSummary {
  date: string; // YYYY-MM-DD
  child_id: string;
  total_tasks: number;
  tasks_by_status: Record<string, number>;
  tasks_by_source: Record<string, number>;
  total_estimated_minutes: number;
  must_do_count: number;
  should_do_count: number;
  optional_count: number;
  tasks: Task[];
  time_blocks: Array<Record<string, unknown>>;
}

export interface ReplanRequest {
  child_id: string;
  parent_id: string;
  current_task_id: string;
  actual_duration: number;
  estimated_duration: number;
  current_time?: string; // ISO datetime, optional for testing
}
