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
export function formatLocalDate(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format time to locale-aware time string in 12-hour format
 *
 * @param dateString - ISO date string or Date object
 * @returns Formatted time string (e.g., "2:30 PM")
 * @example
 * formatLocalTime("2025-12-11T14:30:00Z") // "2:30 PM" (converted to user's local timezone)
 * formatLocalTime("2025-12-11T02:30:00Z") // "10:30 AM" (in UTC+8 timezone)
 */
export function formatLocalTime(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;

  // toLocaleTimeString automatically converts UTC to local timezone
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true, // Force 12-hour format with AM/PM
  });
}

/**
 * Format date and time together
 *
 * @param dateString - ISO date string or Date object
 * @returns Formatted datetime string (e.g., "Dec 11, 2025 • 2:30 PM")
 * @example
 * formatLocalDateTime("2025-12-11T14:30:00Z") // "Dec 11, 2025 • 2:30 PM"
 */
export function formatLocalDateTime(dateString: string | Date): string {
  return `${formatLocalDate(dateString)} • ${formatLocalTime(dateString)}`;
}
