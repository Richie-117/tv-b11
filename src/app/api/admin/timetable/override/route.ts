import { NextRequest, NextResponse } from 'next/server';
import { saveTimetableOverride, deleteTimetableOverride } from '@/lib/db';
import { requireAdminPermission } from '@/lib/auth';
import { recordAdminAuditLog } from '@/lib/audit';

export async function POST(req: NextRequest) {
  const auth = await requireAdminPermission(req, 'timetables:write');
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const {
      timetableId,
      timetableSlotId,
      course,
      exceptionDate,
      status,
      reason,
      rescheduledDate,
      rescheduledStartTime,
      rescheduledEndTime,
    } = body;

    if (!exceptionDate || !status) {
      return NextResponse.json({ error: 'Exception date and status are required.' }, { status: 400 });
    }

    const override = await saveTimetableOverride({
      timetableId,
      timetableSlotId,
      course,
      exceptionDate,
      status,
      reason,
      rescheduledDate,
      rescheduledStartTime,
      rescheduledEndTime,
      isActive: true,
      updatedBy: auth.user.name,
    });

    await recordAdminAuditLog({
      admin: auth.user,
      action: 'TIMETABLE_OVERRIDE_SAVED',
      targetType: 'timetable_override',
      targetId: override.id,
      details: { course, exceptionDate, status, reason },
    });

    return NextResponse.json({ success: true, override });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to save timetable override.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdminPermission(req, 'timetables:write');
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Override ID is required.' }, { status: 400 });
  }

  await deleteTimetableOverride(id);

  await recordAdminAuditLog({
    admin: auth.user,
    action: 'TIMETABLE_OVERRIDE_REMOVED',
    targetType: 'timetable_override',
    targetId: id,
  });

  return NextResponse.json({ success: true, message: 'Override removed.' });
}

