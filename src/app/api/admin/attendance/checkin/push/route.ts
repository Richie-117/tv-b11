import { NextRequest, NextResponse } from 'next/server';
import { requireAdminPermission } from '@/lib/auth';
import { recordAdminAuditLog } from '@/lib/audit';
import {
  getAttendanceSessions,
  getAttendanceCheckins,
  updateAttendanceSessionCheckin,
  saveAttendanceSession,
} from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireAdminPermission(req, 'attendance:read');
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    const course = searchParams.get('course');
    const date = searchParams.get('date');

    const allSessions = await getAttendanceSessions();
    let targetSession = null;

    if (sessionId) {
      targetSession = allSessions.find((s) => s.id === sessionId) || null;
    } else if (course) {
      targetSession = allSessions.find(
        (s) =>
          s.checkinStatus === 'active' &&
          (s.course === 'ALL' || s.course === course)
      ) || null;
    }

    if (targetSession) {
      if (targetSession.checkinExpiresAt && Date.now() > new Date(targetSession.checkinExpiresAt).getTime()) {
        await updateAttendanceSessionCheckin(targetSession.id, 'expired');
        targetSession = null;
      }
    }

    if (!targetSession || targetSession.checkinStatus !== 'active') {
      return NextResponse.json({
        success: true,
        hasActiveSession: false,
        session: null,
        checkins: [],
        checkedInStudentIds: [],
      });
    }

    const checkins = await getAttendanceCheckins(targetSession.id);
    const validCheckins = checkins.filter((c) => c.status === 'submitted' || c.status === 'confirmed');
    const checkedInStudentIds = validCheckins.map((c) => c.studentId);

    return NextResponse.json({
      success: true,
      hasActiveSession: targetSession.checkinStatus === 'active',
      session: targetSession,
      checkins: validCheckins,
      checkedInStudentIds,
    });
  } catch (err: any) {
    console.error('Admin checkin push GET error:', err);
    return NextResponse.json({ error: err.message || 'Failed to get check-in status.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminPermission(req, 'attendance:write');
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const {
      sessionId: providedSessionId,
      action = 'open',
      durationMinutes = 30,
      date,
      course,
      moduleId,
      moduleTitle,
      moduleCode,
      sessionType = 'lecture',
      startTime = '08:30',
      endTime = '16:30',
    } = body;

    const allSessions = await getAttendanceSessions();
    let session = null;

    if (providedSessionId) {
      session = allSessions.find((s) => s.id === providedSessionId);
    } else if (date && course && moduleId) {
      // Find matching session for this date, course, and module
      session = allSessions.find(
        (s) =>
          s.date === date &&
          (s.course === course || s.course === 'ALL') &&
          (s.moduleId === moduleId || s.moduleTitle === moduleTitle)
      );

      // If no session exists yet, create one in active check-in state
      if (!session && action !== 'close') {
        const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();
        session = await saveAttendanceSession(
          {
            date,
            course,
            moduleId,
            moduleCode: moduleCode || moduleId,
            moduleTitle: moduleTitle || 'Lecture Session',
            sessionType,
            startTime,
            endTime,
            totalStudents: 0,
            presentCount: 0,
            absentCount: 0,
            markedByAdminId: auth.user.userId,
            markedByAdminName: auth.user.name,
            sessionStatus: 'held',
            checkinStatus: 'active',
            checkinOpenedAt: new Date().toISOString(),
            checkinExpiresAt: expiresAt,
          },
          []
        );
      }
    }

    if (!session) {
      return NextResponse.json({ error: 'Attendance session not found.' }, { status: 404 });
    }

    // Role check: Representatives can only manage their own cohort
    if (auth.user.role === 'representative' && auth.user.representativeCourse) {
      if (session.course !== 'ALL' && session.course !== auth.user.representativeCourse) {
        return NextResponse.json(
          { error: `Unauthorized. You can only manage check-in for ${auth.user.representativeCourse} cohort.` },
          { status: 403 }
        );
      }
    }

    // Validate that session is held and not cancelled/postponed
    if (session.sessionStatus === 'cancelled' || session.sessionStatus === 'postponed') {
      return NextResponse.json(
        { error: 'Cannot push check-in for a cancelled or postponed lecture session.' },
        { status: 400 }
      );
    }

    if (action === 'close') {
      const updated = await updateAttendanceSessionCheckin(session.id, 'closed');
      const checkins = await getAttendanceCheckins(session.id);

      await recordAdminAuditLog({
        admin: auth.user,
        action: 'ATTENDANCE_CHECKIN_CLOSED',
        targetType: 'attendance_session',
        targetId: session.id,
        details: { course: session.course, module: session.moduleTitle },
      });

      return NextResponse.json({
        success: true,
        message: 'Student check-in has been closed.',
        session: updated,
        checkinCounts: {
          submitted: checkins.filter((c) => c.status === 'submitted').length,
          confirmed: checkins.filter((c) => c.status === 'confirmed').length,
        },
      });
    }

    // Otherwise, action === 'open' (Push to Check in)
    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();
    const updated = await updateAttendanceSessionCheckin(session.id, 'active', expiresAt);
    const checkins = await getAttendanceCheckins(session.id);
    const validCheckins = checkins.filter((c) => c.status === 'submitted' || c.status === 'confirmed');

    await recordAdminAuditLog({
      admin: auth.user,
      action: 'ATTENDANCE_CHECKIN_PUSHED',
      targetType: 'attendance_session',
      targetId: session.id,
      details: {
        course: session.course,
        module: session.moduleTitle,
        durationMinutes,
        expiresAt,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Check-in published for ${session.course} cohort (${session.moduleTitle}). Open for ${durationMinutes} minutes.`,
      session: updated,
      expiresAt,
      checkedInStudentIds: validCheckins.map((c) => c.studentId),
      checkinCounts: {
        submitted: validCheckins.length,
      },
    });
  } catch (err: any) {
    console.error('Checkin push error:', err);
    return NextResponse.json({ error: err.message || 'Failed to update check-in status.' }, { status: 500 });
  }
}
