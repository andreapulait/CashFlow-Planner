/**
 * Utility functions for converting between dates and monthly offsets
 */

/**
 * Calculate the monthly offset from a reference date (T0) to a target date
 * @param dataInizio - Reference date (T0)
 * @param dataTarget - Target date
 * @returns Number of months from dataInizio to dataTarget (can be negative)
 */
export function dateToMonthOffset(dataInizio: Date, dataTarget: Date): number {
  const yearDiff = dataTarget.getFullYear() - dataInizio.getFullYear();
  const monthDiff = dataTarget.getMonth() - dataInizio.getMonth();
  return yearDiff * 12 + monthDiff;
}

/**
 * Calculate a date by adding a monthly offset to a reference date
 * @param dataInizio - Reference date (T0)
 * @param offset - Number of months to add (can be negative)
 * @returns Date at the specified offset
 */
export function monthOffsetToDate(dataInizio: Date, offset: number): Date {
  const result = new Date(dataInizio);
  result.setMonth(result.getMonth() + offset);
  return result;
}

/**
 * Get the reference date (T0) for a user, defaulting to current date if not set
 * @param dataInizio - User's configured T0 date (nullable)
 * @returns Reference date
 */
export function getReferenceDate(dataInizio: Date | null | undefined): Date {
  if (dataInizio) {
    return new Date(dataInizio);
  }
  // Default to first day of current month
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

/**
 * Format a date for display in the UI
 * @param date - Date to format
 * @param locale - Locale for formatting (default: 'it-IT')
 * @returns Formatted date string (e.g., "Gennaio 2025")
 */
export function formatMonthYear(date: Date, locale: string = 'it-IT'): string {
  return date.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
}

/**
 * Format a date for display in short format
 * @param date - Date to format
 * @param locale - Locale for formatting (default: 'it-IT')
 * @returns Formatted date string (e.g., "Gen 2025")
 */
export function formatMonthYearShort(date: Date, locale: string = 'it-IT'): string {
  return date.toLocaleDateString(locale, { month: 'short', year: 'numeric' });
}

/**
 * Get the first day of a month
 * @param year - Year
 * @param month - Month (0-11)
 * @returns Date object set to first day of the month
 */
export function getFirstDayOfMonth(year: number, month: number): Date {
  return new Date(year, month, 1);
}

/**
 * Get the last day of a month
 * @param year - Year
 * @param month - Month (0-11)
 * @returns Date object set to last day of the month
 */
export function getLastDayOfMonth(year: number, month: number): Date {
  return new Date(year, month + 1, 0);
}
