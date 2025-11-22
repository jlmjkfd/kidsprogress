/**
 * Date Utility Functions
 *
 * Centralized date manipulation and formatting utilities to eliminate
 * duplication across the codebase.
 */

/**
 * Get local date string in YYYY-MM-DD format
 *
 * @param date - Date to convert (defaults to current date)
 * @returns Date string in YYYY-MM-DD format
 *
 * @example
 * getLocalDateString() // "2025-11-22"
 * getLocalDateString(new Date('2025-12-25')) // "2025-12-25"
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Extract date portion from ISO datetime string
 *
 * @param isoString - ISO 8601 datetime string
 * @returns Date portion in YYYY-MM-DD format, or undefined if input is undefined
 *
 * @example
 * extractDateFromISO("2025-11-22T10:30:00Z") // "2025-11-22"
 * extractDateFromISO("2025-11-22") // "2025-11-22"
 * extractDateFromISO(undefined) // undefined
 */
export function extractDateFromISO(isoString?: string): string | undefined {
  return isoString?.split('T')[0];
}

/**
 * Get today's date string in YYYY-MM-DD format
 *
 * @returns Today's date in YYYY-MM-DD format
 *
 * @example
 * getTodayString() // "2025-11-22"
 */
export function getTodayString(): string {
  return getLocalDateString(new Date());
}

/**
 * Add days to a date
 *
 * @param date - Starting date
 * @param days - Number of days to add (can be negative)
 * @returns New date with days added
 *
 * @example
 * addDays(new Date('2025-11-22'), 7) // 2025-11-29
 * addDays(new Date('2025-11-22'), -7) // 2025-11-15
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Get date string N days from today
 *
 * @param days - Number of days to add to today (can be negative)
 * @returns Date string in YYYY-MM-DD format
 *
 * @example
 * getDateStringDaysFromNow(7) // "2025-11-29" (7 days from today)
 * getDateStringDaysFromNow(-30) // "2025-10-23" (30 days ago)
 */
export function getDateStringDaysFromNow(days: number): string {
  return getLocalDateString(addDays(new Date(), days));
}

/**
 * Parse YYYY-MM-DD string to Date object
 *
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Date object
 *
 * @example
 * parseDateString("2025-11-22") // Date object for 2025-11-22
 */
export function parseDateString(dateString: string): Date {
  return new Date(dateString + 'T00:00:00');
}

/**
 * Check if a date is today
 *
 * @param date - Date to check (string or Date object)
 * @returns True if the date is today
 *
 * @example
 * isToday("2025-11-22") // true if today is 2025-11-22
 * isToday(new Date()) // true
 */
export function isToday(date: string | Date): boolean {
  const dateString = typeof date === 'string' ? date : getLocalDateString(date);
  return dateString === getTodayString();
}

/**
 * Compare two dates (ignoring time)
 *
 * @param date1 - First date (string or Date)
 * @param date2 - Second date (string or Date)
 * @returns -1 if date1 < date2, 0 if equal, 1 if date1 > date2
 *
 * @example
 * compareDates("2025-11-22", "2025-11-23") // -1
 * compareDates("2025-11-22", "2025-11-22") // 0
 */
export function compareDates(date1: string | Date, date2: string | Date): number {
  const str1 = typeof date1 === 'string' ? date1 : getLocalDateString(date1);
  const str2 = typeof date2 === 'string' ? date2 : getLocalDateString(date2);

  if (str1 < str2) return -1;
  if (str1 > str2) return 1;
  return 0;
}

/**
 * Get start of week (Monday)
 *
 * @param date - Date to get week start for
 * @returns Date object for start of week
 *
 * @example
 * getWeekStart(new Date('2025-11-22')) // Monday of that week
 */
export function getWeekStart(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Adjust to Monday
  result.setDate(result.getDate() + diff);
  return result;
}

/**
 * Get end of week (Sunday)
 *
 * @param date - Date to get week end for
 * @returns Date object for end of week
 *
 * @example
 * getWeekEnd(new Date('2025-11-22')) // Sunday of that week
 */
export function getWeekEnd(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  const diff = day === 0 ? 0 : 7 - day; // Adjust to Sunday
  result.setDate(result.getDate() + diff);
  return result;
}
