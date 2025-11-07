/**
 * Task status badge component with color coding
 */
import { TaskStatus } from "@/types/task";
import {
  IconFileText,
  IconCalendar,
  IconPlayerPlay,
  IconPlayerPause,
  IconCircleCheck,
  IconX,
  IconArchive,
} from "@tabler/icons-react";

interface TaskStatusBadgeProps {
  status: TaskStatus;
  size?: "sm" | "md" | "lg";
}

const statusConfig = {
  [TaskStatus.DRAFT]: {
    label: "Draft",
    className: "bg-gray-100 text-gray-700 border-gray-300",
    Icon: IconFileText,
  },
  [TaskStatus.SCHEDULED]: {
    label: "Scheduled",
    className: "bg-blue-100 text-blue-700 border-blue-300",
    Icon: IconCalendar,
  },
  [TaskStatus.IN_PROGRESS]: {
    label: "In Progress",
    className: "bg-green-100 text-green-700 border-green-300",
    Icon: IconPlayerPlay,
  },
  [TaskStatus.PAUSED]: {
    label: "Paused",
    className: "bg-yellow-100 text-yellow-700 border-yellow-300",
    Icon: IconPlayerPause,
  },
  [TaskStatus.COMPLETED]: {
    label: "Completed",
    className: "bg-purple-100 text-purple-700 border-purple-300",
    Icon: IconCircleCheck,
  },
  [TaskStatus.CANCELLED]: {
    label: "Cancelled",
    className: "bg-red-100 text-red-700 border-red-300",
    Icon: IconX,
  },
  [TaskStatus.ARCHIVED]: {
    label: "Archived",
    className: "bg-gray-100 text-gray-500 border-gray-300",
    Icon: IconArchive,
  },
};

const sizeConfig = {
  sm: { text: "text-xs px-2 py-0.5", icon: 14 },
  md: { text: "text-sm px-3 py-1", icon: 16 },
  lg: { text: "text-base px-4 py-1.5", icon: 18 },
};

export default function TaskStatusBadge({ status, size = "md" }: TaskStatusBadgeProps) {
  const config = statusConfig[status];
  const sizes = sizeConfig[size];
  const Icon = config.Icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${config.className} ${sizes.text}`}
    >
      <Icon size={sizes.icon} stroke={2} />
      <span>{config.label}</span>
    </span>
  );
}
