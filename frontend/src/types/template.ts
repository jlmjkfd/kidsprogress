/**
 * Task template system types
 */

// Execution Configs
export interface FormField {
  field_id: string;
  field_type: "text" | "number" | "textarea" | "select" | "checkbox";
  label: string;
  required: boolean;
  options?: string[];
  validation?: Record<string, any>;
}

export interface PassiveFormConfig {
  fields: FormField[];
  allow_photos: boolean;
  allow_notes: boolean;
}

export interface Question {
  question_id: string;
  question_text: string;
  question_type: "multiple_choice" | "true_false" | "short_answer";
  correct_answer: string;
  options?: string[];
  points: number;
  explanation?: string;
}

export interface InteractiveQuizConfig {
  questions?: Question[];
  question_bank_id?: string;
  num_questions: number;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  time_limit_seconds?: number;
  show_feedback: boolean;
}

export interface ContentCreationConfig {
  content_type: "writing" | "drawing" | "recording";
  min_length?: number;
  max_length?: number;
  prompts: string[];
  allow_llm_feedback: boolean;
  save_drafts: boolean;
}

export interface ExternalLinkConfig {
  url: string;
  url_params?: Record<string, string>;
  auto_import_results: boolean;
  import_mapping?: Record<string, string>;
}

export type ExecutionConfig =
  | PassiveFormConfig
  | InteractiveQuizConfig
  | ContentCreationConfig
  | ExternalLinkConfig
  | Record<string, any>; // For extensibility

// LLM Config
export interface LLMConfig {
  enabled: boolean;
  model: string;
  prompt_template?: string;
  temperature: number;
  max_tokens?: number;
}

// Content Provider
export interface ContentProviderRef {
  provider_id: string;
  content_type: string;
  filters: Record<string, any>;
}

// Task Template
export interface TaskTemplate {
  _id: string;
  template_id: string;
  name: string;
  description?: string;
  category_path: string;

  execution_handler: string;
  execution_config: ExecutionConfig;
  execution_llm?: LLMConfig;
  content_provider?: ContentProviderRef;

  analysis_handler: string;
  analysis_config: Record<string, any>;
  analysis_llm?: LLMConfig;

  created_by: string;
  is_public: boolean;
  is_premium?: boolean;

  tags: string[];
  version: number;

  created_at: string;
  updated_at: string;
}

// Task Completion
export interface TaskCompletion {
  _id: string;
  completion_id: string;

  task_id: string;
  child_id: string;
  template_id: string;

  started_at: string;
  completed_at: string;

  measured_data: Record<string, any>;
  detailed_data: Record<string, any>;
  metrics?: Record<string, any>; // Calculated metrics from handler

  attachments: string[];

  llm_analysis?: Record<string, any>;
  llm_analyzed_at?: string;

  created_at: string;
}

// Analysis Report
export interface AnalysisReport {
  _id: string;
  report_id: string;

  child_id: string;
  template_id: string;

  start_date: string;
  end_date: string;

  structured_metrics: Record<string, any>;
  llm_insights?: Record<string, any>;
  charts: Array<Record<string, any>>;

  generated_at: string;
}

// Question Bank
export interface QuestionBank {
  _id: string;
  question_bank_id: string;

  name: string;
  description?: string;

  subject?: string;
  grade_level?: string;
  difficulty?: string;

  questions: Array<Record<string, any>>;

  created_by: string;
  is_public: boolean;

  tags: string[];

  created_at: string;
  updated_at: string;
}

// Request/Response Models
export interface CreateTemplateRequest {
  name: string;
  description?: string;
  category_path: string;

  execution_handler: string;
  execution_config: Record<string, any>;

  execution_llm?: LLMConfig;
  content_provider?: ContentProviderRef;

  analysis_handler?: string;
  analysis_config?: Record<string, any>;
  analysis_llm?: LLMConfig;

  is_public?: boolean;
  tags?: string[];
}

export interface UpdateTemplateRequest {
  name?: string;
  description?: string;
  category_path?: string;

  execution_handler?: string;
  execution_config?: Record<string, any>;

  execution_llm?: LLMConfig;
  content_provider?: ContentProviderRef;

  analysis_handler?: string;
  analysis_config?: Record<string, any>;
  analysis_llm?: LLMConfig;

  is_public?: boolean;
  tags?: string[];
}

export interface PrepareExecutionResponse {
  task_id: string;
  template_id: string;
  execution_data: Record<string, any>;
}

export interface SubmitCompletionRequest {
  child_id: string;
  completion_data: Record<string, any>;
}

export interface SubmitCompletionResponse {
  completion_id: string;
  metrics: Record<string, any>;
  completed_at: string;
}
