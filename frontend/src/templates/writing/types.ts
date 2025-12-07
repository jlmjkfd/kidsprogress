/**
 * Type definitions for Writing template
 * All types are strictly defined to avoid 'any'
 */

/**
 * Content type for writing tasks
 */
export type ContentType = 'writing' | 'drawing' | 'recording';

/**
 * Configuration for writing template
 */
export interface WritingConfig {
  /** Type of content to create */
  content_type: ContentType;
  /** Writing prompts to guide the child */
  prompts: string[];
  /** Minimum word count required */
  min_length: number;
  /** Maximum word count allowed */
  max_length: number;
  /** Enable AI feedback on writing quality */
  allow_llm_feedback: boolean;
  /** Allow saving drafts before final submission */
  save_drafts: boolean;
}

/**
 * Execution data from backend prepare_execution()
 */
export interface WritingExecution {
  handler_type: 'writing';
  content_type: ContentType;
  prompts: string[];
  min_length: number;
  max_length: number;
}

/**
 * Completion data submitted to backend
 */
export interface WritingCompletion {
  title: string;
  content: string;
  started_at: string;
  content_type: ContentType;
  prompts_used?: string[];
}

/**
 * Detailed data stored in completion
 */
export interface WritingDetailedData {
  title: string;
  content: string;
  prompts_used?: string[];
  started_at: string;
  content_type: ContentType;
}

/**
 * Measured data (calculated metrics)
 */
export interface WritingMeasuredData {
  word_count: number;
  character_count: number;
  paragraph_count?: number;
  sentence_count?: number;
}

/**
 * LLM Analysis data
 */
export interface WritingLLMAnalysis {
  /** Overall score (0-10) */
  overall_score?: number;
  /** Brief feedback summary */
  feedback_summary?: string;
  /** List of writing strengths */
  strengths?: string[];
  /** Areas for improvement */
  improvements?: string[];
  /** Notable phrases or sentences */
  highlighted_phrases?: string[];
  /** Detailed scores */
  scores?: {
    grammar?: number;
    creativity?: number;
    structure?: number;
    relevance?: number;
  };
}

/**
 * Type guard to check if data is WritingDetailedData
 */
export function isWritingDetailedData(
  data: unknown
): data is WritingDetailedData {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.title === 'string' &&
    typeof d.content === 'string' &&
    typeof d.started_at === 'string' &&
    typeof d.content_type === 'string' &&
    ['writing', 'drawing', 'recording'].includes(d.content_type as string)
  );
}

/**
 * Type guard to check if data is WritingMeasuredData
 */
export function isWritingMeasuredData(
  data: unknown
): data is WritingMeasuredData {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.word_count === 'number' &&
    typeof d.character_count === 'number'
  );
}

/**
 * Type guard to check if data is WritingLLMAnalysis
 */
export function isWritingLLMAnalysis(
  data: unknown
): data is WritingLLMAnalysis {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as Record<string, unknown>;
  // LLM analysis is optional, so we just check it's an object if present
  return true;
}
