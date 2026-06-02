import { format } from "date-fns";
import { it } from "date-fns/locale";

/**
 * Format a date for display in the UI
 * @param date - Date to format (can be Date object or string)
 * @param formatStr - Format string (default: "MMMM yyyy" for "Gennaio 2025")
 * @returns Formatted date string
 */
export function formatDate(date: Date | string | null | undefined, formatStr: string = "MMMM yyyy"): string {
  if (!date) return "-";
  
  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return format(dateObj, formatStr, { locale: it });
  } catch (error) {
    return "-";
  }
}

/**
 * Format a date in short format
 * @param date - Date to format
 * @returns Formatted date string (e.g., "Gen 2025")
 */
export function formatDateShort(date: Date | string | null | undefined): string {
  return formatDate(date, "MMM yyyy");
}

/**
 * Format a date with day
 * @param date - Date to format
 * @returns Formatted date string (e.g., "1 Gennaio 2025")
 */
export function formatDateWithDay(date: Date | string | null | undefined): string {
  return formatDate(date, "d MMMM yyyy");
}

/**
 * Calculate month offset from a reference date
 * @param dataInizio - Reference date (T0)
 * @param dataTarget - Target date
 * @returns Number of months from dataInizio to dataTarget
 */
export function dateToMonthOffset(dataInizio: Date | string, dataTarget: Date | string): number {
  const start = typeof dataInizio === "string" ? new Date(dataInizio) : dataInizio;
  const target = typeof dataTarget === "string" ? new Date(dataTarget) : dataTarget;
  
  const yearDiff = target.getFullYear() - start.getFullYear();
  const monthDiff = target.getMonth() - start.getMonth();
  return yearDiff * 12 + monthDiff;
}

/**
 * Calculate a date by adding months to a reference date
 * @param dataInizio - Reference date (T0)
 * @param offset - Number of months to add
 * @returns Date at the specified offset
 */
export function monthOffsetToDate(dataInizio: Date | string, offset: number): Date {
  const start = typeof dataInizio === "string" ? new Date(dataInizio) : dataInizio;
  const result = new Date(start);
  result.setMonth(result.getMonth() + offset);
  return result;
}

/**
 * Format month offset as date string
 * If dataInizio is provided, calculate the actual date and format it
 * Otherwise, return "Mese X"
 */
export function formatMonthOffset(
  offset: number,
  dataInizio?: Date | string | null
): string {
  if (dataInizio) {
    const date = monthOffsetToDate(dataInizio, offset);
    return formatDate(date);
  }
  return `Mese ${offset}`;
}
