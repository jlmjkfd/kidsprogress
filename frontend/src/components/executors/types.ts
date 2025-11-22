/**
 * Executor component types
 */
import React from "react";

/**
 * Generic execution data structure from backend
 * Contains handler-specific configuration and fields
 */
export interface ExecutionData {
  handler_type: string;
  fields?: Array<{
    field_id: string;
    field_type: "text" | "number" | "textarea" | "select" | "checkbox";
    label: string;
    required: boolean;
    options?: string[];
  }>;
  allow_photos?: boolean;
  allow_notes?: boolean;
  prompts?: string[];
  content_type?: string;
  min_length?: number;
  max_length?: number;
  allow_llm_feedback?: boolean;
  [key: string]: unknown; // Allow additional handler-specific properties
}

/**
 * Completion data submitted to backend after task execution
 */
export interface CompletionData {
  form_responses?: Record<string, string | number | string[]>;
  notes?: string | null;
  photos?: string[];
  started_at?: string;
  completed_at?: string;
  title?: string;
  content?: string;
  [key: string]: unknown; // Allow additional completion-specific properties
}

export interface ExecutorProps {
  taskId: string;
  executionData: ExecutionData;
  onComplete: (completionData: CompletionData) => Promise<void>;
  onCancel: () => void;
}

export type ExecutorComponent = (props: ExecutorProps) => JSX.Element;
