import { NextRequest, NextResponse } from 'next/server';
import {
  getAttendanceSessions,
  getStudents,
  saveAttendanceCheckin,
  getAttendanceCheckins,
  getAttendanceRecords,
} from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, studentNumber, course, lastNumber } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required.' }, { status: 400 });
    }

    if (!studentNumber && (!course || !lastNumber)) {
      return NextResponse.json({
        error: 'Please select your programme and enter your student index number.',
      }, { status: 400 });
    }

    // 1. Verify Active Session
    const allSessions = await getAttendanceSessions();
    let targetSession = allSessions.find((s) => s.id === sessionId);

    if (!targetSession) {
      return NextResponse.json({ error: 'Lecture session not found.' }, { status: 404 });
    }

    if (targetSession.checkinStatus !== 'active') {
      return NextResponse.json({
        error: 'The attendance check-in window for this lecture is currently closed.',
      }, { status: 400 });
    }

    if (targetSession.sessionStatus === 'cancelled' || targetSession.sessionStatus === 'postponed') {
      return NextResponse.json({
        error: 'This lecture session was cancelled or postponed.',
      }, { status: 400 });
    }

    if (targetSession.checkinExpiresAt) {
      if (Date.now() > new Date(targetSession.checkinExpiresAt).getTime()) {
        return NextResponse.json({
          error: 'The check-in window for this lecture has expired.',
        }, { status: 400 });
      }
    }

    // 2. Resolve Student
    const allStudents = await getStudents();
    let targetStudent = null;

    if (studentNumber) {
      const cleanInput = studentNumber.trim().toUpperCase();
      const cleanAlphaNumeric = cleanInput.replace(/[^a-zA-Z0-9]/g, '');

      targetStudent = allStudents.find((s) => {
        const sClean = s.studentNumber.toUpperCase();
        const sAlphaNumeric = sClean.replace(/[^a-zA-Z0-9]/g, '');
        return sClean === cleanInput || sAlphaNumeric === cleanAlphaNumeric;
      });
    }

    // Fallback: match by course + lastNumber digits
    if (!targetStudent && course && lastNumber) {
      const digitsPadded = String(lastNumber).replace(/\D/g, '').padStart(2, '0');
      targetStudent = allStudents.find((s) => {
        if (s.course !== course) return false;
        const match = s.studentNumber.match(/(\d+)$/);
        return match && match[1].padStart(2, '0') === digitsPadded;
      });
    }

    if (!targetStudent) {
      return NextResponse.json({
        error: `Could not find an enrolled Batch 11 student matching the provided index (${course || ''} #${lastNumber || studentNumber}).`,
      }, { status: 404 });
    }

    // 3. Find Best Matching Session for Student Cohort
    if (targetSession.course !== 'ALL' && targetSession.course !== targetStudent.course) {
      // Look for a concurrent active session specifically opened for student's cohort
      const matchingCohortSession = allSessions.find(
        (s) =>
          s.checkinStatus === 'active' &&
          (s.course === targetStudent.course || s.course === 'ALL')
      );
      if (matchingCohortSession) {
        targetSession = matchingCohortSession;
      }
    }

    // 4. Device / Proxy Lock Check (One student per device per session)
    const deviceCookie = req.cookies.get(`tv_checkin_${targetSession.id}`)?.value;
    if (deviceCookie && deviceCookie.trim().toUpperCase() !== targetStudent.studentNumber.toUpperCase()) {
      return NextResponse.json(
        {
          success: false,
          proxyBlocked: true,
          error: `Device Limit Reached: This device has already completed check-in for this session (${deviceCookie}). One student per device per session is enforced. Proxy check-ins for other students are prohibited.`,
        },
        { status: 403 }
      );
    }

    // 5. Check if already checked in / recorded
    const [checkins, records] = await Promise.all([
      getAttendanceCheckins(targetSession.id),
      getAttendanceRecords(),
    ]);

    const alreadyInCheckins = checkins.some(
      (c) =>
        (c.studentId === targetStudent.id || c.studentNumber?.toUpperCase() === targetStudent.studentNumber.toUpperCase()) &&
        (c.status === 'submitted' || c.status === 'confirmed')
    );

    const alreadyInRecords = records.some(
      (r) =>
        r.sessionId === targetSession.id &&
        (r.studentId === targetStudent.id || r.studentNumber?.toUpperCase() === targetStudent.studentNumber.toUpperCase()) &&
        r.status === 'present'
    );

    if (alreadyInCheckins || alreadyInRecords) {
      return NextResponse.json(
        {
          success: false,
          alreadyCheckedIn: true,
          error: `Already Recorded: ${targetStudent.fullName} (${targetStudent.studentNumber}) is already recorded for this lecture session. Double check-in is not permitted.`,
          student: {
            id: targetStudent.id,
            fullName: targetStudent.fullName,
            studentNumber: targetStudent.studentNumber,
            course: targetStudent.course,
          },
          session: {
            id: targetSession.id,
            moduleTitle: targetSession.moduleTitle,
          },
        },
        { status: 409 }
      );
    }

    // 6. Save the confirmed check-in (marks present on admin side in real-time)
    const saved = await saveAttendanceCheckin({
      sessionId: targetSession.id,
      studentId: targetStudent.id,
      studentNumber: targetStudent.studentNumber,
      studentName: targetStudent.fullName,
      course: targetStudent.course,
      status: 'confirmed',
    });

    const response = NextResponse.json({
      success: true,
      alreadyCheckedIn: false,
      message: `Checked in successfully! Marked Present for ${targetSession.moduleTitle}.`,
      student: {
        id: targetStudent.id,
        fullName: targetStudent.fullName,
        studentNumber: targetStudent.studentNumber,
        course: targetStudent.course,
      },
      session: {
        id: targetSession.id,
        moduleTitle: targetSession.moduleTitle,
      },
      checkin: saved,
      timestamp: new Date().toISOString(),
    });

    // Bind this device to this student for this session
    response.cookies.set(`tv_checkin_${targetSession.id}`, targetStudent.studentNumber, {
      httpOnly: false,
      maxAge: 86400,
      path: '/',
      sameSite: 'lax',
    });

    return response;
  } catch (err: any) {
    console.error('Public checkin submit POST error:', err);
    return NextResponse.json({ error: err.message || 'Failed to submit check-in.' }, { status: 500 });
  }
}

