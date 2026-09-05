import * as crypto from "crypto";
import { KPIScheduleResponse, Lesson } from "../models/schedule.types";
import { CalendarEvent } from "../models/calendar.types";
import {
  parseKyivDateTime,
  toRFC3339,
  addMinutesToDate,
  getKyivTimezone,
  getDayOfWeekCode,
  toRRuleUntilFormat,
  daysBetween,
  generateSemesterDates,
} from "../utils/date-utils";

// Extended lesson type to track which week it belongs to
interface LessonWithWeekInfo extends Lesson {
  weekType: "first" | "second";
  dayCode: string;
}

const LESSON_DURATION_MINUTES = 90;

interface RecurrencePattern {
  type: "weekly" | "biweekly" | "irregular";
  interval: number; // 1 for weekly, 2 for biweekly
  startDate: Date;
  endDate: Date;
  dayOfWeek: string; // MO, TU, WE, etc.
}

/**
 * Map KPI schedule to Google Calendar events
 */
export function mapLessonsToEvents(
  schedule: KPIScheduleResponse,
  selectedSubjects?: string[],
): CalendarEvent[] {
  const subjectFilter = selectedSubjects ? new Set(selectedSubjects) : null;

  // Merge lessons from both weeks that represent the same recurring class
  // This is critical for detecting biweekly patterns correctly
  const mergedLessons = mergeLessonsFromBothWeeks(schedule);

  // Filter by selected subjects
  const filteredLessons = subjectFilter
    ? mergedLessons.filter((lesson) => subjectFilter.has(lesson.name))
    : mergedLessons;

  // Create events from merged lessons
  const events: CalendarEvent[] = [];
  for (const lesson of filteredLessons) {
    events.push(...createEventsFromLesson(lesson));
  }

  return events;
}

/**
 * Merge lessons from both weeks that represent the same class
 * Lessons are considered the same if they have matching:
 * - name, time, lecturer.name, type, location
 */
function mergeLessonsFromBothWeeks(
  schedule: KPIScheduleResponse,
): LessonWithWeekInfo[] {
  const lessonMap = new Map<string, LessonWithWeekInfo>();

  // Process first week
  for (const day of schedule.scheduleFirstWeek) {
    for (const lesson of day.pairs) {
      const lessonWithWeek: LessonWithWeekInfo = {
        ...lesson,
        weekType: "first",
        dayCode: day.day,
      };

      // Generate dates if dates array is empty
      if (!lesson.dates || lesson.dates.length === 0) {
        lessonWithWeek.dates = generateSemesterDates(day.day, true);
        if (lessonWithWeek.dates.length === 0) {
          console.warn(
            `Warning: Could not generate dates for lesson "${lesson.name}" at ${lesson.time} on ${day.day} (first week)`,
          );
          continue;
        }
      }

      // Create a unique key for each distinct class
      const key = createLessonKey(lesson);

      if (lessonMap.has(key)) {
        // Merge dates from this lesson into the existing one
        const existing = lessonMap.get(key)!;
        existing.dates = [...existing.dates, ...lessonWithWeek.dates];
      } else {
        // First time seeing this lesson, add it to the map
        lessonMap.set(key, {
          ...lessonWithWeek,
          dates: [...lessonWithWeek.dates],
        });
      }
    }
  }

  // Process second week
  for (const day of schedule.scheduleSecondWeek) {
    for (const lesson of day.pairs) {
      const lessonWithWeek: LessonWithWeekInfo = {
        ...lesson,
        weekType: "second",
        dayCode: day.day,
      };

      // Generate dates if dates array is empty
      if (!lesson.dates || lesson.dates.length === 0) {
        lessonWithWeek.dates = generateSemesterDates(day.day, false);
        if (lessonWithWeek.dates.length === 0) {
          console.warn(
            `Warning: Could not generate dates for lesson "${lesson.name}" at ${lesson.time} on ${day.day} (second week)`,
          );
          continue;
        }
      }

      // Create a unique key for each distinct class
      const key = createLessonKey(lesson);

      if (lessonMap.has(key)) {
        // Merge dates from this lesson into the existing one
        const existing = lessonMap.get(key)!;
        existing.dates = [...existing.dates, ...lessonWithWeek.dates];
      } else {
        // First time seeing this lesson, add it to the map
        lessonMap.set(key, {
          ...lessonWithWeek,
          dates: [...lessonWithWeek.dates],
        });
      }
    }
  }

  return Array.from(lessonMap.values());
}

/**
 * Create a unique key for a lesson to identify the same class across weeks
 */
function createLessonKey(lesson: Lesson): string {
  return `${lesson.name}|${lesson.time}|${lesson.lecturer.name}|${lesson.type}|${lesson.location}`;
}

/**
 * Create calendar events from a single lesson (can have multiple dates)
 * Now with smart recurrence detection for weekly/biweekly patterns
 */
function createEventsFromLesson(lesson: Lesson): CalendarEvent[] {
  // At this point, dates should always exist due to generation in merge phase
  // But keep safety check just in case
  if (!lesson.dates || lesson.dates.length === 0) {
    console.warn(
      `Warning: Skipping lesson "${lesson.name}" at ${lesson.time} - no dates after processing`,
    );
    return [];
  }

  // If only one date, create a single event (no recurrence needed)
  if (lesson.dates.length === 1) {
    return [createSingleEvent(lesson, lesson.dates[0])];
  }

  // Analyze if dates follow a recurring pattern
  const pattern = analyzeRecurrencePattern(lesson);

  // If irregular pattern or very few dates, create individual events
  if (pattern.type === "irregular" || lesson.dates.length < 2) {
    return lesson.dates.map((date) => createSingleEvent(lesson, date));
  }

  // Create a recurring event
  return [createRecurringEvent(lesson, pattern)];
}

/**
 * Create a single non-recurring event
 */
function createSingleEvent(lesson: Lesson, date: string): CalendarEvent {
  try {
    const startTime = parseKyivDateTime(date, lesson.time);
    if (!startTime || isNaN(startTime.getTime())) {
      throw new Error(`Invalid date/time: ${date} ${lesson.time}`);
    }
    const endTime = addMinutesToDate(startTime, LESSON_DURATION_MINUTES);

    return {
      summary: formatEventTitle(lesson),
      description: formatEventDescription(lesson),
      location: lesson.location || undefined,
      colorId: getEventColorId(lesson.tag),
      start: {
        dateTime: toRFC3339(startTime),
        timeZone: getKyivTimezone(),
      },
      end: {
        dateTime: toRFC3339(endTime),
        timeZone: getKyivTimezone(),
      },
      extendedProperties: {
        private: {
          uniqueHash: generateEventHash(lesson, date),
        },
      },
    };
  } catch (error) {
    throw new Error(
      `Failed to create event for lesson "${lesson.name}" on ${date} at ${lesson.time}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Create a recurring event with RRULE
 */
function createRecurringEvent(
  lesson: Lesson,
  pattern: RecurrencePattern,
): CalendarEvent {
  const startTime = pattern.startDate;
  const endTime = addMinutesToDate(startTime, LESSON_DURATION_MINUTES);

  // Build RRULE string
  // Format: RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=MO;UNTIL=20261231T235959Z
  const rrule = `RRULE:FREQ=WEEKLY;INTERVAL=${pattern.interval};BYDAY=${pattern.dayOfWeek};UNTIL=${toRRuleUntilFormat(pattern.endDate)}`;

  // Create a pattern identifier for duplicate detection
  const recurrencePattern = `${lesson.name}-${lesson.time}-${lesson.lecturer.name}-${pattern.type}-${pattern.interval}`;

  return {
    summary: formatEventTitle(lesson),
    description: formatEventDescription(lesson),
    location: lesson.location || undefined,
    colorId: getEventColorId(lesson.tag),
    start: {
      dateTime: toRFC3339(startTime),
      timeZone: getKyivTimezone(),
    },
    end: {
      dateTime: toRFC3339(endTime),
      timeZone: getKyivTimezone(),
    },
    recurrence: [rrule],
    extendedProperties: {
      private: {
        uniqueHash: generateRecurringEventHash(lesson, pattern),
        recurrencePattern,
      },
    },
  };
}

/**
 * Analyze dates to detect weekly or biweekly recurrence patterns
 */
function analyzeRecurrencePattern(lesson: Lesson): RecurrencePattern {
  // Check if dates array exists and has elements
  if (!lesson.dates || lesson.dates.length === 0) {
    throw new Error(
      `No dates array found for lesson: ${lesson.name} at ${lesson.time}\n` +
        `Lesson data: ${JSON.stringify(lesson, null, 2)}`,
    );
  }

  // Parse and validate dates
  const parsedDates: Array<{ original: string; parsed: Date | null }> =
    lesson.dates.map((date) => {
      try {
        const parsed = parseKyivDateTime(date, lesson.time);
        return {
          original: date,
          parsed:
            parsed instanceof Date && !isNaN(parsed.getTime()) ? parsed : null,
        };
      } catch (error) {
        return { original: date, parsed: null };
      }
    });

  const validDates = parsedDates
    .filter((d) => d.parsed !== null)
    .map((d) => d.parsed!)
    .sort((a, b) => a.getTime() - b.getTime());

  if (validDates.length === 0) {
    const invalidDates = parsedDates
      .filter((d) => d.parsed === null)
      .map((d) => d.original);
    throw new Error(
      `No valid dates found for lesson: ${lesson.name} at ${lesson.time}\n` +
        `Total dates: ${lesson.dates.length}\n` +
        `Invalid dates: ${invalidDates.join(", ")}\n` +
        `Date format expected: yyyy-MM-dd (e.g., 2026-02-10)\n` +
        `Time format expected: HH:mm:ss (e.g., 10:25:00)`,
    );
  }

  const dates = validDates;

  const startDate = dates[0];
  const endDate = dates[dates.length - 1];
  const dayOfWeek = getDayOfWeekCode(startDate);

  // Need at least 2 dates to determine a pattern
  if (dates.length < 2) {
    return {
      type: "irregular",
      interval: 1,
      startDate,
      endDate,
      dayOfWeek,
    };
  }

  // Calculate intervals between consecutive dates
  const intervals: number[] = [];
  for (let i = 1; i < dates.length; i++) {
    const days = daysBetween(dates[i - 1], dates[i]);
    intervals.push(days);
  }

  // Check for weekly pattern (7 days ± 1 day tolerance)
  const isWeekly = intervals.every(
    (interval) => interval >= 6 && interval <= 8,
  );

  // Check for biweekly pattern (14 days ± 1 day tolerance)
  const isBiweekly = intervals.every(
    (interval) => interval >= 13 && interval <= 15,
  );

  if (isWeekly) {
    return {
      type: "weekly",
      interval: 1,
      startDate,
      endDate,
      dayOfWeek,
    };
  }

  if (isBiweekly) {
    return {
      type: "biweekly",
      interval: 2,
      startDate,
      endDate,
      dayOfWeek,
    };
  }

  // If pattern doesn't match weekly or biweekly, it's irregular
  return {
    type: "irregular",
    interval: 1,
    startDate,
    endDate,
    dayOfWeek,
  };
}

// Google Calendar colorId: 5=Banana(yellow), 7=Peacock(blue), 8=Graphite(grey)
function getEventColorId(tag: string): string | undefined {
  switch (tag) {
    case "prac": return "5";
    case "lab":  return "7";
    case "lec":  return "8";
    default:     return undefined;
  }
}

/**
 * Format event title: "Lesson Name (Type) - Teacher Initials"
 */
function formatEventTitle(lesson: Lesson): string {
  const shortTeacher = shortenTeacherName(lesson.lecturer.name);
  return `${lesson.name} (${lesson.type}) - ${shortTeacher}`;
}

/**
 * Format event description with metadata
 */
function formatEventDescription(lesson: Lesson): string {
  const location = lesson.location || "Не вказано";

  return `Викладач: ${lesson.lecturer.name}
Тип: ${lesson.type}
Аудиторія: ${location}

ID викладача: ${lesson.lecturer.id}`;
}

/**
 * Shorten teacher name: "Фіногенов Олексій Дмитрович" -> "Фіногенов О.Д."
 */
function shortenTeacherName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);

  if (parts.length === 1) {
    return parts[0];
  }

  if (parts.length === 2) {
    return `${parts[0]} ${parts[1].charAt(0)}.`;
  }

  // Three parts: LastName FirstName MiddleName
  const lastName = parts[0];
  const firstInitial = parts[1].charAt(0);
  const middleInitial = parts[2].charAt(0);

  return `${lastName} ${firstInitial}.${middleInitial}.`;
}

/**
 * Generate unique hash for event (for duplicate detection)
 */
function generateEventHash(lesson: Lesson, date: string): string {
  const hashContent = `${date}-${lesson.time}-${lesson.name}-${lesson.lecturer.name}`;
  return crypto.createHash("sha256").update(hashContent).digest("hex");
}

/**
 * Generate unique hash for recurring event (for duplicate detection)
 */
function generateRecurringEventHash(
  lesson: Lesson,
  pattern: RecurrencePattern,
): string {
  const hashContent = `${pattern.startDate.toISOString()}-${pattern.endDate.toISOString()}-${lesson.time}-${lesson.name}-${lesson.lecturer.name}-${pattern.type}-${pattern.interval}`;
  return crypto.createHash("sha256").update(hashContent).digest("hex");
}
