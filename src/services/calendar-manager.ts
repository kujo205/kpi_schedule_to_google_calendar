import { google } from "googleapis";
import { CalendarEvent, GoogleCalendarEvent } from "../models/calendar.types";
import { dim, warning } from "../utils/logger";

const BATCH_SIZE = 20; // Increased from 5 for better performance
const BATCH_DELAY_MS = 1000; // Reduced from 2000ms (1 second)
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 5000; // 5 seconds for first retry

/**
 * Find or create a calendar with the given name
 */
export async function findOrCreateCalendar(
  auth: any,
  calendarName: string,
): Promise<string> {
  const calendar = google.calendar({ version: "v3", auth });

  // List existing calendars
  const calendarList = await calendar.calendarList.list();
  const existingCalendar = calendarList.data.items?.find(
    (cal) => cal.summary === calendarName,
  );

  if (existingCalendar && existingCalendar.id) {
    return existingCalendar.id;
  }

  // Create new calendar
  const newCalendar = await calendar.calendars.insert({
    requestBody: {
      summary: calendarName,
      description: "Automatically synced from KPI Campus API",
      timeZone: "Europe/Kiev",
    },
  });

  return newCalendar.data.id!;
}

/**
 * Check for duplicate events and return only new ones
 * Now handles both recurring and single events
 */
export async function checkForDuplicates(
  auth: any,
  calendarId: string,
  events: CalendarEvent[],
): Promise<CalendarEvent[]> {
  if (events.length === 0) {
    return [];
  }

  const calendar = google.calendar({ version: "v3", auth });

  // Get date range from events
  const startDates = events.map((e) => new Date(e.start.dateTime));
  const endDates = events.map((e) => new Date(e.end.dateTime));
  const minDate = new Date(Math.min(...startDates.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...endDates.map((d) => d.getTime())));

  // Fetch existing events
  // Note: singleEvents=false to get recurring event masters, not instances
  const response = await calendar.events.list({
    calendarId,
    timeMin: minDate.toISOString(),
    timeMax: maxDate.toISOString(),
    singleEvents: false, // Get recurring event masters
  });

  const existingEvents = response.data.items || [];

  // Extract existing hashes and recurrence patterns
  const existingHashes = new Set<string>();
  const existingRecurrencePatterns = new Set<string>();

  for (const event of existingEvents) {
    const hash = event.extendedProperties?.private?.uniqueHash;
    if (hash) {
      existingHashes.add(hash);
    }

    const recurrencePattern =
      event.extendedProperties?.private?.recurrencePattern;
    if (recurrencePattern) {
      existingRecurrencePatterns.add(recurrencePattern);
    }
  }

  // Filter out duplicates
  const newEvents = events.filter((event) => {
    const hash = event.extendedProperties?.private?.uniqueHash;
    const recurrencePattern =
      event.extendedProperties?.private?.recurrencePattern;

    // Check if hash exists
    if (hash && existingHashes.has(hash)) {
      return false;
    }

    // For recurring events, also check recurrence pattern
    if (
      recurrencePattern &&
      existingRecurrencePatterns.has(recurrencePattern)
    ) {
      return false;
    }

    return true;
  });

  return newEvents;
}

/**
 * Batch create events with progress reporting and rate limit handling
 */
export async function batchCreateEvents(
  auth: any,
  calendarId: string,
  events: CalendarEvent[],
): Promise<void> {
  const calendar = google.calendar({ version: "v3", auth });
  const totalEvents = events.length;
  let created = 0;

  // Create events in batches
  for (let i = 0; i < events.length; i += BATCH_SIZE) {
    const batch = events.slice(i, i + BATCH_SIZE);

    // Create events with retry logic
    for (const event of batch) {
      await createEventWithRetry(calendar, calendarId, event);
      created++;
      updateProgress(created, totalEvents);
    }

    // Add delay between batches (except after the last batch)
    if (i + BATCH_SIZE < events.length) {
      await delay(BATCH_DELAY_MS);
    }
  }

  console.log(""); // New line after progress
}

/**
 * Create a single event with exponential backoff retry logic
 */
async function createEventWithRetry(
  calendar: any,
  calendarId: string,
  event: CalendarEvent,
  retryCount = 0,
): Promise<void> {
  try {
    await calendar.events.insert({
      calendarId,
      requestBody: event,
    });
  } catch (error: any) {
    // Check if it's a rate limit error
    const isRateLimitError =
      error.code === 429 ||
      error.message?.includes("Rate Limit") ||
      error.message?.includes("quota");

    if (isRateLimitError && retryCount < MAX_RETRIES) {
      // Calculate exponential backoff delay
      const retryDelay = INITIAL_RETRY_DELAY_MS * Math.pow(2, retryCount);

      warning(
        `\n⚠️  Rate limit hit, retrying in ${retryDelay / 1000}s... (attempt ${retryCount + 1}/${MAX_RETRIES})`,
      );

      await delay(retryDelay);
      return createEventWithRetry(calendar, calendarId, event, retryCount + 1);
    }

    // If not a rate limit error or max retries exceeded, throw
    throw error;
  }
}

/**
 * Delay helper function
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Display progress bar
 */
function updateProgress(current: number, total: number): void {
  const percentage = Math.round((current / total) * 100);
  const barLength = 30;
  const filledLength = Math.round((barLength * current) / total);
  const bar =
    "=".repeat(filledLength) +
    ">".repeat(1) +
    " ".repeat(barLength - filledLength);

  process.stdout.write(
    `\rCreating events... [${bar}] ${current}/${total} (${percentage}%)`,
  );
}
