import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import {
  getStudents,
  getAttendanceSessions,
  getAttendanceCheckins,
  getAttendanceRecords,
  saveAttendanceCheckin,
} from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized: Student login required.' }, { status: 401 });
    }

    const allStudents = await getStudents();
    const student = allStudents.find(
      (s) =>
        s.id === session.userId ||
        s.studentNumber.toLowerCase() === session.username?.toLowerCase()
    );

    if (!student) {
      return NextResponse.json({ error: 'Student record not found.' }, { status: 404 });
    }

    const allSessions = await getAttendanceSessions();
    const now = Date.now();

    // Find active session for student's cohort
    const activeSession = allSessions.find((sess) => {
      if (sess.checkinStatus !== 'active') return false;
      if (sess.course !== 'ALL' && sess.course !== student.course) return false;
      if (sess.sessionStatus === 'cancelled' || sess.sessionStatus === 'postponed') return false;

      // Verify expiration
      if (sess.checkinExpiresAt) {
        const exp = new Date(sess.checkinExpiresAt).getTime();
        if (now > exp) return false;
      }
      return true;
    });

    if (!activeSession) {
      return NextResponse.json({
        success: true,
        hasActiveCheckin: false,
        hasCheckedIn: false,
        session: null,
        checkinStatus: 'none',
      });
    }

    // Check student's records & checkin state for this active session
    const [checkins, records] = await Promise.all([
      getAttendanceCheckins(activeSession.id),
      getAttendanceRecords(),
    ]);

    const existingCheckin = checkins.find((c) => c.studentId === student.id);
    const existingFinalRecord = records.find(
      (r) => r.sessionId === activeSession.id && r.studentId === student.id
    );

    const hasCheckedIn = Boolean(
      (existingCheckin && (existingCheckin.status === 'submitted' || existingCheckin.status === 'confirmed')) ||
      (existingFinalRecord && existingFinalRecord.status === 'present')
    );

    return NextResponse.json({
      success: true,
      hasActiveCheckin: true,
      hasCheckedIn,
      session: {
        id: activeSession.id,
        moduleCode: activeSession.moduleCode || 'LEC',
        moduleTitle: activeSession.moduleTitle,
        sessionType: activeSession.sessionType,
        date: activeSession.date,
        startTime: activeSession.startTime || '08:30',
        endTime: activeSession.endTime || '16:30',
        course: activeSession.course,
        checkinExpiresAt: activeSession.checkinExpiresAt,
      },
      checkinStatus: hasCheckedIn ? 'confirmed' : 'available',
      submittedAt: existingCheckin?.submittedAt,
    });
  } catch (err: any) {
    console.error('Student check-in GET error:', err);
    return NextResponse.json({ error: 'Failed to retrieve check-in state.' }, { status: 500 });
  }
}

// POST: Student taps Check-In (marks present directly for admin list)
export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized: Student login required.' }, { status: 401 });
    }

    const allStudents = await getStudents();
    const student = allStudents.find(
      (s) =>
        s.id === session.userId ||
        s.studentNumber.toLowerCase() === session.username?.toLowerCase()
    );

    if (!student) {
      return NextResponse.json({ error: 'Student record not found.' }, { status: 404 });
    }

    const body = await req.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required.' }, { status: 400 });
    }

    const allSessions = await getAttendanceSessions();
    const targetSession = allSessions.find((s) => s.id === sessionId);

    if (!targetSession) {
      return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
    }

    if (targetSession.checkinStatus !== 'active') {
      return NextResponse.json({ error: 'Check-in window is currently closed for this session.' }, { status: 400 });
    }

    if (targetSession.sessionStatus === 'cancelled' || targetSession.sessionStatus === 'postponed') {
      return NextResponse.json({ error: 'This lecture session was cancelled or postponed.' }, { status: 400 });
    }

    // Cohort boundary check
    if (targetSession.course !== 'ALL' && targetSession.course !== student.course) {
      return NextResponse.json({ error: `This lecture session is restricted to ${targetSession.course} students.` }, { status: 403 });
    }

    // Expiry check
    if (targetSession.checkinExpiresAt) {
      if (Date.now() > new Date(targetSession.checkinExpiresAt).getTime()) {
        return NextResponse.json({ error: 'Check-in window has expired.' }, { status: 400 });
      }
    }

    // Save check-in
    const saved = await saveAttendanceCheckin({
      sessionId,
      studentId: student.id,
      studentNumber: student.studentNumber,
      studentName: student.fullName,
      course: student.course,
      status: 'confirmed',
    });

    return NextResponse.json({
      success: true,
      hasCheckedIn: true,
      message: `You are checked in for ${targetSession.moduleTitle}!`,
      checkin: saved,
    });
  } catch (err: any) {
    console.error('Student check-in POST error:', err);
    return NextResponse.json({ error: err.message || 'Failed to submit check-in.' }, { status: 500 });
  }
}
