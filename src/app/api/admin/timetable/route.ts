import { NextRequest, NextResponse } from 'next/server';
import { getTimetables, getTimetableOverrides } from '@/lib/db';
import { getLiveLectureStatus } from '@/lib/timetableService';
import { requireAdminPermission } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = await requireAdminPermission(req);
  if (auth instanceof NextResponse) return auth;

  const timetables = await getTimetables();
  const overrides = await getTimetableOverrides();
  const liveStatus = await getLiveLectureStatus();

  return NextResponse.json({
    timetables,
    overrides,
    liveStatus,
  });
}

