import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, isBatchRepresentative } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }

  const isRep = isBatchRepresentative(session.username, session.userId);
  const effectiveUser = {
    ...session,
    role: isRep && session.role !== 'superadmin' ? ('representative' as const) : session.role,
  };

  return NextResponse.json({
    authenticated: true,
    user: effectiveUser,
  });
}

