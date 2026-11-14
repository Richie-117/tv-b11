/**
 * UCR TV Studies Portal - Shared Attendance Calculations
 *
 * Implements authoritative attendance calculation rules according to
 * UCR_Attendance_Updated_Module_Separated_Excel_README.md:
 *
 * 1. Tracking begins officially on 16 November 2026 (Asia/Colombo).
 *    Dates before 16 Nov 2026 are never counted as absences or assumed records.
 * 2. Formula:
 *    Attendance % = Present valid sessions / (Present valid sessions + Absent valid sessions) * 100
 * 3. Cancelled, postponed-original, and not-held sessions are excluded from denominator and absence totals.
 * 4. Denominator 0 displays "No attendance data" / "Not available", never a misleading 0%.
 * 5. Unmarked sessions are not counted as absent.
 * 6. Modules in one day count as distinct sessions.
 */

import { AttendanceSession, AttendanceRecord, Student, CourseType } from '@/types';

export const TRACKING_START_DATE = '2026-10-25';
export const TIMEZONE = 'Asia/Colombo';

export interface AttendanceRateResult {
  presentCount: number;
  absentCount: number;
  excusedCount: number;
  validSessionsCount: number;
  rate: number | null; // null if denominator is 0
  formattedRate: string; // "92%" or "No attendance data"
  hasData: boolean;
}

/**
 * Checks whether an attendance session is valid for inclusion in attendance percentage.
 * Excludes cancelled/postponed/not_held sessions.
 */
export function isSessionValid(session: {
  date: string;
  sessionStatus?: string;
}): boolean {
  if (!session || !session.date) return false;

  // Enforce session conducted
  if (
    session.sessionStatus === 'cancelled' ||
    session.sessionStatus === 'postponed' ||
    session.sessionStatus === 'not_held'
  ) {
    return false;
  }

  return true;
}

/**
 * Calculates attendance rate strictly according to specification:
 * Attendance % = Present valid sessions / (Present valid sessions + Absent valid sessions) * 100
 */
export function calculateAttendanceRate(
  presentCount: number,
  absentCount: number,
  excusedCount: number = 0
): AttendanceRateResult {
  const denominator = presentCount + absentCount;
  const validSessionsCount = denominator + excusedCount;

  if (denominator <= 0) {
    return {
      presentCount,
      absentCount,
      excusedCount,
      validSessionsCount,
      rate: null,
      formattedRate: 'No attendance data',
      hasData: false,
    };
  }

  const rate = Math.round((presentCount / denominator) * 100);

  return {
    presentCount,
    absentCount,
    excusedCount,
    validSessionsCount,
    rate,
    formattedRate: `${rate}%`,
    hasData: true,
  };
}

/**
 * Evaluates attendance metrics for a specific student across a set of sessions and records.
 */
export function calculateStudentAttendanceMetrics(
  student: { id: string; studentNumber: string; course?: CourseType },
  sessions: AttendanceSession[],
  records: AttendanceRecord[],
  options?: {
    startDate?: string;
    endDate?: string;
    moduleId?: string;
    stage?: string;
  }
): AttendanceRateResult & {
  sessionDetails: Array<{
    sessionId: string;
    date: string;
    moduleCode?: string;
    moduleTitle: string;
    sessionType: string;
    status: 'present' | 'absent' | 'excused' | 'cancelled' | 'outside_period' | 'unmarked';
    remarks?: string;
    isValid: boolean;
  }>;
} {
  // Filter valid sessions for this student's course
  const applicableSessions = (sessions || []).filter((s) => {
    // Course match
    if (student.course && s.course !== 'ALL' && s.course !== student.course) {
      return false;
    }
    // Date range filter
    if (options?.startDate && s.date < options.startDate) return false;
    if (options?.endDate && s.date > options.endDate) return false;
    // Module filter
    if (options?.moduleId && options.moduleId !== 'ALL' && s.moduleId !== options.moduleId && s.moduleCode !== options.moduleId) {
      return false;
    }
    // Stage filter
    if (options?.stage && s.stage && s.stage !== options.stage) {
      return false;
    }
    return true;
  });

  // Create record map by sessionId for quick lookup
  const cleanStudentNum = (student.studentNumber || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const studentRecords = (records || []).filter(
    (r) =>
      r.studentId === student.id ||
      r.studentNumber?.toUpperCase() === student.studentNumber?.toUpperCase() ||
      (cleanStudentNum && (r.studentNumber || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase() === cleanStudentNum)
  );
  const recordMap = new Map<string, AttendanceRecord>();
  studentRecords.forEach((r) => recordMap.set(r.sessionId, r));

  let presentCount = 0;
  let absentCount = 0;
  let excusedCount = 0;

  const sessionDetails = applicableSessions.map((sess) => {
    const isPriorToTracking = sess.date < TRACKING_START_DATE;
    const isCancelledOrPostponed =
      sess.sessionStatus === 'cancelled' ||
      sess.sessionStatus === 'postponed' ||
      sess.sessionStatus === 'not_held';

    const rec = recordMap.get(sess.id);
    let status: 'present' | 'absent' | 'excused' | 'cancelled' | 'outside_period' | 'unmarked' = 'unmarked';
    let isValid = false;

    if (isPriorToTracking) {
      status = 'outside_period';
    } else if (isCancelledOrPostponed) {
      status = 'cancelled';
    } else if (rec) {
      status = rec.status;
      isValid = true;
      if (rec.status === 'present') presentCount++;
      else if (rec.status === 'absent') absentCount++;
      else if (rec.status === 'excused') excusedCount++;
    } else {
      // Unmarked session - not counted as absent
      status = 'unmarked';
    }

    return {
      sessionId: sess.id,
      date: sess.date,
      moduleCode: sess.moduleCode,
      moduleTitle: sess.moduleTitle,
      sessionType: sess.sessionType,
      status,
      remarks: rec?.remarks,
      isValid,
    };
  });

  const rateResult = calculateAttendanceRate(presentCount, absentCount, excusedCount);

  return {
    ...rateResult,
    sessionDetails,
  };
}

/**
 * Returns a human-friendly color and badge style for attendance rate.
 */
export function getAttendanceRateBadge(rate: number | null): {
  color: string;
  bgColor: string;
  borderColor: string;
  label: string;
} {
  if (rate === null) {
    return {
      color: 'text-slate-400',
      bgColor: 'bg-slate-800/40',
      borderColor: 'border-slate-700',
      label: 'No Data',
    };
  }
  if (rate >= 80) {
    return {
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-950/40',
      borderColor: 'border-emerald-600/40',
      label: 'Excellent',
    };
  }
  if (rate >= 65) {
    return {
      color: 'text-amber-400',
      bgColor: 'bg-amber-950/40',
      borderColor: 'border-amber-600/40',
      label: 'Average',
    };
  }
  return {
    color: 'text-rose-400',
    bgColor: 'bg-rose-950/40',
    borderColor: 'border-rose-600/40',
    label: 'Critical',
  };
}

