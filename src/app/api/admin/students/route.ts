import { NextRequest, NextResponse } from 'next/server';
import { getStudents, updateStudent } from '@/lib/db';
import { requireAdminPermission } from '@/lib/auth';
import { recordAdminAuditLog } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const auth = await requireAdminPermission(req, 'students:read');
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const search = url.searchParams.get('q')?.toLowerCase() || '';
  const course = url.searchParams.get('course') || '';
  const label = url.searchParams.get('label') || '';

  let students = await getStudents();

  if (course && course !== 'ALL') {
    students = students.filter((s) => s.course === course);
  }

  if (label) {
    students = students.filter((s) => s.labels?.includes(label));
  }

  if (search) {
    students = students.filter((s) =>
      s.fullName.toLowerCase().includes(search) ||
      s.studentNumber.toLowerCase().includes(search) ||
      (s.phoneNumber && s.phoneNumber.toLowerCase().includes(search))
    );
  }

  return NextResponse.json({
    students,
    total: students.length,
  });
}

export async function PUT(req: NextRequest) {
  const auth = await requireAdminPermission(req, 'students:write');
  if (auth instanceof NextResponse) return auth;

  try {
    const { id, updates } = await req.json();
    if (!id || !updates) {
      return NextResponse.json({ error: 'Student ID and updates are required.' }, { status: 400 });
    }

    const updated = await updateStudent(id, updates);
    if (!updated) {
      return NextResponse.json({ error: 'Student record not found.' }, { status: 404 });
    }

    await recordAdminAuditLog({
      admin: auth.user,
      action: 'STUDENT_RECORD_UPDATE',
      targetType: 'student',
      targetId: id,
      details: { updatedFields: Object.keys(updates) },
      ipAddress: req.headers.get('x-forwarded-for') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({ success: true, student: updated });
  } catch (err: any) {
    console.error('Error updating student:', err);
    return NextResponse.json({ error: 'Failed to update student record.' }, { status: 500 });
  }
}

