import { NextRequest, NextResponse } from 'next/server';
import { getAdmins, updateAdminPermissions } from '@/lib/db';
import { requireAdminPermission } from '@/lib/auth';
import { recordAdminAuditLog } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const auth = await requireAdminPermission(req, 'admins:manage');
  if (auth instanceof NextResponse) return auth;

  if (auth.user.role !== 'superadmin') {
    return NextResponse.json({ error: 'Super Admin privileges required.' }, { status: 403 });
  }

  const admins = await getAdmins();
  return NextResponse.json({ admins });
}

export async function PUT(req: NextRequest) {
  const auth = await requireAdminPermission(req, 'admins:manage');
  if (auth instanceof NextResponse) return auth;

  if (auth.user.role !== 'superadmin') {
    return NextResponse.json({ error: 'Super Admin privileges required.' }, { status: 403 });
  }

  try {
    const { id, permissions } = await req.json();
    if (!id || !Array.isArray(permissions)) {
      return NextResponse.json({ error: 'Admin ID and permissions array required.' }, { status: 400 });
    }

    await updateAdminPermissions(id, permissions);

    await recordAdminAuditLog({
      admin: auth.user,
      action: 'ADMIN_PERMISSIONS_UPDATED',
      targetType: 'admin',
      targetId: id,
      details: { newPermissions: permissions },
    });

    return NextResponse.json({ success: true, message: 'Permissions updated.' });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to update admin permissions.' }, { status: 500 });
  }
}

