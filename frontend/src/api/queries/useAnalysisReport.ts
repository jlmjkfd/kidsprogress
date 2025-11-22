/**
 * React Query hook for fetching analysis reports
 */
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../client";

export interface ChartData {
  type: "line" | "bar";
  title: string;
  y_label: string;
  data: Array<{ x: string; y: number }>;
}

export interface AnalysisReport {
  report_id: string;
  child_id: string;
  template_id: string;
  start_date: string;
  end_date: string;
  structured_metrics: Record<string, any>;
  llm_insights?: Record<string, any> | null;
  charts: ChartData[];
  generated_at: string;
}

interface UseAnalysisReportParams {
  templateId: string;
  childId: string;
  startDate?: string;
  endDate?: string;
}

export function useAnalysisReport({
  templateId,
  childId,
  startDate,
  endDate,
}: UseAnalysisReportParams) {
  return useQuery({
    queryKey: ["analysis", templateId, childId, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({ child_id: childId });
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);

      const response = await apiClient.get<AnalysisReport>(
        `/api/analysis/templates/${templateId}/report?${params.toString()}`
      );
      return response.data;
    },
    enabled: !!templateId && !!childId,
  });
}
