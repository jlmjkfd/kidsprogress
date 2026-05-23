/**
 * Timezone utilities for handling user's local timezone
 *
 * Automatically detects browser timezone and formats dates appropriately.
 */

/**
 * Get user's current timezone from browser
 *
 * @returns IANA timezone string (e.g., "Pacific/Auckland", "America/New_York")
 * @example
 * getUserTimezone() // "Pacific/Auckland"
 */
export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    console.warn('Failed to detect timezone, using UTC fallback', error);
    return 'UTC';
  }
}

/**
 * Get current local date in user's timezone
 *
 * @returns Date object in browser's local timezone
 */
export function getLocalToday(): Date {
  return new Date();
}

/**
 * Format date for API in YYYY-MM-DD format
 *
 * @param date - Date to format
 * @returns Date string in YYYY-MM-DD format
 * @example
 * formatDateForAPI(new Date(2025, 11, 11)) // "2025-12-11"
 */
export function formatDateForAPI(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format datetime for API in ISO format with local timezone
 *
 * @param date - Date to format
 * @returns ISO datetime string
 * @example
 * formatDateTimeForAPI(new Date(2025, 11, 11, 14, 30))
 * // "2025-12-11T14:30:00" (time in user's local timezone)
 */
export function formatDateTimeForAPI(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

/**
 * Get timezone offset in minutes
 *
 * @returns Offset in minutes (e.g., -780 for NZDT which is UTC+13)
 */
export function getTimezoneOffset(): number {
  return new Date().getTimezoneOffset();
}

/**
 * Get timezone offset as string (e.g., "+13:00")
 *
 * @returns Timezone offset string
 */
export function getTimezoneOffsetString(): string {
  const offset = -getTimezoneOffset(); // Invert because getTimezoneOffset returns negative for positive offsets
  const hours = Math.floor(Math.abs(offset) / 60);
  const minutes = Math.abs(offset) % 60;
  const sign = offset >= 0 ? '+' : '-';

  return `${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Format date to locale-aware date string
 *
 * @param dateString - ISO date string or Date object
 * @returns Formatted date string (e.g., "Dec 11, 2025")
 * @example
 * formatLocalDate("2025-12-11T14:30:00Z") // "Dec 11, 2025" (in user's locale)
 */
export function formatLocalDate(dateString: string | Date, locale: string = 'en-US'): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return date.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format time to locale-aware time string in 12-hour format
 *
 * @param dateString - ISO date string or Date object
 * @param locale - Locale string (e.g., 'en-US', 'zh-CN'). Defaults to 'en-US'
 * @returns Formatted time string (e.g., "2:30 PM")
 * @example
 * formatLocalTime("2025-12-11T14:30:00Z") // "2:30 PM" (converted to user's local timezone)
 * formatLocalTime("2025-12-11T02:30:00Z") // "10:30 AM" (in UTC+8 timezone)
 */
export function formatLocalTime(dateString: string | Date, locale: string = 'en-US'): string {
  // Ensure the string is treated as UTC if it doesn't have timezone info
  let date: Date;
  if (typeof dateString === 'string') {
    // If string doesn't end with Z or timezone offset, assume it's UTC
    if (!dateString.endsWith('Z') && !dateString.match(/[+-]\d{2}:\d{2}$/)) {
      date = new Date(dateString + 'Z');
    } else {
      date = new Date(dateString);
    }
  } else {
    date = dateString;
  }

  // toLocaleTimeString automatically converts to local timezone
  return date.toLocaleTimeString(locale, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true, // Force 12-hour format with AM/PM
  });
}

/**
 * Format date and time together
 *
 * @param dateString - ISO date string or Date object
 * @param locale - Locale string (e.g., 'en-US', 'zh-CN'). Defaults to 'en-US'
 * @returns Formatted datetime string (e.g., "Dec 11, 2025 • 2:30 PM")
 * @example
 * formatLocalDateTime("2025-12-11T14:30:00Z") // "Dec 11, 2025 • 2:30 PM"
 */
export function formatLocalDateTime(dateString: string | Date, locale: string = 'en-US'): string {
  return `${formatLocalDate(dateString, locale)} • ${formatLocalTime(dateString, locale)}`;
}

/**
 * Check if a date is today in local timezone
 *
 * @param dateString - ISO date string (YYYY-MM-DD format)
 * @returns True if the date is today
 * @example
 * isToday("2025-12-11") // true (if today is Dec 11, 2025)
 */
export function isToday(dateString: string): boolean {
  const today = formatDateForAPI(new Date());
  return dateString === today;
}

/**
 * Extract local time in minutes from midnight from an ISO datetime string
 *
 * @param isoString - ISO 8601 datetime string with timezone (e.g., "2025-12-11T14:30:00Z" or "2025-12-11T05:54:07.997+00:00")
 * @returns Minutes from midnight in local timezone (e.g., 870 for 2:30 PM)
 * @example
 * getLocalTimeInMinutes("2025-12-11T14:30:00Z") // Returns local time in minutes
 * // If user is in UTC+8, and input is "2025-12-11T14:30:00+00:00" (2:30 PM UTC)
 * // This would return 1350 (22:30 local time = 22*60 + 30)
 */
export function getLocalTimeInMinutes(isoString: string): number {
  // Ensure the timestamp is treated as UTC if no timezone info is present
  // Backend stores "2025-12-11T05:54:07.997+00:00" but sometimes the +00:00 gets stripped
  let dateString = isoString;

  // If the string doesn't have timezone info (no Z, no +/-XX:XX), append Z to treat as UTC
  if (!dateString.endsWith('Z') && !dateString.match(/[+-]\d{2}:\d{2}$/)) {
    dateString = dateString + 'Z';
  }

  // Parse the UTC timestamp and convert to local time
  const date = new Date(dateString);

  // getHours() and getMinutes() automatically return local timezone values
  // For example: "2025-12-11T05:54:07.997Z" (5:54 AM UTC)
  // In UTC+8 timezone becomes 1:54 PM local = 13:54 = 13*60 + 54 = 834 minutes
  const localHours = date.getHours();
  const localMinutes = date.getMinutes();

  return localHours * 60 + localMinutes;
}

/**
 * Convert UTC datetime string to local date string (YYYY-MM-DD)
 *
 * @param utcDateTimeString - ISO datetime string in UTC (e.g., "2026-01-08T12:45:00Z")
 * @returns Local date string in YYYY-MM-DD format
 * @example
 * // In NZ timezone (UTC+13 in summer):
 * utcToLocalDate("2026-01-08T12:45:00Z") // "2026-01-09" (1:45 AM next day)
 * utcToLocalDate("2026-01-08T10:00:00Z") // "2026-01-08" (11:00 PM same day)
 */
export function utcToLocalDate(utcDateTimeString: string): string {
  // Ensure the timestamp is treated as UTC if no timezone info is present
  let dateString = utcDateTimeString;
  if (!dateString.endsWith('Z') && !dateString.match(/[+-]\d{2}:\d{2}$/)) {
    dateString = dateString + 'Z';
  }

  // Parse UTC timestamp - Date constructor automatically converts to local timezone
  const date = new Date(dateString);

  // Extract local date components
  return formatDateForAPI(date);
}

/**
 * Get local date string in YYYY-MM-DD format
 */
export function getLocalDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// ==================== Floating vs Fixed Time Helpers ====================

/**
 * Get display date for a task (handles both floating and fixed time)
 */
export function getTaskDisplayDate(task: {
  is_floating_time?: boolean;
  scheduled_date?: string;
  scheduled_datetime?: string;
}): string {
  if (task.is_floating_time !== false) {
    // Floating time: scheduled_date is already the correct local date
    return task.scheduled_date || "";
  } else {
    // Fixed time: Convert scheduled_datetime to local date
    if (task.scheduled_datetime) {
      return utcToLocalDate(task.scheduled_datetime);
    }
    return "";
  }
}

/**
 * Get display time for a task (handles both floating and fixed time)
 */
export function getTaskDisplayTime(task: {
  is_floating_time?: boolean;
  scheduled_time?: string;
  scheduled_datetime?: string;
  scheduled_timezone?: string;
  fixed_time_slot?: { start: string; end: string };
}): string {
  if (task.is_floating_time !== false) {
    // Floating time: Use scheduled_time or fixed_time_slot.start
    return task.scheduled_time || task.fixed_time_slot?.start || "";
  } else {
    // Fixed time: Show both local time and origin timezone
    if (task.scheduled_datetime) {
      const localTime = formatLocalTime(task.scheduled_datetime);
      if (task.scheduled_timezone) {
        return `${localTime} (${task.scheduled_timezone})`;
      }
      return localTime;
    }
    return "";
  }
}

/**
 * Get full display datetime string (date + time)
 */
export function getTaskDisplayDateTime(task: {
  is_floating_time?: boolean;
  scheduled_date?: string;
  scheduled_time?: string;
  scheduled_datetime?: string;
  scheduled_timezone?: string;
  fixed_time_slot?: { start: string; end: string };
}): string {
  const date = getTaskDisplayDate(task);
  const time = getTaskDisplayTime(task);

  if (date && time) {
    return `${date} ${time}`;
  } else if (date) {
    return date;
  }
  return "";
}

/**
 * Check if a task is scheduled for today (handles both floating and fixed time)
 */
export function isTaskToday(task: {
  is_floating_time?: boolean;
  scheduled_date?: string;
  scheduled_datetime?: string;
}): boolean {
  const today = getLocalDateString();
  const taskDate = getTaskDisplayDate(task);
  return taskDate === today;
}
