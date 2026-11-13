import { NextRequest, NextResponse } from 'next/server';
import { requireAdminPermission } from '@/lib/auth';
import { recordAdminAuditLog } from '@/lib/audit';
import {
  getStudentInvitations,
  createStudentInvitation,
  deleteStudentInvitation,
  getStudents,
} from '@/lib/db';

export async function GET(req: NextRequest) {
  const auth = await requireAdminPermission(req);
  if (auth instanceof NextResponse) return auth;

  const [invitations, students] = await Promise.all([
    getStudentInvitations(),
    getStudents(),
  ]);

  return NextResponse.json({ invitations, students });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminPermission(req, 'admins:manage');
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { mode, studentId, studentNumber, studentName, course } = body;
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(); // 7 days

    if (mode === 'bulk') {
      const allStudents = await getStudents();
      const existing = await getStudentInvitations();
      const targetStudents = allStudents.filter((s) => {
        if (course && course !== 'ALL' && s.course !== course) return false;
        return true;
      });

      const created: any[] = [];
      for (const st of targetStudents) {
        // Skip if student already has an active, unused code
        const hasActive = existing.some(
          (inv) =>
            inv.studentNumber?.toUpperCase() === st.studentNumber.toUpperCase() &&
            !inv.isUsed &&
            new Date(inv.expiresAt).getTime() > Date.now()
        );
        if (hasActive) continue;

        const cleanIdx = st.studentNumber.replace(/[^A-Za-z0-9]/g, '');
        const randomSuffix = Math.floor(100 + Math.random() * 900);
        const code = `UCR-${st.course}-${cleanIdx}-${randomSuffix}`;

        const inv = await createStudentInvitation({
          code,
          studentId: st.id,
          studentNumber: st.studentNumber,
          studentName: st.fullName,
          course: st.course,
          expiresAt,
        });
        created.push(inv);
      }

      await recordAdminAuditLog({
        admin: auth.user,
        action: 'STUDENT_INVITATIONS_BULK_GENERATED',
        targetType: 'invitations',
        targetId: 'bulk',
        details: { count: created.length, course: course || 'ALL' },
      });

      return NextResponse.json({ success: true, count: created.length, created });
    }

    if (mode === 'single' && studentNumber) {
      const cleanIdx = studentNumber.replace(/[^A-Za-z0-9]/g, '');
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const code = `UCR-${course || 'B11'}-${cleanIdx}-${randomSuffix}`;

      const newInvite = await createStudentInvitation({
        code,
        studentId,
        studentNumber,
        studentName: studentName || studentNumber,
        course: course || 'ALL',
        expiresAt,
      });

      await recordAdminAuditLog({
        admin: auth.user,
        action: 'STUDENT_INVITATION_GENERATED',
        targetType: 'invitation',
        targetId: newInvite.id,
        details: { code: newInvite.code, studentNumber, studentName },
      });

      return NextResponse.json({ success: true, invitation: newInvite });
    }

    // Fallback: General intake token
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const code = `UCR-2026-${course || 'ALL'}-${randomSuffix}`;
    const newInvite = await createStudentInvitation({
      code,
      course: course || 'ALL',
      studentName: studentName || 'General Intake Onboarding',
      expiresAt,
      isGeneral: true,
    });

    await recordAdminAuditLog({
      admin: auth.user,
      action: 'STUDENT_INVITATION_GENERATED',
      targetType: 'invitation',
      targetId: newInvite.id,
      details: { code: newInvite.code, course: newInvite.course },
    });

    return NextResponse.json({ success: true, invitation: newInvite });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to generate invitation code.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdminPermission(req, 'admins:manage');
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Invitation ID required' }, { status: 400 });
    }

    await deleteStudentInvitation(id);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to revoke invitation code.' }, { status: 500 });
  }
}
