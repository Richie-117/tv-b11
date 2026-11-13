import { NextRequest, NextResponse } from 'next/server';
import { getAssignments, createAssignment, updateAssignment, deleteAssignment } from '@/lib/db';
import { requireAdminPermission } from '@/lib/auth';
import { recordAdminAuditLog } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const auth = await requireAdminPermission(req);
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const course = url.searchParams.get('course');
  let assignments = await getAssignments();

  if (course && course !== 'ALL') {
    assignments = assignments.filter((a) => a.course === course || a.course === 'ALL');
  }

  return NextResponse.json({ assignments });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminPermission(req, 'assignments:write');
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { title, description, course, moduleId, moduleTitle, issueDate, deadline, priority, externalLinks } = body;

    if (!title || !course || !deadline) {
      return NextResponse.json({ error: 'Title, course target, and deadline are required.' }, { status: 400 });
    }

    const assignment = await createAssignment({
      title,
      description: description || '',
      course,
      moduleId,
      moduleTitle,
      issueDate: issueDate || new Date().toISOString().split('T')[0],
      deadline,
      priority: priority || 'normal',
      status: 'active',
      externalLinks: externalLinks || [],
      attachments: [],
      createdByAdminId: auth.user.userId,
      createdByAdminName: auth.user.name,
    });

    await recordAdminAuditLog({
      admin: auth.user,
      action: 'ASSIGNMENT_CREATED',
      targetType: 'assignment',
      targetId: assignment.id,
      details: { title, course, deadline },
    });

    return NextResponse.json({ success: true, assignment });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to create assignment.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requireAdminPermission(req, 'assignments:write');
  if (auth instanceof NextResponse) return auth;

  try {
    const { id, updates } = await req.json();
    if (!id || !updates) {
      return NextResponse.json({ error: 'ID and updates required.' }, { status: 400 });
    }

    const updated = await updateAssignment(id, updates);
    if (!updated) {
      return NextResponse.json({ error: 'Assignment not found.' }, { status: 404 });
    }

    await recordAdminAuditLog({
      admin: auth.user,
      action: 'ASSIGNMENT_UPDATED',
      targetType: 'assignment',
      targetId: id,
      details: { updatedFields: Object.keys(updates) },
    });

    return NextResponse.json({ success: true, assignment: updated });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to update assignment.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdminPermission(req, 'assignments:write');
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Assignment ID is required.' }, { status: 400 });
  }

  await deleteAssignment(id);

  await recordAdminAuditLog({
    admin: auth.user,
    action: 'ASSIGNMENT_DELETED',
    targetType: 'assignment',
    targetId: id,
  });

  return NextResponse.json({ success: true, message: 'Assignment deleted.' });
}

