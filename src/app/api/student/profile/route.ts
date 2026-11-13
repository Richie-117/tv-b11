import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { getStudents, updateStudentEditableDetails } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized: Student login required' }, { status: 401 });
    }

    const students = await getStudents();
    const student = students.find((s) => s.id === session.userId || s.studentNumber.toLowerCase() === session.username?.toLowerCase());

    if (!student) {
      return NextResponse.json({ error: 'Student record not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, student });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to retrieve profile' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getAdminSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized: Student login required' }, { status: 401 });
    }

    const body = await req.json();
    const studentIdentifier = session.userId || session.username;
    if (!studentIdentifier) {
      return NextResponse.json({ error: 'Student identifier required' }, { status: 400 });
    }

    // STRICTLY ENFORCE LOCKED FIELDS:
    // Only pass allowed editable contact fields to the database updater
    const updated = await updateStudentEditableDetails(studentIdentifier, {
      phoneNumber: body.phoneNumber,
      email: body.email,
      residentialAddress: body.residentialAddress,
      parentGuardianName: body.parentGuardianName,
      parentGuardianPhone: body.parentGuardianPhone,
      emergencyContact: body.emergencyContact,
      profileImageUrl: body.profileImageUrl,
      notes: body.notes,
    });

    if (!updated) {
      return NextResponse.json({ error: 'Student record not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Contact details updated successfully. Official academic identity remains locked.',
      student: updated,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}

