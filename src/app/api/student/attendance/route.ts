import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { getAttendanceSessions, getAttendanceRecords, getStudents } from '@/lib/db';
import { calculateStudentAttendanceMetrics, TRACKING_START_DATE } from '@/lib/attendanceCalculations';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession(req);
    const { searchParams } = new URL(req.url);
    const queryStudentId = searchParams.get('studentId') || undefined;

    const allStudents = await getStudents();
    let targetStudent = null;

    const cleanSessionUsername = (session?.username || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

    if (session?.role === 'student') {
      // Students view their own attendance records
      targetStudent = allStudents.find(
        (s) =>
          s.id === session.userId ||
          s.studentNumber.toLowerCase() === session.username?.toLowerCase() ||
          s.studentNumber.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === cleanSessionUsername
      );
      if (!targetStudent) {
        return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });
      }
    } else if (session?.role === 'superadmin' || session?.role === 'representative') {
      if (queryStudentId) {
        const cleanQuery = queryStudentId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        targetStudent = allStudents.find(
          (s) =>
            s.id === queryStudentId ||
            s.studentNumber.toUpperCase() === queryStudentId.toUpperCase() ||
            s.studentNumber.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() === cleanQuery
        );
      } else {
        // Representative or Admin viewing their own attendance dashboard
        targetStudent = allStudents.find(
          (s) =>
            s.id === session.userId ||
            s.studentNumber.toLowerCase() === session.username?.toLowerCase() ||
            s.studentNumber.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === cleanSessionUsername
        );
      }

      if (!targetStudent) {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 });
      }
    } else {
      return NextResponse.json({ error: 'Unauthorized: Student or Admin login required' }, { status: 401 });
    }

    if (!targetStudent) {
      return NextResponse.json({ error: 'No student found' }, { status: 404 });
    }

    const [allSessions, allRecords] = await Promise.all([
      getAttendanceSessions(),
      getAttendanceRecords(),
    ]);

    // Calculate metrics using authoritative shared calculation
    const metrics = calculateStudentAttendanceMetrics(
      {
        id: targetStudent.id,
        studentNumber: targetStudent.studentNumber,
        course: targetStudent.course,
      },
      allSessions,
      allRecords
    );

    // Format calendarMarks for the mobile calendar visualizer
    const calendarMarks = metrics.sessionDetails.map((item) => ({
      sessionId: item.sessionId,
      date: item.date,
      moduleCode: item.moduleCode,
      moduleTitle: item.moduleTitle,
      sessionType: item.sessionType,
      status: item.status,
      remarks: item.remarks || '',
      isValid: item.isValid,
    }));

    return NextResponse.json({
      success: true,
      trackingStartDate: TRACKING_START_DATE,
      student: {
        id: targetStudent.id,
        fullName: targetStudent.fullName,
        studentNumber: targetStudent.studentNumber,
        course: targetStudent.course,
      },
      stats: {
        totalSessions: metrics.validSessionsCount,
        presentCount: metrics.presentCount,
        absentCount: metrics.absentCount,
        excusedCount: metrics.excusedCount,
        attendanceRate: metrics.rate,
        formattedRate: metrics.formattedRate,
        hasData: metrics.hasData,
      },
      calendarMarks,
    });
  } catch (error) {
    console.error('Failed to retrieve student attendance:', error);
    return NextResponse.json({ error: 'Failed to retrieve student attendance' }, { status: 500 });
  }
}
