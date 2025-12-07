/**
 * Addition & Subtraction Task Executor
 * Interactive math practice execution page
 */
import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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

  const questions = useMemo(() => executionData.questions || [], [executionData.questions]);
  const hasTimer = executionData.has_timer ?? false;

  // Resume from saved progress if available
  const [answers, setAnswers] = useState<Record<string, number>>(
    executionData.answers || {}
  );
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startTime] = useState(new Date());

  // Use shared timer hook
  const { seconds: timerSeconds, pause: pauseTimer } = useTimer({
    autoStart: hasTimer,
  });

  // Auto-save progress every 30 seconds
  useEffect(() => {
    const saveProgress = async () => {
      if (submitted || isSubmitting) return; // Don't save if already submitted

      try {
        await apiClient.post(`/api/completions/${taskId}/save-progress`, {
          answers,
          total_time_seconds: timerSeconds,
          saved_at: new Date().toISOString()
        });
      } catch (error) {
        console.error('Failed to save progress:', error);
      }
    };

    const interval = setInterval(saveProgress, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [taskId, answers, timerSeconds, submitted, isSubmitting]);

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

      await onComplete(completionData);

      // Task auto-completes after submission
      setIsComplete(true);
    } catch (error) {
      console.error('Submission error:', error);
      alert(t('tasks:submission_error'));
    } finally {
      setIsSubmitting(false);
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
                        readOnly={submitted}
                        className={`w-24 md:w-32 px-3 py-2 border-2 rounded-lg text-center ${
                          submitted
                            ? isCorrect
                              ? 'border-green-500 bg-green-50'
                              : 'border-red-500 bg-red-50'
                            : 'border-gray-300 focus:border-blue-500 focus:outline-none'
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
        <div className="mt-6 flex gap-3 sticky bottom-4">
          {!submitted ? (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 bg-blue-600 text-white py-3 md:py-4 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg text-base md:text-lg"
            >
              {isSubmitting ? t('tasks:submitting') : t('tasks:submit_answers')}
            </button>
          ) : (
            <button
              onClick={() => window.history.back()}
              className="flex-1 bg-green-600 text-white py-3 md:py-4 rounded-lg font-semibold hover:bg-green-700 shadow-lg text-base md:text-lg"
            >
              {t('tasks:finish')}
            </button>
          )}

          {!submitted && (
            <button
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-6 py-3 md:py-4 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg text-base md:text-lg"
            >
              {t('common:cancel')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
