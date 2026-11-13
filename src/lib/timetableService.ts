import {
  Timetable,
  TimetableSlot,
  TimetableOverride,
  CourseType,
  DayOfWeek,
} from '@/types';
import { getTimetables, getTimetableOverrides } from './db';
import { parseTimeToMinutes } from './time';

const TIMEZONE = 'Asia/Colombo';

export interface ActiveSlotDetails {
  id: string;
  subject: string;
  studentGroup?: string;
  timeRange: string;
  startTime: string;
  endTime: string;
  slotType: 'class' | 'break' | 'lunch' | 'empty';
  room?: string;
  notes?: string;
}

export type LectureStatusType =
  | 'LECTURE_ONGOING'
  | 'UPCOMING_LECTURE'
  | 'BREAK'
  | 'LUNCH_BREAK'
  | 'POSTPONED'
  | 'UNAVAILABLE'
  | 'NO_LECTURE_SCHEDULED_TODAY'
  | 'SCHEDULE_UNAVAILABLE';

export interface CourseLiveLectureStatus {
  course: CourseType;
  courseName: string;
  shortName: string;
  badge: string;
  status: LectureStatusType;
  statusLabel: string;
  currentSlot: ActiveSlotDetails | null;
  nextSlot: ActiveSlotDetails | null;
  override: TimetableOverride | null;
  timetableTitle: string;
  timetablePdfUrl?: string;
}

export interface SriLankaTimeContext {
  now: Date;
  dateStr: string;   // "YYYY-MM-DD"
  timeStr: string;   // "HH:MM"
  timeWithSeconds: string; // "HH:MM:SS"
  minutesNow: number;
  dayOfWeek: DayOfWeek;
  displayDate: string; // "Thursday, 12 November 2026"
  displayTime: string; // "11:08 PM"
}

export function getSriLankaDateTime(simulatedDate?: Date | string): SriLankaTimeContext {
  const d = simulatedDate ? new Date(simulatedDate) : new Date();

  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = dtf.formatToParts(d);
  const partMap: Record<string, string> = {};
  parts.forEach((p) => {
    partMap[p.type] = p.value;
  });

  const year = partMap.year || '2026';
  const month = partMap.month || '01';
  const day = partMap.day || '01';
  const weekday = (partMap.weekday || 'Monday') as DayOfWeek;
  const hour = parseInt(partMap.hour || '0', 10);
  const minute = parseInt(partMap.minute || '0', 10);
  const second = parseInt(partMap.second || '0', 10);

  const dateStr = `${year}-${month}-${day}`;
  const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  const timeWithSeconds = `${timeStr}:${second.toString().padStart(2, '0')}`;
  const minutesNow = hour * 60 + minute;

  const displayDate = d.toLocaleDateString('en-GB', {
    timeZone: TIMEZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const displayTime = d.toLocaleTimeString('en-US', {
    timeZone: TIMEZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return {
    now: d,
    dateStr,
    timeStr,
    timeWithSeconds,
    minutesNow,
    dayOfWeek: weekday,
    displayDate,
    displayTime,
  };
}

export function formatTimeSlot(start: string, end: string, label?: string): string {
  if (label) return label;
  const formatSingle = (timeStr: string) => {
    const mins = parseTimeToMinutes(timeStr);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const period = h >= 12 ? 'p.m.' : 'a.m.';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    const displayM = m === 0 ? '00' : m.toString().padStart(2, '0');
    return `${displayH}:${displayM} ${period}`;
  };

  return `${formatSingle(start)} – ${formatSingle(end)}`;
}

export function evaluateCourseStatus(
  course: CourseType,
  timetable: Timetable | null,
  allOverrides: TimetableOverride[],
  context: SriLankaTimeContext
): CourseLiveLectureStatus {
  const isTpopt = course === 'TPOPT';
  const courseName = isTpopt
    ? 'Television & Digital Media Post Production Technology'
    : 'Television & Digital Media Production Technology';
  const shortName = isTpopt ? 'TPOPT (Post-Prod)' : 'TPRPT (Production)';
  const badge = isTpopt ? 'TPOPT' : 'TPRPT';

  if (!timetable || !timetable.isPublished) {
    return {
      course,
      courseName,
      shortName,
      badge,
      status: 'SCHEDULE_UNAVAILABLE',
      statusLabel: 'Schedule unavailable',
      currentSlot: null,
      nextSlot: null,
      override: null,
      timetableTitle: timetable?.title || 'Foundation Programme Timetable',
      timetablePdfUrl: timetable?.pdfUrl,
    };
  }

  const todaySlots = (timetable.slots || [])
    .filter((s) => s.dayOfWeek.toLowerCase() === context.dayOfWeek.toLowerCase())
    .map((s) => ({
      ...s,
      startMins: parseTimeToMinutes(s.startTime),
      endMins: parseTimeToMinutes(s.endTime),
    }))
    .sort((a, b) => a.startMins - b.startMins);

  const activeSlot = todaySlots.find(
    (s) => s.startMins <= context.minutesNow && context.minutesNow < s.endMins
  );

  const todayOverrides = allOverrides.filter(
    (o) =>
      o.isActive &&
      o.exceptionDate === context.dateStr &&
      (!o.course || o.course === course) &&
      (!o.timetableId || o.timetableId === timetable.id)
  );

  const toSlotDetails = (s: typeof todaySlots[0]): ActiveSlotDetails => ({
    id: s.id,
    subject: s.subject,
    studentGroup: s.studentGroup,
    timeRange: s.timeLabel || formatTimeSlot(s.startTime, s.endTime),
    startTime: s.startTime,
    endTime: s.endTime,
    slotType: s.slotType,
    room: s.room,
    notes: s.notes,
  });

  const upcomingClassSlot = todaySlots.find(
    (s) => s.startMins > context.minutesNow && s.slotType === 'class' && Boolean(s.subject?.trim())
  );
  const nextSlotDetails = upcomingClassSlot ? toSlotDetails(upcomingClassSlot) : null;

  if (activeSlot) {
    const slotOverride = todayOverrides.find(
      (o) => !o.timetableSlotId || o.timetableSlotId === activeSlot.id
    );

    if (slotOverride) {
      if (slotOverride.status === 'POSTPONED') {
        return {
          course,
          courseName,
          shortName,
          badge,
          status: 'POSTPONED',
          statusLabel: 'Postponed',
          currentSlot: toSlotDetails(activeSlot),
          nextSlot: nextSlotDetails,
          override: slotOverride,
          timetableTitle: timetable.title,
          timetablePdfUrl: timetable.pdfUrl,
        };
      }

      if (slotOverride.status === 'UNAVAILABLE') {
        return {
          course,
          courseName,
          shortName,
          badge,
          status: 'UNAVAILABLE',
          statusLabel: 'Unavailable / Cancelled',
          currentSlot: toSlotDetails(activeSlot),
          nextSlot: nextSlotDetails,
          override: slotOverride,
          timetableTitle: timetable.title,
          timetablePdfUrl: timetable.pdfUrl,
        };
      }
    }

    if (activeSlot.slotType === 'break') {
      return {
        course,
        courseName,
        shortName,
        badge,
        status: 'BREAK',
        statusLabel: 'Break',
        currentSlot: toSlotDetails(activeSlot),
        nextSlot: nextSlotDetails,
        override: null,
        timetableTitle: timetable.title,
        timetablePdfUrl: timetable.pdfUrl,
      };
    }

    if (activeSlot.slotType === 'lunch') {
      return {
        course,
        courseName,
        shortName,
        badge,
        status: 'LUNCH_BREAK',
        statusLabel: 'Lunch Break',
        currentSlot: toSlotDetails(activeSlot),
        nextSlot: nextSlotDetails,
        override: null,
        timetableTitle: timetable.title,
        timetablePdfUrl: timetable.pdfUrl,
      };
    }

    if (activeSlot.slotType === 'class' && activeSlot.subject?.trim()) {
      return {
        course,
        courseName,
        shortName,
        badge,
        status: 'LECTURE_ONGOING',
        statusLabel: 'Lecture Ongoing',
        currentSlot: toSlotDetails(activeSlot),
        nextSlot: nextSlotDetails,
        override: null,
        timetableTitle: timetable.title,
        timetablePdfUrl: timetable.pdfUrl,
      };
    }
  }

  // If no active slot, check if next upcoming class exists today
  if (nextSlotDetails) {
    return {
      course,
      courseName,
      shortName,
      badge,
      status: 'UPCOMING_LECTURE',
      statusLabel: 'Upcoming Lecture Today',
      currentSlot: null,
      nextSlot: nextSlotDetails,
      override: null,
      timetableTitle: timetable.title,
      timetablePdfUrl: timetable.pdfUrl,
    };
  }

  return {
    course,
    courseName,
    shortName,
    badge,
    status: 'NO_LECTURE_SCHEDULED_TODAY',
    statusLabel: 'No more lectures scheduled today',
    currentSlot: null,
    nextSlot: null,
    override: null,
    timetableTitle: timetable.title,
    timetablePdfUrl: timetable.pdfUrl,
  };
}

export async function getLiveLectureStatus(simulatedDate?: Date | string): Promise<{
  tpopt: CourseLiveLectureStatus;
  tprpt: CourseLiveLectureStatus;
  context: SriLankaTimeContext;
}> {
  const context = getSriLankaDateTime(simulatedDate);
  const timetables = await getTimetables();
  const overrides = await getTimetableOverrides();

  const tpoptTimetable = timetables.find((t) => t.course === 'TPOPT') || null;
  const tprptTimetable = timetables.find((t) => t.course === 'TPRPT') || null;

  const tpopt = evaluateCourseStatus('TPOPT', tpoptTimetable, overrides, context);
  const tprpt = evaluateCourseStatus('TPRPT', tprptTimetable, overrides, context);

  return { tpopt, tprpt, context };
}

