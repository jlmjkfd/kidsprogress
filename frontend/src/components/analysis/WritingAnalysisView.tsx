/**
 * WritingAnalysisView - View all writing completions for a template
 * Displays list of writings with scores and allows viewing details
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  IconPencil,
  IconChevronRight,
  IconX,
  IconStar,
  IconCalendar,
} from "@tabler/icons-react";
import { apiClient } from "@/api/client";
import WritingCompletionViewer from "@/components/completions/WritingCompletionViewer";
import type { TaskCompletion } from "@/types/template";

interface WritingAnalysisViewProps {
  templateId: string;
  childId: string;
  templateName?: string;
}

export default function WritingAnalysisView({
  templateId,
  childId,
  templateName,
}: WritingAnalysisViewProps) {
  const { t } = useTranslation(["tasks", "common"]);
  const [selectedCompletion, setSelectedCompletion] = useState<TaskCompletion | null>(null);

  // Fetch completions for this template
  const { data, isLoading, error } = useQuery({
    queryKey: ["completions", templateId, childId],
    queryFn: async () => {
      const response = await apiClient.get("/api/completions", {
        params: {
          template_id: templateId,
          child_id: childId,
          limit: 100,
        },
      });
      return response.data;
    },
  });

  const completions = data?.completions || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        {t("common:error_loading")}
      </div>
    );
  }

  // If viewing a specific completion
  if (selectedCompletion) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setSelectedCompletion(null)}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
        >
          <IconX size={18} />
          <span>{t("tasks:analysis.back_to_list")}</span>
        </button>
        <WritingCompletionViewer completion={selectedCompletion} />
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <IconPencil size={20} className="text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {templateName || t("tasks:analysis.writing_history")}
            </h2>
            <p className="text-sm text-gray-600">
              {t("tasks:analysis.total_submissions", { count: completions.length })}
            </p>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {completions.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <IconPencil size={32} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {t("tasks:analysis.no_writings")}
          </h3>
          <p className="text-gray-600">
            {t("tasks:analysis.no_writings_desc")}
          </p>
        </div>
      ) : (
        /* Writings List */
        <div className="space-y-3">
          {completions.map((completion: TaskCompletion) => {
            const title = (completion.detailed_data?.title as string | undefined) || t("tasks:analysis.untitled");
            const wordCount = (completion.measured_data?.word_count as number | undefined) || 0;
            const overallScore = completion.llm_analysis?.overall_score as number | undefined;
            const completedAt = new Date(completion.completed_at);

            return (
              <button
                key={completion.completion_id}
                onClick={() => setSelectedCompletion(completion)}
                className="w-full bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-md transition-all text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate mb-1">
                      {title}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <IconCalendar size={14} />
                        {completedAt.toLocaleDateString()}
                      </span>
                      <span>
                        {t("tasks:analysis.words", { count: wordCount })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {overallScore !== undefined && (
                      <div className="flex items-center gap-1 px-3 py-1 bg-yellow-50 rounded-full">
                        <IconStar size={16} className="text-yellow-500" />
                        <span className="font-semibold text-yellow-700">
                          {overallScore}/10
                        </span>
                      </div>
                    )}
                    <IconChevronRight size={20} className="text-gray-400" />
                  </div>
                </div>

                {/* Preview of content */}
                <p className="mt-2 text-sm text-gray-500 line-clamp-2">
                  {(completion.detailed_data?.content as string | undefined)?.substring(0, 150)}
                  {((completion.detailed_data?.content as string | undefined)?.length || 0) > 150 && "..."}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
