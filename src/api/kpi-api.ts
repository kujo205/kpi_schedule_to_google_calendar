import { KPIScheduleResponse } from "../models/schedule.types";

const KPI_API_BASE = "https://api.campus.kpi.ua/schedule/lessons";

/**
 * Fetch schedule from KPI Campus API
 */
export async function fetchSchedule(
  groupId: string,
): Promise<KPIScheduleResponse> {
  try {
    const url = `${KPI_API_BASE}?groupId=${groupId}`;
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(
          `Group not found. Please check the group ID: ${groupId}`,
        );
      }
      throw new Error(`Failed to fetch schedule: ${response.statusText}`);
    }

    const data: any = await response.json();

    // Validate response structure
    if (!data.scheduleFirstWeek || !data.scheduleSecondWeek) {
      throw new Error("Invalid schedule data received from API");
    }

    return data as KPIScheduleResponse;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Unknown error fetching schedule");
  }
}

/**
 * Validate group ID format (UUID)
 */
export function isValidGroupId(groupId: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(groupId);
}

/**
 * Count total lessons in schedule
 */
export function getTotalLessons(schedule: KPIScheduleResponse): number {
  let count = 0;

  for (const day of schedule.scheduleFirstWeek) {
    count += day.pairs.length;
  }

  for (const day of schedule.scheduleSecondWeek) {
    count += day.pairs.length;
  }

  return count;
}

/**
 * Get unique subject names from schedule
 */
export function getUniqueSubjects(schedule: KPIScheduleResponse): string[] {
  const subjectSet = new Set<string>();

  // Extract from first week
  for (const day of schedule.scheduleFirstWeek) {
    for (const lesson of day.pairs) {
      subjectSet.add(lesson.name);
    }
  }

  // Extract from second week
  for (const day of schedule.scheduleSecondWeek) {
    for (const lesson of day.pairs) {
      subjectSet.add(lesson.name);
    }
  }

  // Convert to sorted array
  return Array.from(subjectSet).sort();
}
