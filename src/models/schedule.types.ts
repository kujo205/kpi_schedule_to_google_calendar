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
  teacherName: string;
  lecturerId: string;
  lecturer: {
    id: string;
    name: string;
  };
  type: string;
  time: string;
  name: string;
  place: string;
  location: string | null;
  tag: string;
  dates: string[];
}
