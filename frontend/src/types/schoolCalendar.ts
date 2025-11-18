/**
 * School Calendar Types
 * Manages school terms, holidays, and special days
 */

export type DayType = "school_day" | "weekend" | "holiday" | "special_school_day";

export interface Term {
  _id: string;
  child_id: string;
  name: string; // e.g., "Fall 2024", "Spring 2025"
  start_date: string; // ISO date string
  end_date: string;
  school_weekdays: number[]; // 0=Monday, 6=Sunday
  is_active: boolean;
}

export interface TermCreate {
  child_id: string;
  name: string;
  start_date: string;
  end_date: string;
  school_weekdays: number[];
}

export interface TermUpdate {
  name?: string;
  start_date?: string;
  end_date?: string;
  school_weekdays?: number[];
  is_active?: boolean;
}

export interface SpecialDay {
  _id: string;
  child_id: string;
  date: string; // ISO date string
  day_type: "holiday" | "special_school_day";
  name: string;
  description?: string;
}

export interface SpecialDayCreate {
  child_id: string;
  date: string;
  day_type: "holiday" | "special_school_day";
  name: string;
  description?: string;
}

export interface SpecialDayUpdate {
  date?: string;
  day_type?: "holiday" | "special_school_day";
  name?: string;
  description?: string;
}

export interface DayTypeResponse {
  date: string;
  day_type: DayType;
  reason?: string; // Term name or special day name
}

// Helper to get weekday name
export const WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// Helper to get day type display info
export function getDayTypeDisplay(dayType: DayType): { label: string; color: string; bgColor: string } {
  switch (dayType) {
    case "school_day":
      return { label: "School Day", color: "text-blue-700", bgColor: "bg-blue-50" };
    case "weekend":
      return { label: "Weekend", color: "text-gray-700", bgColor: "bg-gray-50" };
    case "holiday":
      return { label: "Holiday", color: "text-green-700", bgColor: "bg-green-50" };
    case "special_school_day":
      return { label: "Special School Day", color: "text-purple-700", bgColor: "bg-purple-50" };
  }
}
