/**
 * Template Plugin Interface
 *
 * Defines the contract that all template plugins must implement.
 * Uses generics to provide type safety while maintaining framework flexibility.
 */

import type { TaskTemplate } from '@/types/template';

/**
 * Plugin metadata from manifest.json
 */
export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  handlerType: string;
  description: string;
  author?: string;
  tags?: string[];
}

/**
 * JSON Schema for validation
 */
export interface JSONSchema {
  type: string;
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface JSONSchemaProperty {
  type: string;
  description?: string;
  minimum?: number;
  maximum?: number;
  enum?: string[];
  items?: JSONSchemaProperty;
  default?: unknown;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Settings Editor Component Props
 *
 * Parent sees this in task creation modal to configure template-specific settings.
 * @template TConfig - Template-specific configuration type
 */
export interface SettingsEditorProps<TConfig = unknown> {
  config: TConfig;
  onChange: (config: TConfig) => void;
  template: TaskTemplate;
}

/**
 * Task Executor Component Props
 *
 * Child sees this page to complete the task.
 * @template TExecution - Template-specific execution data type
 * @template TCompletion - Template-specific completion data type
 */
export interface TaskExecutorProps<TExecution = unknown, TCompletion = unknown> {
  taskId: string;
  executionData: TExecution;
  onComplete: (data: TCompletion) => Promise<void>;
  onCancel: () => void;

  /**
   * Plugin calls setIsComplete(true) when task should auto-complete.
   * Host system will automatically mark task as completed.
   */
  setIsComplete: (completed: boolean) => void;

  /**
   * Save current progress without completing the task.
   * Plugin should call this with partial data to enable resume later.
   */
  onSaveProgress?: (data: Partial<TCompletion>) => Promise<void>;

  /**
   * Previously saved progress data (if any).
   * Plugin should initialize state from this when resuming.
   */
  savedProgress?: Partial<TCompletion>;
}

/**
 * Analysis View Component Props
 *
 * Parent sees this to view task analysis and insights.
 * @template TDetailedData - Template-specific detailed data type
 * @template TMeasuredData - Template-specific measured data type
 */
export interface AnalysisViewProps<TDetailedData = unknown, TMeasuredData = unknown> {
  templateId: string;
  childId: string;
  completions: TaskCompletion<TDetailedData, TMeasuredData>[];
}

/**
 * Attempt View Component Props
 *
 * Shows detailed view of a single task completion/attempt.
 * @template TDetailedData - Template-specific detailed data type
 * @template TMeasuredData - Template-specific measured data type
 */
export interface AttemptViewProps<TDetailedData = unknown, TMeasuredData = unknown> {
  completion: TaskCompletion<TDetailedData, TMeasuredData>;
}

/**
 * LLM Analysis structure (optional for templates)
 */
export interface LLMAnalysis {
  overall_score?: number;
  feedback_summary?: string;
  [key: string]: unknown;
}

/**
 * Task Completion with generic types
 * @template TDetailedData - Template-specific detailed data type
 * @template TMeasuredData - Template-specific measured data type
 */
export interface TaskCompletion<TDetailedData = unknown, TMeasuredData = unknown> {
  completion_id: string;
  task_id: string;
  child_id: string;
  template_id?: string;
  completed_at: string;
  started_at: string;
  detailed_data: TDetailedData;
  measured_data?: TMeasuredData;
  llm_analysis?: LLMAnalysis;
  attachments?: string[];
}

/**
 * Plugin lifecycle hooks (optional)
 * @template TConfig - Template-specific configuration type
 */
export interface PluginHooks<TConfig = unknown> {
  /**
   * Called when task is created from this template
   */
  onTaskCreate?: (config: TConfig) => Promise<void>;

  /**
   * Called when task is completed
   */
  onTaskComplete?: <TDetailedData, TMeasuredData>(
    completion: TaskCompletion<TDetailedData, TMeasuredData>
  ) => Promise<void>;

  /**
   * Validate config before saving
   */
  validateConfig?: (config: TConfig) => ValidationResult;
}

/**
 * i18n Resources for template
 */
export interface TemplateI18nResources {
  en: Record<string, unknown>;
  zh: Record<string, unknown>;
  // Add more languages as needed
}

/**
 * Complete Template Plugin Definition
 *
 * Every template must export an object implementing this interface.
 * @template TConfig - Template-specific configuration type
 * @template TExecution - Template-specific execution data type
 * @template TCompletion - Template-specific completion submission type
 * @template TDetailedData - Template-specific detailed data storage type
 * @template TMeasuredData - Template-specific measured data type
 */
export interface TemplatePlugin<
  TConfig = unknown,
  TExecution = unknown,
  TCompletion = unknown,
  TDetailedData = unknown,
  TMeasuredData = unknown
> {
  // Metadata
  id: string;
  name: string;
  version: string;
  handlerType: string;
  description: string;
  author?: string;
  tags?: string[];

  // Required components
  components: {
    SettingsEditor: React.ComponentType<SettingsEditorProps<TConfig>>;
    TaskExecutor: React.ComponentType<TaskExecutorProps<TExecution, TCompletion>>;
    AnalysisView: React.ComponentType<AnalysisViewProps<TDetailedData, TMeasuredData>>;
    AttemptView: React.ComponentType<AttemptViewProps<TDetailedData, TMeasuredData>>;
  };

  // Configuration schema
  configSchema: JSONSchema;
  defaultConfig: TConfig;

  // i18n resources (namespace will be template-{id})
  i18n?: TemplateI18nResources;

  // Optional lifecycle hooks
  hooks?: PluginHooks<TConfig>;
}
