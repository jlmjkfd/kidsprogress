import { useTranslation } from "react-i18next";
import { IconCheck, IconX } from "@tabler/icons-react";
import type { AttemptViewProps } from "@/templates/_shared/types/plugin-interface";
import type { AdditionSubtractionDetailedData, AdditionSubtractionMeasuredData, QuestionResult } from "../types";

export default function AttemptView({
  completion,
}: AttemptViewProps<AdditionSubtractionDetailedData, AdditionSubtractionMeasuredData>) {
  const { t } = useTranslation(["tasks"]);

  // Backend stores data as questions array + answers object
  const questions = completion.detailed_data?.questions || [];
  const answers = completion.detailed_data?.answers || {};

  if (questions.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-6 text-center shadow-lg">
        <p className="text-gray-600">{t("tasks:no_data_available")}</p>
      </div>
    );
  }

  // Combine questions with answers to create results for rendering
  const results: QuestionResult[] = questions.map((question) => {
    const userAnswer = answers[question.question_id];
    // Check if answer exists and is not NaN
    const isCorrect = userAnswer !== undefined && !isNaN(userAnswer) && userAnswer === question.answer;
    return {
      question_id: question.question_id,
      num1: question.num1,
      operator: question.operator,
      num2: question.num2,
      correct_answer: question.answer,
      user_answer: userAnswer,
      is_correct: isCorrect,
    };
  });

  // Calculate statistics from results
  const correctCount = results.filter(r => r.is_correct).length;
  const incorrectCount = results.length - correctCount;
  const accuracyPercentage = results.length > 0
    ? Math.round((correctCount / results.length) * 100)
    : 0;

  return (
    <div className="rounded-2xl bg-white p-4 shadow-lg sm:p-6">
      <h3 className="mb-4 text-lg font-bold text-gray-900 sm:text-xl">
        {t("tasks:questions_and_answers")}
      </h3>

      <div className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
        {results.map((result, index) => {
          const isCorrect = result.is_correct;

          return (
            <div
              key={index}
              className={`rounded-xl border-2 p-4 transition-all ${
                isCorrect
                  ? "border-green-300 bg-green-50"
                  : "border-red-300 bg-red-50"
              }`}
            >
              <div className="mb-2 flex items-start justify-between">
                <span className="text-sm font-semibold text-gray-600">
                  {t("tasks:question")} {index + 1}
                </span>
                {isCorrect ? (
                  <IconCheck className="text-green-600" size={24} />
                ) : (
                  <IconX className="text-red-600" size={24} />
                )}
              </div>

              <div className="mb-3">
                <p className="text-2xl font-bold text-gray-900">
                  {result.num1} {result.operator} {result.num2} = ?
                </p>
              </div>

              <div className="space-y-1 text-sm">
                <p className="text-gray-700">
                  <span className="font-semibold">{t("tasks:your_answer")}:</span>{" "}
                  <span className={isCorrect ? "text-green-700" : "text-red-700"}>
                    {result.user_answer ?? t("tasks:no_answer")}
                  </span>
                </p>
                {!isCorrect && (
                  <p className="text-gray-700">
                    <span className="font-semibold">{t("tasks:correct_answer")}:</span>{" "}
                    <span className="text-green-700">{result.correct_answer}</span>
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-6 rounded-xl bg-gradient-to-r from-purple-100 to-blue-100 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-gray-600">{t("tasks:total_questions")}</p>
            <p className="text-2xl font-bold text-gray-900">{results.length}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">{t("tasks:correct")}</p>
            <p className="text-2xl font-bold text-green-600">
              {correctCount}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">{t("tasks:incorrect")}</p>
            <p className="text-2xl font-bold text-red-600">
              {incorrectCount}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">{t("tasks:accuracy")}</p>
            <p className="text-2xl font-bold text-purple-600">
              {accuracyPercentage}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
