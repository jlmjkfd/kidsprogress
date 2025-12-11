/**
 * Addition & Subtraction Analysis View
 * Custom analysis page for math practice progress
 */
import { useMemo } from 'react';
import type { AnalysisViewProps } from '../../_shared/types/plugin-interface';
import type { AdditionSubtractionDetailedData, AdditionSubtractionMeasuredData } from '../types';
import { formatLocalDate } from '@/utils/timezone';

export default function AnalysisView({
  completions,
}: AnalysisViewProps<AdditionSubtractionDetailedData, AdditionSubtractionMeasuredData>) {
  const stats = useMemo(() => {
    if (!completions || completions.length === 0) {
      return null;
    }

    const totalQuestions = completions.reduce(
      (sum, c) => sum + (c.detailed_data?.questions?.length || 0),
      0
    );
    const totalCorrect = completions.reduce(
      (sum, c) => sum + (c.measured_data?.correct_count || 0),
      0
    );
    const avgAccuracy =
      completions.reduce((sum, c) => sum + (c.measured_data?.accuracy || 0), 0) /
      completions.length;
    const avgTime =
      completions.reduce((sum, c) => sum + (c.measured_data?.average_time_per_question || 0), 0) /
      completions.length;

    return {
      totalAttempts: completions.length,
      totalQuestions,
      totalCorrect,
      avgAccuracy,
      avgTime,
    };
  }, [completions]);

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No practice data yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Math Practice Progress</h2>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="text-sm text-gray-600 mb-1">Total Attempts</div>
          <div className="text-3xl font-bold text-blue-600">{stats.totalAttempts}</div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="text-sm text-gray-600 mb-1">Questions Answered</div>
          <div className="text-3xl font-bold text-purple-600">{stats.totalQuestions}</div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="text-sm text-gray-600 mb-1">Average Accuracy</div>
          <div className="text-3xl font-bold text-green-600">
            {stats.avgAccuracy.toFixed(1)}%
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="text-sm text-gray-600 mb-1">Avg Time/Question</div>
          <div className="text-3xl font-bold text-orange-600">
            {stats.avgTime.toFixed(1)}s
          </div>
        </div>
      </div>

      {/* Recent Sessions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Sessions</h3>
        <div className="space-y-3">
          {completions.slice(0, 10).map((completion, index) => (
            <div
              key={completion.completion_id}
              className="flex items-center justify-between py-3 border-b last:border-b-0"
            >
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">
                  Session {completions.length - index}
                </div>
                <div className="text-xs text-gray-500">
                  {formatLocalDate(completion.completed_at)}
                </div>
              </div>
              <div className="flex gap-4">
                <div className="text-sm">
                  <span className="font-medium text-green-600">
                    {completion.measured_data?.correct_count || 0}
                  </span>
                  /{completion.detailed_data?.questions?.length || 0}
                </div>
                <div className="text-sm font-medium text-blue-600">
                  {completion.measured_data?.accuracy?.toFixed(1)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
