import { format, addMinutes, parse } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

const KYIV_TIMEZONE = "Europe/Kiev";

/**
 * Parse KPI date and time to Date object in Kyiv timezone
 */
export function parseKyivDateTime(date: string, time: string): Date {
  // Combine date and time: "2026-02-02" + "08:30:00" => "2026-02-02 08:30:00"
  const dateTimeStr = `${date} ${time}`;
  const parsedDate = parse(dateTimeStr, "yyyy-MM-dd HH:mm:ss", new Date());

  // Treat as Kyiv time and convert to UTC
  return fromZonedTime(parsedDate, KYIV_TIMEZONE);
}

/**
 * Convert Date to RFC3339 format for Google Calendar
 */
export function toRFC3339(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

/**
 * Add minutes to a date
 */
export function addMinutesToDate(date: Date, minutes: number): Date {
  return addMinutes(date, minutes);
}

/**
 * Format date for display to user
 */
export function formatDisplayDate(date: Date): string {
  return format(date, "EEEE, MMM d HH:mm");
}

/**
 * Get day name from Ukrainian abbreviation
 */
export function getDayName(dayCode: string): string {
  const dayMap: Record<string, string> = {
    Пн: "Monday",
    Вв: "Tuesday",
    Ср: "Wednesday",
    Чт: "Thursday",
    Пт: "Friday",
    Сб: "Saturday",
  };

  return dayMap[dayCode] || dayCode;
}

/**
 * Get Kyiv timezone
 */
export function getKyivTimezone(): string {
  return KYIV_TIMEZONE;
}

/**
 * Get day of week code for Google Calendar RRULE (MO, TU, WE, TH, FR, SA, SU)
 */
export function getDayOfWeekCode(date: Date): string {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error(`Invalid date provided to getDayOfWeekCode: ${date}`);
  }
  const dayMap = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
  return dayMap[date.getDay()];
}

/**
 * Format date to RRULE UNTIL format (YYYYMMDDTHHMMSSZ)
 */
export function toRRuleUntilFormat(date: Date): string {
  return format(date, "yyyyMMdd'T'HHmmss'Z'");
}

/**
 * Calculate difference in days between two dates
 */
export function daysBetween(date1: Date, date2: Date): number {
  const ms = Math.abs(date2.getTime() - date1.getTime());
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

/**
 * Get the day of week number from Ukrainian abbreviation
 * Returns 0-6 (Sunday=0, Monday=1, etc.)
 */
export function getDayNumberFromUkrCode(dayCode: string): number {
  const dayMap: Record<string, number> = {
    Пн: 1, // Monday
    Вв: 2, // Tuesday
    Ср: 3, // Wednesday
    Чт: 4, // Thursday
    Пт: 5, // Friday
    Сб: 6, // Saturday
  };

  return dayMap[dayCode] ?? -1;
}

/**
 * Generate dates for a semester week pattern
 * For lessons with empty dates arrays, we generate dates based on:
 * - The day of week (e.g., "Пн" = Monday)
 * - Whether it's first week or second week pattern
 * - A semester date range (default: current date to end of semester)
 */
export function generateSemesterDates(
  dayCode: string,
  isFirstWeek: boolean,
  semesterStart?: Date,
  semesterEnd?: Date,
): string[] {
  const dayNumber = getDayNumberFromUkrCode(dayCode);
  if (dayNumber === -1) {
    console.warn(`Unknown day code: ${dayCode}`);
    return [];
  }

  // Default semester range: current date to 6 months from now
  const start = semesterStart || new Date();
  const end = semesterEnd || addMonths(new Date(), 6);

  // Find the first occurrence of the target day
  let currentDate = new Date(start);

  // Move to the first occurrence of the target day of week
  while (currentDate.getDay() !== dayNumber) {
    currentDate = addDays(currentDate, 1);
  }

  // For second week pattern, start from the second week
  if (!isFirstWeek) {
    currentDate = addDays(currentDate, 7);
  }

  const dates: string[] = [];

  // Generate dates every 2 weeks (biweekly pattern)
  while (currentDate <= end) {
    dates.push(format(currentDate, "yyyy-MM-dd"));
    currentDate = addDays(currentDate, 14); // Add 2 weeks
  }

  return dates;
}

/**
 * Add days to a date
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Add months to a date
 */
function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}
