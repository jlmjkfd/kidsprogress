/**
 * Time Blocks Calendar Page
 */
import { useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconClock,
  IconCalendarEvent,
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react";
import { useTimeBlocks } from "@/api/queries/useTimeBlocks";
import { useDeleteTimeBlock } from "@/api/mutations/useTimeBlockMutations";

export default function TimeBlocksPage() {
  const { childId } = useParams<{ childId: string }>();
  const { t } = useTranslation(["common", "tasks"]);

  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"week" | "month">("week");

  // Calculate date range for current view
  const getDateRange = () => {
    const start = new Date(currentDate);
    const end = new Date(currentDate);

    if (viewMode === "week") {
      // Get start of week (Sunday)
      start.setDate(start.getDate() - start.getDay());
      end.setDate(start.getDate() + 6);
    } else {
      // Get start and end of month
      start.setDate(1);
      end.setMonth(end.getMonth() + 1);
      end.setDate(0);
    }

    return {
      start: start.toISOString().split("T")[0],
      end: end.toISOString().split("T")[0],
    };
  };

  const { start, end } = getDateRange();
  const { data: timeBlocks, isLoading } = useTimeBlocks(childId || "", { start_date: start, end_date: end });
  const deleteTimeBlockMutation = useDeleteTimeBlock();

  const handlePrevious = () => {
    const newDate = new Date(currentDate);
    if (viewMode === "week") {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setMonth(newDate.getMonth() - 1);
    }
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === "week") {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleDelete = async (blockId: string) => {
    if (!confirm(t("tasks:time_block.confirm_delete"))) return;
    await deleteTimeBlockMutation.mutateAsync(blockId);
  };

  const formatDateRange = () => {
    const options: Intl.DateTimeFormatOptions = { month: "long", day: "numeric", year: "numeric" };
    if (viewMode === "week") {
      const startDate = new Date(start);
      const endDate = new Date(end);
      return `${startDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })} - ${endDate.toLocaleDateString(undefined, options)}`;
    } else {
      return currentDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="text-gray-600">{t("common:loading")}</div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            {t("tasks:time_block.title")}
          </h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">
            {t("tasks:time_block.description")}
          </p>
        </div>
        <button
          onClick={() => {/* TODO: Open create modal */}}
          className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors min-h-[44px]"
        >
          <IconPlus size={20} />
          <span>{t("tasks:time_block.create")}</span>
        </button>
      </div>

      {/* Calendar Controls */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevious}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title={t("common:previous")}
            >
              <IconChevronLeft size={20} />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {t("common:today")}
            </button>
            <button
              onClick={handleNext}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title={t("common:next")}
            >
              <IconChevronRight size={20} />
            </button>
            <h2 className="text-lg font-semibold text-gray-900 ml-4">
              {formatDateRange()}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode("week")}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                viewMode === "week"
                  ? "bg-blue-600 text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {t("common:week")}
            </button>
            <button
              onClick={() => setViewMode("month")}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                viewMode === "month"
                  ? "bg-blue-600 text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {t("common:month")}
            </button>
          </div>
        </div>
      </div>

      {/* Time Blocks List */}
      {!timeBlocks || timeBlocks.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <IconCalendarEvent className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {t("tasks:time_block.empty_title")}
          </h3>
          <p className="text-gray-600 mb-6">{t("tasks:time_block.empty_description")}</p>
          <button
            onClick={() => {/* TODO: Open create modal */}}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <IconPlus size={20} />
            <span>{t("tasks:time_block.create_first")}</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {timeBlocks.map((block) => (
            <div
              key={block._id}
              className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="text-sm font-medium text-gray-500">
                      {new Date(block.date).toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <IconClock size={16} />
                      <span>{block.time_slot.start} - {block.time_slot.end}</span>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {block.title}
                  </h3>
                  {block.description && (
                    <p className="text-sm text-gray-600">{block.description}</p>
                  )}
                  {block.day_type && (
                    <div className="mt-2">
                      <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                        {t(`tasks:time_block.day_type_${block.day_type}`)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => {/* TODO: Open edit modal */}}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors min-h-[44px] min-w-[44px]"
                    title={t("common:edit")}
                  >
                    <IconEdit size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(block._id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors min-h-[44px] min-w-[44px]"
                    title={t("common:delete")}
                  >
                    <IconTrash size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
