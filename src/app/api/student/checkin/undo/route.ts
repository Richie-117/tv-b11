import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import {
  getStudents,
  getAttendanceSessions,
  getAttendanceCheckins,
  withdrawAttendanceCheckin,
} from '@/lib/db';

export const dynamic = 'force-dynamic';

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

    const { sessionId } = await req.json();
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required.' }, { status: 400 });
    }

    const allSessions = await getAttendanceSessions();
    const targetSession = allSessions.find((s) => s.id === sessionId);

    if (!targetSession) {
      return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
    }

    // Check if check-in is still open
    if (targetSession.checkinStatus !== 'active') {
      return NextResponse.json(
        { error: 'Cannot undo check-in because the check-in window is now closed.' },
        { status: 400 }
      );
    }

    const checkins = await getAttendanceCheckins(sessionId);
    const existing = checkins.find((c) => c.studentId === student.id);

    if (!existing) {
      return NextResponse.json({ error: 'No active check-in record found to undo.' }, { status: 404 });
    }

    if (existing.status === 'confirmed') {
      return NextResponse.json(
        { error: 'Cannot undo check-in because your attendance has already been confirmed by the batch representative.' },
        { status: 400 }
      );
    }

    await withdrawAttendanceCheckin(sessionId, student.id);

    return NextResponse.json({
      success: true,
      message: 'Check-in successfully withdrawn.',
    });
  } catch (err: any) {
    console.error('Checkin undo error:', err);
    return NextResponse.json({ error: err.message || 'Failed to undo check-in.' }, { status: 500 });
  }
}
