import { NextRequest, NextResponse } from 'next/server';
import { getAttendanceSessionById } from '@/lib/db';
import { requireAdminPermission } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdminPermission(req, 'attendance:read');
  if (auth instanceof NextResponse) return auth;

  const data = await getAttendanceSessionById(params.id);
  if (!data) {
    return NextResponse.json({ error: 'Attendance session not found.' }, { status: 404 });
  }

  return NextResponse.json(data);
}

