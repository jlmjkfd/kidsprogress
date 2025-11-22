/**
 * Analysis Report Page - Shows template-based completion analysis
 */
import { useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  IconArrowLeft,
  IconCalendar,
  IconTrendingUp,
  IconChartLine,
  IconAlertCircle,
} from "@tabler/icons-react";
import { useAnalysisReport } from "@/api/queries/useAnalysisReport";
import LoadingSpinner from "@/components/LoadingSpinner";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function AnalysisReportPage() {
  const { templateId, childId } = useParams<{ templateId: string; childId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation(["common", "tasks"]);

  // Support both URL param (new) and query string (legacy)
  const actualChildId = childId || searchParams.get("childId");
  const [dateRange] = useState({
    start: searchParams.get("startDate") || "",
    end: searchParams.get("endDate") || "",
  });

  const { data: report, isLoading, error } = useAnalysisReport({
    templateId: templateId!,
    childId: actualChildId!,
    startDate: dateRange.start,
    endDate: dateRange.end,
  });

  if (!templateId || !actualChildId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <IconAlertCircle className="mx-auto mb-4 text-red-500" size={48} />
          <p className="text-gray-600">{t("common:error.missingParameters")}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <LoadingSpinner fullScreen size="lg" />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <IconAlertCircle className="mx-auto mb-4 text-red-500" size={48} />
          <p className="text-gray-600">{t("common:error.loadFailed")}</p>
        </div>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString();
  };

  const formatChartDate = (dateStr: string) => {
    const date = new Date(dateStr.endsWith("Z") ? dateStr : dateStr + "Z");
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <IconArrowLeft size={24} />
            </button>
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                {t("tasks:analysis.title")}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                <IconCalendar size={16} className="inline mr-1" />
                {report && formatDate(report.start_date)} - {report && formatDate(report.end_date)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Key Metrics */}
        {report && Object.keys(report.structured_metrics).length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center gap-2 mb-4">
              <IconTrendingUp className="text-primary-600" size={24} />
              <h2 className="text-lg font-semibold text-gray-900">
                {t("tasks:analysis.keyMetrics")}
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(report.structured_metrics).map(([key, value]) => (
                <div key={key} className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">
                    {key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {typeof value === "number" ? value.toFixed(1) : value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LLM Insights */}
        {report?.llm_insights && (
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg shadow-sm border border-purple-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg">
                <IconTrendingUp className="text-white" size={20} />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">
                {t("tasks:analysis.aiInsights")}
              </h2>
            </div>
            <div className="prose prose-sm max-w-none text-gray-700">
              {JSON.stringify(report.llm_insights, null, 2)}
            </div>
          </div>
        )}

        {/* Charts */}
        {report && report.charts.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center gap-2 mb-6">
              <IconChartLine className="text-primary-600" size={24} />
              <h2 className="text-lg font-semibold text-gray-900">
                {t("tasks:analysis.charts")}
              </h2>
            </div>
            <div className="space-y-8">
              {report.charts.map((chart, index) => (
                <div key={index} className="border-t pt-6 first:border-t-0 first:pt-0">
                  <h3 className="text-md font-medium text-gray-800 mb-4">{chart.title}</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    {chart.type === "line" ? (
                      <LineChart data={chart.data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="x"
                          tickFormatter={formatChartDate}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis label={{ value: chart.y_label, angle: -90, position: "insideLeft" }} />
                        <Tooltip
                          labelFormatter={(value) => formatDate(value as string)}
                        />
                        <Line type="monotone" dataKey="y" stroke="#8b5cf6" strokeWidth={2} />
                      </LineChart>
                    ) : (
                      <BarChart data={chart.data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="x" />
                        <YAxis label={{ value: chart.y_label, angle: -90, position: "insideLeft" }} />
                        <Tooltip />
                        <Bar dataKey="y" fill="#8b5cf6" />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {report && report.charts.length === 0 && Object.keys(report.structured_metrics).length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
            <IconChartLine className="mx-auto mb-4 text-gray-400" size={64} />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {t("tasks:analysis.noData")}
            </h3>
            <p className="text-gray-600">
              {t("tasks:analysis.noDataDescription")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
