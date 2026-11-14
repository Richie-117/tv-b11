import { NextRequest, NextResponse } from 'next/server';
import { requireAdminPermission } from '@/lib/auth';
import { recordAdminAuditLog } from '@/lib/audit';
import {
  getAttendanceSessions,
  getAttendanceCheckins,
  confirmAttendanceCheckins,
} from '@/lib/db';

export async function POST(req: NextRequest) {
  const auth = await requireAdminPermission(req, 'attendance:write');
  if (auth instanceof NextResponse) return auth;

  try {
    const { sessionId, studentId, studentIds, confirmAll } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required.' }, { status: 400 });
    }

    const allSessions = await getAttendanceSessions();
    const session = allSessions.find((s) => s.id === sessionId);

    if (!session) {
      return NextResponse.json({ error: 'Attendance session not found.' }, { status: 404 });
    }

    // Role check: Representatives can only confirm their own cohort
    if (auth.user.role === 'representative' && auth.user.representativeCourse) {
      if (session.course !== 'ALL' && session.course !== auth.user.representativeCourse) {
        return NextResponse.json(
          { error: `Unauthorized. You can only confirm check-in for ${auth.user.representativeCourse} cohort.` },
          { status: 403 }
        );
      }
    }

    const checkins = await getAttendanceCheckins(sessionId);
    let targetIds: string[] = [];

    if (confirmAll) {
      targetIds = checkins.filter((c) => c.status === 'submitted').map((c) => c.studentId);
    } else if (Array.isArray(studentIds) && studentIds.length > 0) {
      targetIds = studentIds;
    } else if (studentId) {
      targetIds = [studentId];
    }

    if (targetIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending check-ins found to confirm.',
        updatedCount: 0,
      });
    }

    const result = await confirmAttendanceCheckins(
      sessionId,
      targetIds,
      auth.user.userId,
      auth.user.name
    );

    await recordAdminAuditLog({
      admin: auth.user,
      action: 'ATTENDANCE_CHECKIN_CONFIRMED',
      targetType: 'attendance_session',
      targetId: sessionId,
      details: {
        confirmedCount: result.updatedCount,
        studentIds: targetIds,
        course: session.course,
        module: session.moduleTitle,
      },
    });

    const updatedCheckins = await getAttendanceCheckins(sessionId);

    return NextResponse.json({
      success: true,
      message: `Confirmed attendance for ${result.updatedCount} student(s) as Present.`,
      updatedCount: result.updatedCount,
      session: result.session,
      checkins: updatedCheckins,
    });
  } catch (err: any) {
    console.error('Checkin confirm error:', err);
    return NextResponse.json({ error: err.message || 'Failed to confirm check-ins.' }, { status: 500 });
  }
}
