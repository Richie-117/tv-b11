import { NextRequest, NextResponse } from 'next/server';
import {
  getAttendanceSessions,
  getAttendanceCheckins,
  getAttendanceRecords,
  getStudents,
  updateAttendanceSessionCheckin,
} from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedCourse = searchParams.get('course'); // Optional filter

    // Always fetch all students so the public terminal can validate any student index immediately (both TPOPT & TPRPT)
    const allStudents = await getStudents();
    const relevantStudents = allStudents.map((s) => {
      const match = s.studentNumber.match(/(\d+)$/);
      const lastNumber = match ? match[1] : '';
      return {
        id: s.id,
        studentNumber: s.studentNumber,
        fullName: s.fullName,
        course: s.course,
        lastNumber,
      };
    });

    const allSessions = await getAttendanceSessions();
    const now = Date.now();

    // Find all sessions currently marked active
    const activeCandidates = allSessions.filter((s) => s.checkinStatus === 'active');

    // Filter out expired or cancelled sessions
    const validActiveSessions = [];
    for (const sess of activeCandidates) {
      if (sess.sessionStatus === 'cancelled' || sess.sessionStatus === 'postponed') {
        continue;
      }
      if (sess.checkinExpiresAt && now > new Date(sess.checkinExpiresAt).getTime()) {
        // Auto-close expired session in background
        await updateAttendanceSessionCheckin(sess.id, 'expired').catch(() => {});
        continue;
      }
      if (requestedCourse && sess.course !== 'ALL' && sess.course !== requestedCourse) {
        continue;
      }
      validActiveSessions.push(sess);
    }

    if (validActiveSessions.length === 0) {
      return NextResponse.json({
        success: true,
        hasActiveSession: false,
        activeSession: null,
        activeSessions: [],
        students: relevantStudents,
        checkedInStudentNumbers: [],
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      });
    }

    // Pick the most relevant active session (latest opened)
    const primarySession = validActiveSessions[0];

    // Get checked in students across all active sessions
    const [allCheckinsArrays, records] = await Promise.all([
      Promise.all(validActiveSessions.map((s) => getAttendanceCheckins(s.id))),
      getAttendanceRecords(),
    ]);

    const activeSessionIds = new Set(validActiveSessions.map((s) => s.id));
    const sessionRecords = records.filter(
      (r) => activeSessionIds.has(r.sessionId) && r.status === 'present'
    );

    const checkedInNumbersSet = new Set<string>();
    allCheckinsArrays.flat().forEach((c) => {
      if (c.status === 'submitted' || c.status === 'confirmed') {
        if (c.studentNumber) checkedInNumbersSet.add(c.studentNumber.toUpperCase());
      }
    });
    sessionRecords.forEach((r) => {
      if (r.studentNumber) checkedInNumbersSet.add(r.studentNumber.toUpperCase());
    });

    return NextResponse.json({
      success: true,
      hasActiveSession: true,
      activeSession: {
        id: primarySession.id,
        course: primarySession.course,
        moduleId: primarySession.moduleId,
        moduleCode: primarySession.moduleCode || 'LEC',
        moduleTitle: primarySession.moduleTitle,
        sessionType: primarySession.sessionType,
        date: primarySession.date,
        startTime: primarySession.startTime || '08:30',
        endTime: primarySession.endTime || '16:30',
        checkinExpiresAt: primarySession.checkinExpiresAt,
        markedByAdminName: primarySession.markedByAdminName,
      },
      activeSessions: validActiveSessions.map((s) => ({
        id: s.id,
        course: s.course,
        moduleId: s.moduleId,
        moduleCode: s.moduleCode || 'LEC',
        moduleTitle: s.moduleTitle,
        sessionType: s.sessionType,
        date: s.date,
        startTime: s.startTime || '08:30',
        endTime: s.endTime || '16:30',
        checkinExpiresAt: s.checkinExpiresAt,
        markedByAdminName: s.markedByAdminName,
      })),
      students: relevantStudents,
      checkedInStudentNumbers: Array.from(checkedInNumbersSet),
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (err: any) {
    console.error('Public checkin active GET error:', err);
    return NextResponse.json({ error: 'Failed to retrieve active check-in session.' }, { status: 500 });
  }
}
