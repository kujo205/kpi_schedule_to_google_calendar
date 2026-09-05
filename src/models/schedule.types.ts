export interface KPIScheduleResponse {
  groupCode: string;
  scheduleFirstWeek: ScheduleDay[];
  scheduleSecondWeek: ScheduleDay[];
}

export interface ScheduleDay {
  day: string;
  pairs: Lesson[];
}

export interface Lesson {
  lecturer: {
    id: string;
    name: string;
  };
  type: string;
  time: string;
  name: string;
  location: string | null;
  tag: string;
  dates: string[];
}
