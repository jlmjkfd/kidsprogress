/**
 * Type definitions for AI-powered features
 */

export interface TaskRecommendation {
  recommended_task_id: string | null;
  task_title: string;
  reasoning: string;
  estimated_duration: string;
  alternative_tasks: string[];
  suggestion_type: "scheduled_task" | "activity" | "break" | "none";
}

export interface ScheduleItem {
  time_slot: {
    start: string;
    end: string;
  };
  task_id: string | null;
  task_title: string;
  task_type: "routine" | "scheduled" | "activity" | "break";
  priority: "must" | "should" | "can";
  adjusted?: boolean;
  reason_for_change?: string;
}

export interface DailyPlan {
  schedule: ScheduleItem[];
  summary: string;
  warnings: string[];
  unscheduled_tasks: string[];
}

export interface RecommendNowRequest {
  child_id: string;
}

export interface PlanDayRequest {
  child_id: string;
  target_date?: string; // ISO date YYYY-MM-DD
}

export interface ReplanRequest {
  child_id: string;
  reason: string;
  completed_task_ids: string[];
}

export interface TaskExplanation {
  task_id: string;
  task_title: string;
  explanation: string;
}
