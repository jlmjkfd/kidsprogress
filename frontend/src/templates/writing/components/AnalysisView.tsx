/**
 * Writing AnalysisView - Progress and feedback for writing tasks
 */
import { useMemo } from "react";
import { IconStar, IconPencil, IconCalendar } from "@tabler/icons-react";
import type { AnalysisViewProps } from "@/templates/_shared/types/plugin-interface";
import type { WritingDetailedData, WritingMeasuredData } from '../types';

export default function AnalysisView({
  completions,
}: AnalysisViewProps<WritingDetailedData, WritingMeasuredData>) {
  const stats = useMemo(() => {
    const totalWritings = completions.length;
    const totalWords = completions.reduce(
      (sum, c) => sum + (c.measured_data?.word_count || 0),
      0
    );
    const avgWords = totalWritings > 0 ? Math.round(totalWords / totalWritings) : 0;

    const writingsWithAI = completions.filter(c => c.llm_analysis);
    const avgScore = writingsWithAI.length > 0
      ? writingsWithAI.reduce((sum, c) => sum + (c.llm_analysis?.overall_score || 0), 0) / writingsWithAI.length
      : 0;

    return {
      totalWritings,
      totalWords,
      avgWords,
      avgScore: Math.round(avgScore * 10) / 10,
      aiCount: writingsWithAI.length,
    };
  }, [completions]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Writing Progress</h2>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center gap-2 text-purple-600 mb-1">
            <IconPencil size={20} />
            <span className="text-sm font-medium">Total Writings</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.totalWritings}</div>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <IconPencil size={20} />
            <span className="text-sm font-medium">Total Words</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.totalWords.toLocaleString()}</div>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-600 mb-1">
            <IconPencil size={20} />
            <span className="text-sm font-medium">Avg Words</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.avgWords}</div>
        </div>

        {stats.aiCount > 0 && (
          <div className="bg-white border rounded-lg p-4">
            <div className="flex items-center gap-2 text-yellow-600 mb-1">
              <IconStar size={20} />
              <span className="text-sm font-medium">Avg AI Score</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.avgScore}/10</div>
          </div>
        )}
      </div>

      {/* Recent Writings */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Recent Writings</h3>
        <div className="space-y-3">
          {completions.slice(0, 10).map((completion, idx) => {
            const title = completion.detailed_data?.title || "Untitled";
            const wordCount = completion.measured_data?.word_count || 0;
            const aiScore = completion.llm_analysis?.overall_score;
            const date = new Date(completion.completed_at).toLocaleDateString();

            return (
              <div
                key={completion.completion_id || idx}
                className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-1">{title}</h4>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <IconPencil size={14} />
                        {wordCount} words
                      </span>
                      <span className="flex items-center gap-1">
                        <IconCalendar size={14} />
                        {date}
                      </span>
                      {aiScore && (
                        <span className="flex items-center gap-1 text-yellow-600">
                          <IconStar size={14} className="fill-yellow-500" />
                          {aiScore}/10
                        </span>
                      )}
                    </div>

                    {/* AI Feedback Summary */}
                    {completion.llm_analysis?.feedback_summary && (
                      <p className="text-sm text-gray-600 mt-2 italic">
                        "{completion.llm_analysis.feedback_summary}"
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {completions.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No writings completed yet
          </div>
        )}
      </div>
    </div>
  );
}
