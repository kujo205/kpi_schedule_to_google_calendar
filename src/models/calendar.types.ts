import { calendar_v3 } from "googleapis";

export interface CalendarEvent {
  summary: string;
  description: string;
  location?: string;
  colorId?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  recurrence?: string[]; // Google Calendar RRULE strings
  extendedProperties?: {
    private?: {
      uniqueHash: string;
      recurrencePattern?: string; // Store pattern info for duplicate detection
    };
  };
}

export interface EventConflict {
  dateTime: string;
  events: CalendarEvent[];
}

export type GoogleCalendar = calendar_v3.Calendar;
export type GoogleCalendarEvent = calendar_v3.Schema$Event;
