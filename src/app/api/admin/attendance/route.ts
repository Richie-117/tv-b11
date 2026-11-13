import { NextRequest, NextResponse } from 'next/server';
import {
  getAttendanceSessions,
  saveAttendanceSession,
  deleteAttendanceSession,
  getAttendanceRecords,
  getStudents,
} from '@/lib/db';
import { requireAdminPermission } from '@/lib/auth';
import { recordAdminAuditLog } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const auth = await requireAdminPermission(req, 'attendance:read');
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const course = url.searchParams.get('course');
  const moduleId = url.searchParams.get('moduleId');
  const dateFilter = url.searchParams.get('date');
  const weekStart = url.searchParams.get('weekStart');
  const weekEnd = url.searchParams.get('weekEnd');
  const includeAbsentees = url.searchParams.get('includeAbsentees') === 'true';

  let sessions = await getAttendanceSessions();
  const allRecords = await getAttendanceRecords();
  const allStudents = await getStudents();

  if (course && course !== 'ALL') {
    sessions = sessions.filter((s) => s.course === course || s.course === 'ALL');
  }

  if (moduleId && moduleId !== 'ALL') {
    sessions = sessions.filter((s) => s.moduleId === moduleId);
  }

  if (dateFilter) {
    sessions = sessions.filter((s) => s.date === dateFilter);
  } else if (weekStart && weekEnd) {
    sessions = sessions.filter((s) => s.date >= weekStart && s.date <= weekEnd);
  }

  // Calculate high-level summary metrics
  const totalSessions = sessions.length;
  let totalPresent = 0;
  let totalAbsent = 0;
  sessions.forEach((s) => {
    totalPresent += s.presentCount || 0;
    totalAbsent += s.absentCount || 0;
  });
  const totalRecords = totalPresent + totalAbsent;
  const overallPercentage = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0;

  // Compile absentee roster
  const sessionIds = new Set(sessions.map((s) => s.id));
  const studentMap = new Map(allStudents.map((st) => [st.id, st]));

  const absenteesList: any[] = [];
  allRecords.forEach((rec) => {
    if (rec.status === 'absent' && sessionIds.has(rec.sessionId)) {
      const student = studentMap.get(rec.studentId) || allStudents.find((s) => s.studentNumber === rec.studentNumber);
      const session = sessions.find((s) => s.id === rec.sessionId);
      absenteesList.push({
        recordId: rec.id,
        sessionId: rec.sessionId,
        sessionDate: session?.date || rec.markedAt.split('T')[0],
        moduleTitle: session?.moduleTitle || 'Academic Lecture',
        moduleCode: session?.moduleCode || '',
        studentId: rec.studentId,
        studentNumber: rec.studentNumber,
        studentName: rec.studentName,
        course: rec.course,
        phoneNumber: student?.phoneNumber || null,
        parentPhone: student?.parentGuardianPhone || null,
        remarks: rec.remarks || '',
      });
    }
  });

  return NextResponse.json({
    sessions,
    records: allRecords,
    metrics: {
      totalSessions,
      totalPresent,
      totalAbsent,
      overallPercentage,
    },
    absentees: {
      count: absenteesList.length,
      list: absenteesList,
    },
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminPermission(req, 'attendance:write');
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { date, course, moduleId, moduleCode, moduleTitle, sessionType, startTime, endTime, notes, records } = body;

    if (!date || !course || !moduleId || !records || !Array.isArray(records)) {
      return NextResponse.json({ error: 'Missing required session details or records array.' }, { status: 400 });
    }

    const presentCount = records.filter((r: any) => r.status === 'present').length;
    const absentCount = records.filter((r: any) => r.status === 'absent').length;

    const session = await saveAttendanceSession(
      {
        date,
        course,
        moduleId,
        moduleCode,
        moduleTitle: moduleTitle || 'Academic Module',
        sessionType: sessionType || 'lecture',
        startTime,
        endTime,
        totalStudents: records.length,
        presentCount,
        absentCount,
        markedByAdminId: auth.user.userId,
        markedByAdminName: auth.user.name,
        notes,
      },
      records
    );

    await recordAdminAuditLog({
      admin: auth.user,
      action: 'ATTENDANCE_SESSION_RECORDED',
      targetType: 'attendance_session',
      targetId: session.id,
      details: {
        date,
        course,
        moduleTitle,
        presentCount,
        absentCount,
        totalStudents: records.length,
      },
      ipAddress: req.headers.get('x-forwarded-for') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({ success: true, session });
  } catch (err: any) {
    console.error('Error saving attendance session:', err);
    return NextResponse.json({ error: 'Failed to record attendance session.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdminPermission(req, 'attendance:write');
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Session ID is required.' }, { status: 400 });
  }

  await deleteAttendanceSession(id);

  await recordAdminAuditLog({
    admin: auth.user,
    action: 'ATTENDANCE_SESSION_DELETED',
    targetType: 'attendance_session',
    targetId: id,
  });

  return NextResponse.json({ success: true, message: 'Session deleted successfully.' });
}
