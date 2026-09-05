#!/usr/bin/env node

import { authenticate } from "./auth/google-auth";
import { deleteToken } from "./auth/token-manager";
import {
  fetchSchedule,
  isValidGroupId,
  getTotalLessons,
  getUniqueSubjects,
} from "./api/kpi-api";
import { mapLessonsToEvents } from "./services/event-mapper";
import { resolveConflicts } from "./services/conflict-resolver";
import {
  findOrCreateCalendar,
  checkForDuplicates,
  batchCreateEvents,
} from "./services/calendar-manager";
import { info, success, error, dim, warning } from "./utils/logger";
import inquirer from "inquirer";

const DEFAULT_CALENDAR_NAME = "KPI Schedule";

async function main() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);

    // Check for --reauth flag
    if (args.includes("--reauth")) {
      info("Clearing saved authentication...");
      deleteToken();
      success("✓ Authentication cleared. You will need to re-authenticate.");
      return;
    }

    // Get group ID
    const groupId = args[0];

    if (!groupId) {
      error("Usage: pnpm sync <groupId>");
      error("");
      error("Example: pnpm sync 6155");
      error("");
      error("To re-authenticate: pnpm sync --reauth");
      process.exit(1);
    }

    // Validate group ID
    if (!isValidGroupId(groupId)) {
      error("Invalid group ID format. Expected a positive integer.");
      error("Example: pnpm sync 6155");
      process.exit(1);
    }

    // Authenticate
    info("Authenticating with Google Calendar...");
    const auth = await authenticate();
    success("✓ Authenticated");

    // Fetch schedule
    info(`\nFetching schedule for group ${groupId}...`);
    const schedule = await fetchSchedule(groupId);
    const totalLessons = getTotalLessons(schedule);
    success(`✓ Fetched schedule with ${totalLessons} lesson entries`);

    // Get unique subjects
    const uniqueSubjects = getUniqueSubjects(schedule);
    info(`\nFound ${uniqueSubjects.length} unique subjects`);

    // Prompt user to select subjects
    info("\nSelect the subjects you want to sync to your calendar:");
    const { selectedSubjects } = await inquirer.prompt([
      {
        type: "checkbox",
        name: "selectedSubjects",
        message: "Choose subjects (use spacebar to select, enter to confirm):",
        choices: uniqueSubjects,
        pageSize: 15,
        validate: (answer: string[]) => {
          if (answer.length === 0) {
            return "You must select at least one subject.";
          }
          return true;
        },
      },
    ]);

    success(`✓ Selected ${selectedSubjects.length} subjects`);

    // Transform to events
    info("\nProcessing lessons...");
    const allEvents = mapLessonsToEvents(schedule, selectedSubjects);
    dim(`Total events to create: ${allEvents.length}`);

    // Resolve conflicts
    info("\nChecking for time conflicts...");
    const selectedEvents = await resolveConflicts(allEvents);

    if (selectedEvents.length === 0) {
      warning("\n⚠️  No events selected. Exiting.");
      return;
    }

    success(`✓ ${selectedEvents.length} events selected`);

    // Find or create calendar
    info("\nSetting up calendar...");
    const calendarId = await findOrCreateCalendar(auth, DEFAULT_CALENDAR_NAME);
    success(`✓ Calendar ready: "${DEFAULT_CALENDAR_NAME}"`);

    // Check for duplicates
    info("\nChecking for existing events...");
    const newEvents = await checkForDuplicates(
      auth,
      calendarId,
      selectedEvents,
    );

    if (newEvents.length === 0) {
      success("\n✓ All events already exist in calendar. Nothing to add!");
      return;
    }

    dim(`${newEvents.length} new events to create`);

    // Create events
    info(`\nCreating ${newEvents.length} events...`);
    await batchCreateEvents(auth, calendarId, newEvents);

    // Success summary
    success(
      `\n✓ Successfully synced ${newEvents.length} events to Google Calendar!`,
    );
    info(`\nView your calendar at: https://calendar.google.com`);
  } catch (err) {
    error("\n❌ Error occurred:");
    if (err instanceof Error) {
      error(err.message);
      if (process.env.DEBUG) {
        console.error(err.stack);
      }
    } else {
      error("Unknown error");
    }
    process.exit(1);
  }
}

// Run the CLI
main();
