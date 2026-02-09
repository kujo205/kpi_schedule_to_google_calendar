import inquirer from "inquirer";
import { CalendarEvent, EventConflict } from "../models/calendar.types";
import { formatDisplayDate } from "../utils/date-utils";
import { warning, dim } from "../utils/logger";

/**
 * Extract lesson name from event summary
 * e.g., "Комп'ютерна лінгвістика (Лаб) - Фіногенов О.Д."
 *    → "Комп'ютерна лінгвістика (Лаб)"
 */
function extractLessonName(summary: string): string {
  const parts = summary.split(" - ");
  return parts[0].trim();
}

/**
 * Resolve conflicts by asking user which events to add
 */
export async function resolveConflicts(
  events: CalendarEvent[],
): Promise<CalendarEvent[]> {
  // Group events by datetime
  const conflicts = findConflicts(events);

  if (conflicts.length === 0) {
    return events;
  }

  warning(
    `\n⚠️  Found ${conflicts.length} time slot(s) with multiple lessons\n`,
  );

  const selectedEvents: CalendarEvent[] = [];
  const processedDateTimes = new Set<string>();
  const selectedLessonNames = new Set<string>();

  // Process each conflict
  for (const conflict of conflicts) {
    // Check if any lesson in this conflict was already selected
    const alreadySelected = conflict.events.find((event) => {
      const lessonName = extractLessonName(event.summary);
      return selectedLessonNames.has(lessonName);
    });

    if (alreadySelected) {
      const lessonName = extractLessonName(alreadySelected.summary);
      dim(
        `\nℹ Skipping conflict at ${formatDisplayDate(new Date(conflict.dateTime))} - ` +
          `already selected "${lessonName}"`,
      );
      processedDateTimes.add(conflict.dateTime);
      continue;
    }

    // Build choices array with skip option at bottom
    const choices = [
      ...conflict.events.map((event) => ({
        name: event.summary,
        value: event,
      })),
      new inquirer.Separator(),
      {
        name: "Skip this conflict",
        value: null,
      },
    ];

    dim(`\nConflict at ${formatDisplayDate(new Date(conflict.dateTime))}:`);

    const answer = await inquirer.prompt([
      {
        type: "select",
        name: "selected",
        message: "Select which event to add:",
        choices,
      },
    ]);

    // Check if user chose to skip
    if (answer.selected !== null) {
      // User selected a lesson
      selectedEvents.push(answer.selected);

      // Track the lesson name for future conflict detection
      const lessonName = extractLessonName(answer.selected.summary);
      selectedLessonNames.add(lessonName);
    }
    // If null, user chose skip - don't add anything

    processedDateTimes.add(conflict.dateTime);
  }

  // Add non-conflicting events
  for (const event of events) {
    if (!processedDateTimes.has(event.start.dateTime)) {
      selectedEvents.push(event);
    }
  }

  return selectedEvents;
}

/**
 * Find conflicts (multiple events at same time)
 */
function findConflicts(events: CalendarEvent[]): EventConflict[] {
  const timeSlots = new Map<string, CalendarEvent[]>();

  // Group by start time
  for (const event of events) {
    const dateTime = event.start.dateTime;
    if (!timeSlots.has(dateTime)) {
      timeSlots.set(dateTime, []);
    }
    timeSlots.get(dateTime)!.push(event);
  }

  // Find slots with multiple events
  const conflicts: EventConflict[] = [];
  for (const [dateTime, eventsAtTime] of timeSlots) {
    if (eventsAtTime.length > 1) {
      conflicts.push({
        dateTime,
        events: eventsAtTime,
      });
    }
  }

  // Sort conflicts by datetime
  conflicts.sort((a, b) => a.dateTime.localeCompare(b.dateTime));

  return conflicts;
}
