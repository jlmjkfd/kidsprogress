/**
 * Addition & Subtraction Task Executor
 * Interactive math practice execution page
 */
import { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { IconCheck, IconX } from '@tabler/icons-react';
import type { TaskExecutorProps } from '../../_shared/types/plugin-interface';
import type { AdditionSubtractionExecution, AdditionSubtractionCompletion, Question } from '../types';
import { Timer } from '../../_shared/components/Timer';
import { useTimer } from '../../_shared/hooks/useTimer';
import { apiClient } from '@/api/client';

export default function TaskExecutor({
  taskId,
  executionData,
  onComplete,
  onCancel,
  setIsComplete,
}: TaskExecutorProps<AdditionSubtractionExecution, AdditionSubtractionCompletion>) {
  const { t } = useTranslation(['tasks', 'common']);
  const queryClient = useQueryClient();

  console.log('\n=== FRONTEND TaskExecutor ===');
  console.log('Received executionData:', executionData);
  console.log('  handler_type:', executionData.handler_type);
  console.log('  questions:', executionData.questions?.length);
  console.log('  answers:', executionData.answers);
  console.log('  total_time_seconds:', executionData.total_time_seconds);
  console.log('  has_timer:', executionData.has_timer);

  const questions = useMemo(() => executionData.questions || [], [executionData.questions]);
  const hasTimer = executionData.has_timer ?? false;

  // Resume from saved progress if available
  const [answers, setAnswers] = useState<Record<string, number>>(
    executionData.answers || {}
  );
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [startTime, setStartTime] = useState(new Date());

  // Use shared timer hook with saved time if resuming
  const { seconds: timerSeconds, pause: pauseTimer, reset: resetTimer } = useTimer({
    autoStart: hasTimer,
    initialSeconds: executionData.total_time_seconds || 0,
  });

  // IMPORTANT: Reset state when questions change (new attempt starts)
  // This handles the case where user submits attempt 1, then immediately starts attempt 2
  // without the component unmounting
  // Create a unique key based on the actual question content (answers), not just IDs
  // Since question IDs are always q1, q2, q3... we need to use the actual numbers
  const questionsKey = useMemo(() => {
    if (questions.length === 0) return '';
    // Use first question's numbers as identifier - if these change, we have new questions
    const firstQ = questions[0];
    return `${firstQ.num1}_${firstQ.operator}_${firstQ.num2}_${firstQ.answer}`;
  }, [questions]);

  // Store the saved answers and timer separately to avoid triggering on object reference changes
  const savedAnswers = useMemo(() => executionData.answers || {}, [executionData.answers]);
  const savedTimer = useMemo(() => executionData.total_time_seconds || 0, [executionData.total_time_seconds]);

  // Track previous questions key to detect when it actually changes
  const prevQuestionsKeyRef = useRef<string>('');

  useEffect(() => {
    // Only reset if questionsKey actually changed (new questions)
    if (questionsKey && questionsKey !== prevQuestionsKeyRef.current) {
      console.log('New questions detected (key changed) - resetting component state');
      console.log('  Previous key:', prevQuestionsKeyRef.current);
      console.log('  New key:', questionsKey);
      console.log('  New answers:', savedAnswers);
      console.log('  New timer:', savedTimer);

      // Update the ref for next comparison
      prevQuestionsKeyRef.current = questionsKey;

      // Reset answers to new execution data
      setAnswers(savedAnswers);

      // Reset submitted/saving states
      setSubmitted(false);
      setIsSubmitting(false);
      setIsSaving(false);

      // Reset start time
      setStartTime(new Date());

      // Reset timer to new value (or 0 for fresh attempt)
      resetTimer(savedTimer);
    }
  }, [questionsKey, savedAnswers, savedTimer, resetTimer]);

  // Auto-save to localStorage every 10 seconds (for browser crash recovery)
  useEffect(() => {
    const saveToLocalStorage = () => {
      if (submitted || isSubmitting) return;

      const progressData = {
        handler_type: 'interactive_math_quiz',  // Required for backend to recognize format
        questions,
        answers,
        has_timer: hasTimer,
        total_time_seconds: timerSeconds,
        saved_at: new Date().toISOString()
      };

      try {
        localStorage.setItem(`task-progress-${taskId}`, JSON.stringify(progressData));
      } catch (error) {
        console.error('Failed to save to localStorage:', error);
      }
    };

    const interval = setInterval(saveToLocalStorage, 10000); // Every 10 seconds

    return () => clearInterval(interval);
  }, [taskId, questions, answers, hasTimer, timerSeconds, submitted, isSubmitting]);

  // Auto-save to database every 60 seconds (for multi-device recovery)
  useEffect(() => {
    const saveToDatabase = async () => {
      if (submitted || isSubmitting) return;

      const progressData = {
        handler_type: 'interactive_math_quiz',  // Required for backend to recognize format
        questions,
        answers,
        has_timer: hasTimer,
        total_time_seconds: timerSeconds,
        saved_at: new Date().toISOString()
      };

      console.log('TaskExecutor auto-saving to database:', progressData);

      try {
        await apiClient.post(`/api/completions/${taskId}/save-progress`, progressData);
        console.log('TaskExecutor auto-save successful');
      } catch (error) {
        console.error('TaskExecutor auto-save failed:', error);
      }
    };

    const interval = setInterval(saveToDatabase, 60000); // Every 60 seconds

    return () => clearInterval(interval);
  }, [taskId, questions, answers, hasTimer, timerSeconds, submitted, isSubmitting]);

  // Clean up localStorage on successful submission
  useEffect(() => {
    if (submitted) {
      localStorage.removeItem(`task-progress-${taskId}`);
    }
  }, [submitted, taskId]);

  const handleAnswerChange = (questionId: string, value: string) => {
    const numValue = value ? parseInt(value, 10) : NaN;
    setAnswers((prev) => ({ ...prev, [questionId]: numValue }));
  };

  const handleSubmit = async () => {
    pauseTimer();
    setSubmitted(true);
    setIsSubmitting(true);

    try {
      const completionData: AdditionSubtractionCompletion = {
        questions,
        answers,
        total_time_seconds: timerSeconds,
        started_at: startTime.toISOString(),
      };

      console.log('Submitting completion:', completionData);
      await onComplete(completionData);

      // Clear saved progress state since attempt is complete
      console.log('Clearing saved progress after successful submission');
      localStorage.removeItem(`task-progress-${taskId}`);

      // Backend already clears progress_state when submission succeeds
      // Invalidate all related queries so UI updates with new completion_count
      await queryClient.invalidateQueries(); // Invalidate ALL queries to ensure cache is fresh
      console.log('Invalidated ALL queries - completion count should update');

      // Task auto-completes after submission
      setIsComplete(true);
    } catch (error) {
      console.error('Submission error:', error);
      alert(t('tasks:submission_error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveAndExit = async () => {
    pauseTimer();
    setIsSaving(true);

    // Save progress to both localStorage and database
    const progressData = {
      handler_type: 'interactive_math_quiz',  // Required for backend to recognize format
      questions,
      answers,
      has_timer: hasTimer,
      total_time_seconds: timerSeconds,
      saved_at: new Date().toISOString()
    };

    console.log('TaskExecutor Save and Exit - saving data:', progressData);
    console.log('  Current answers state:', answers);
    console.log('  Current timer:', timerSeconds);

    try {
      // Save to localStorage (always succeeds for browser recovery)
      localStorage.setItem(`task-progress-${taskId}`, JSON.stringify(progressData));
      console.log('Saved to localStorage');

      // Save to database (for multi-device recovery) - WAIT for this to complete
      const response = await apiClient.post(`/api/completions/${taskId}/save-progress`, progressData);
      console.log('Saved to database, response:', response);

      // Wait a tiny bit more to ensure database write completes
      await new Promise(resolve => setTimeout(resolve, 100));

      // Invalidate queries so the task list refetches with updated progress_state
      await queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      await queryClient.invalidateQueries({ queryKey: ['tasks'] });
      await queryClient.invalidateQueries({ queryKey: ['execution', taskId] });
      await queryClient.invalidateQueries({ queryKey: ['materialized-tasks'] });
      await queryClient.invalidateQueries({ queryKey: ['completion-counts'] });

      console.log('Invalidated queries to force refetch');

    } catch (error) {
      console.error('Failed to save progress:', error);
      // Show error to user but still allow exit
      alert(t('tasks:save_progress_error') || 'Failed to save progress. Your work is saved locally and will be available when you return.');
    } finally {
      setIsSaving(false);
    }

    // Navigate back AFTER save completes and queries are invalidated
    if (onCancel) {
      onCancel();
    } else {
      window.history.back();
    }
  };

  const getResult = (question: Question) => {
    const userAnswer = answers[question.question_id];
    const isCorrect = !isNaN(userAnswer) && userAnswer === question.answer;
    return { isCorrect, userAnswer };
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
            {t('tasks:math_practice')}
          </h1>
          <p className="text-gray-600">
            {t('tasks:math_practice_description')}
          </p>

          {/* Timer */}
          {hasTimer && <Timer seconds={timerSeconds} className="mt-4" />}
        </div>

        {/* Questions */}
        <div className="space-y-4">
          {questions.map((question, index) => {
            const { isCorrect } = getResult(question);

            return (
              <div
                key={question.question_id}
                className="bg-white rounded-lg shadow-sm p-4 md:p-6"
              >
                <div className="flex items-start gap-4">
                  {/* Question Number */}
                  <div className="flex-shrink-0 w-10 h-10 bg-blue-500 text-white rounded-lg flex items-center justify-center font-bold">
                    {index + 1}
                  </div>

                  {/* Question Content */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 text-2xl md:text-3xl font-semibold mb-3">
                      <span>{question.num1}</span>
                      <span className="text-blue-600">{question.operator}</span>
                      <span>{question.num2}</span>
                      <span>=</span>

                      {/* Answer Input */}
                      <input
                        type="number"
                        value={isNaN(answers[question.question_id]) ? '' : answers[question.question_id]}
                        onChange={(e) =>
                          handleAnswerChange(question.question_id, e.target.value)
                        }
                        onWheel={(e) => e.currentTarget.blur()}
                        readOnly={submitted}
                        className={`w-24 md:w-32 px-3 py-2 border-2 rounded-lg text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                          submitted
                            ? isCorrect
                              ? 'border-green-500 bg-green-50'
                              : 'border-red-500 bg-red-50'
                            : 'border-gray-300 focus:border-blue-500 focus:outline-none placeholder:opacity-100 focus:placeholder:opacity-0'
                        }`}
                        placeholder="?"
                      />

                      {/* Result Icon */}
                      {submitted && (
                        <div className="ml-2">
                          {isCorrect ? (
                            <IconCheck className="text-green-600" size={32} />
                          ) : (
                            <IconX className="text-red-600" size={32} />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Show correct answer if wrong */}
                    {submitted && !isCorrect && (
                      <div className="text-sm text-gray-600 mt-2">
                        {t('tasks:correct_answer')}:{' '}
                        <span className="font-semibold text-green-600">
                          {question.answer}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3 sticky bottom-4 bg-white/95 backdrop-blur-sm p-4 rounded-lg shadow-lg">
          {!submitted ? (
            <>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 bg-blue-600 text-white py-3 md:py-4 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg text-base md:text-lg"
              >
                {isSubmitting ? t('tasks:submitting') : t('tasks:submit_answers')}
              </button>
              <button
                onClick={handleSaveAndExit}
                disabled={isSubmitting || isSaving}
                className="sm:flex-1 px-6 py-3 md:py-4 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg text-base md:text-lg"
              >
                {isSaving ? t('common:saving') || 'Saving...' : t('tasks:save_and_exit')}
              </button>
              <button
                onClick={onCancel}
                disabled={isSubmitting}
                className="px-6 py-3 md:py-4 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg text-base md:text-lg"
              >
                {t('common:cancel')}
              </button>
            </>
          ) : (
            <button
              onClick={() => window.history.back()}
              className="flex-1 bg-green-600 text-white py-3 md:py-4 rounded-lg font-semibold hover:bg-green-700 shadow-lg text-base md:text-lg"
            >
              {t('tasks:finish')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
