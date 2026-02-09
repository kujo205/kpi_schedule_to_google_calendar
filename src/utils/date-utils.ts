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
