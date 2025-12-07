/**
 * Type definitions for Addition & Subtraction template
 * All types are strictly defined to avoid 'any'
 */

/**
 * Configuration for addition-subtraction template
 */
export interface AdditionSubtractionConfig {
  /** Maximum number value in questions (10-10000) */
  max_value: number;
  /** Number of questions to generate (1-100) */
  num_questions: number;
  /** Only generate questions requiring carry/borrow */
  only_carry: boolean;
  /** Enable timer during practice */
  has_timer: boolean;
}

/**
 * Question structure
 */
export interface Question {
  question_id: string;
  num1: number;
  operator: '+' | '-';
  num2: number;
  answer: number;
}

/**
 * Execution data from backend prepare_execution()
 */
export interface AdditionSubtractionExecution {
  handler_type: 'addition-subtraction';
  questions: Question[];
  has_timer: boolean;
  /** Optional: for resume functionality */
  answers?: Record<string, number>;
}

/**
 * Completion data submitted to backend
 */
export interface AdditionSubtractionCompletion {
  questions: Question[];
  answers: Record<string, number>;
  total_time_seconds: number;
  started_at: string;
}

/**
 * Detailed data stored in completion
 */
export interface AdditionSubtractionDetailedData {
  questions: Question[];
  answers: Record<string, number>;
  total_time_seconds: number;
  started_at: string;
}

/**
 * Measured data (calculated metrics)
 */
export interface AdditionSubtractionMeasuredData {
  correct_count: number;
  incorrect_count: number;
  accuracy: number;
  average_time_per_question?: number;
}

/**
 * Result for a single question (used in UI)
 */
export interface QuestionResult {
  question_id: string;
  num1: number;
  operator: '+' | '-';
  num2: number;
  correct_answer: number;
  user_answer?: number;
  is_correct: boolean;
}

/**
 * Type guard to check if data is AdditionSubtractionDetailedData
 */
export function isAdditionSubtractionDetailedData(
  data: unknown
): data is AdditionSubtractionDetailedData {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as Record<string, unknown>;
  return (
    Array.isArray(d.questions) &&
    typeof d.answers === 'object' &&
    d.answers !== null &&
    typeof d.total_time_seconds === 'number' &&
    typeof d.started_at === 'string'
  );
}

/**
 * Type guard to check if data is AdditionSubtractionMeasuredData
 */
export function isAdditionSubtractionMeasuredData(
  data: unknown
): data is AdditionSubtractionMeasuredData {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.correct_count === 'number' &&
    typeof d.incorrect_count === 'number' &&
    typeof d.accuracy === 'number'
  );
}
