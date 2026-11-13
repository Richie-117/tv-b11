import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { getAttendanceSessions, getAttendanceRecords, getStudents } from '@/lib/db';
import { generateAttendanceExcelWorkbook, AttendanceExportFilters } from '@/lib/excelExport';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession(req);
    if (!session || (session.role !== 'superadmin' && session.role !== 'representative')) {
      return NextResponse.json({ error: 'Unauthorized: Admin or Representative access required' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId') || undefined;
    const course = searchParams.get('course') || undefined;
    const moduleId = searchParams.get('moduleId') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const stage = searchParams.get('stage') || undefined;
    const absenteesOnly = searchParams.get('absenteesOnly') === 'true';

    // If representative is restricted to a course, enforce it
    let targetCourse = course;
    if (session.role === 'representative' && session.representativeCourse) {
      targetCourse = session.representativeCourse;
    }

    const filters: AttendanceExportFilters = {
      sessionId,
      course: targetCourse,
      moduleId,
      startDate,
      endDate,
      stage,
      absenteesOnly,
    };

    const [allSessions, allRecords, allStudents] = await Promise.all([
      getAttendanceSessions(),
      getAttendanceRecords(),
      getStudents(),
    ]);

    const metadata = {
      exportedBy: session.name || session.username || 'TV Studies Administrator',
      exportedByRole: session.role === 'superadmin' ? 'Super Administrator' : 'Student Representative',
      generatedAt: new Date().toLocaleString('en-US', { timeZone: 'Asia/Colombo' }),
    };

    const buffer = await generateAttendanceExcelWorkbook(
      allSessions,
      allRecords,
      allStudents,
      filters,
      metadata
    );

    const nowStr = new Date().toISOString().split('T')[0];
    const filename = `UCR_Batch11_Attendance_${targetCourse || 'ALL'}_${nowStr}.xlsx`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error: any) {
    console.error('Error generating Excel attendance export:', error);
    return NextResponse.json(
      { error: 'Failed to generate module-separated attendance Excel export', details: error.message },
      { status: 500 }
    );
  }
}
