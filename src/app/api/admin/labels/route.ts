import { NextRequest, NextResponse } from 'next/server';
import { getStudentLabels, createStudentLabel } from '@/lib/db';
import { requireAdminPermission } from '@/lib/auth';
import { recordAdminAuditLog } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const auth = await requireAdminPermission(req, 'students:read');
  if (auth instanceof NextResponse) return auth;

  const labels = await getStudentLabels();
  return NextResponse.json({ labels });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminPermission(req, 'students:write');
  if (auth instanceof NextResponse) return auth;

  try {
    const { name, color, description } = await req.json();
    if (!name || !color) {
      return NextResponse.json({ error: 'Label name and color are required.' }, { status: 400 });
    }

    const newLabel = await createStudentLabel({ name, color, description });

    await recordAdminAuditLog({
      admin: auth.user,
      action: 'STUDENT_LABEL_CREATE',
      targetType: 'label',
      targetId: newLabel.id,
      details: { name: newLabel.name, color: newLabel.color },
    });

    return NextResponse.json({ success: true, label: newLabel });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to create student label.' }, { status: 500 });
  }
}

