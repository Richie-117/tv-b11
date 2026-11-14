import { NextRequest, NextResponse } from 'next/server';
import { getStudents, validateAndConsumeInvitation, updateStudentEditableDetails } from '@/lib/db';
import { hashPassword, createAdminSessionToken, ADMIN_AUTH_COOKIE_NAME, isBatchRepresentative } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { studentNumber, invitationCode, password } = await req.json();

    if (!studentNumber || !invitationCode || !password) {
      return NextResponse.json(
        { error: 'Student Index Number, Invitation Code, and Password are all required.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    const cleanIndex = studentNumber.trim().toUpperCase();
    const cleanCode = invitationCode.trim().toUpperCase();

    // Verify student exists
    const allStudents = await getStudents();
    const student = allStudents.find(
      (s) => s.studentNumber.toUpperCase() === cleanIndex || s.studentNumber.toUpperCase().endsWith(cleanIndex)
    );

    if (!student) {
      return NextResponse.json(
        { error: `Student with index number "${cleanIndex}" was not found in the verified Batch 11 roster.` },
        { status: 404 }
      );
    }

    // Validate and consume the invitation code
    const isCodeValid = await validateAndConsumeInvitation(cleanCode, student.studentNumber);
    if (!isCodeValid) {
      return NextResponse.json(
        { error: 'Invalid or expired invitation code. Please ask your batch representative or super administrator for an active code.' },
        { status: 400 }
      );
    }

    // Hash the password and activate the account
    const passwordHash = await hashPassword(password);
    await updateStudentEditableDetails(student.id, {
      passwordHash,
      isActivated: true,
      activatedAt: new Date().toISOString(),
    });

    const isRep = Boolean(
      student.isRepresentative || isBatchRepresentative(student.studentNumber, student.id)
    );

    const repPermissions = [
      'students:read',
      'students:write',
      'attendance:read',
      'attendance:write',
      'timetables:write',
      'assignments:write',
      'chat:moderate',
      'tools:pdf',
      'backups:manage',
      'admins:manage',
    ];

    // Create 30-day persistent session token for the student / representative
    const sessionToken = await createAdminSessionToken({
      userId: student.id,
      username: student.studentNumber.toLowerCase(),
      email: student.email || `${student.studentNumber.replace(/\//g, '').toLowerCase()}@ucr.ac.lk`,
      name: student.fullName,
      role: isRep ? ('representative' as const) : ('student' as const),
      representativeCourse: student.course,
      representativeRole:
        student.representativeRole ||
        (isRep
          ? student.gender === 'Female'
            ? 'Female Representative'
            : 'Male Representative'
          : undefined),
      permissions: isRep ? repPermissions : ['students:read', 'attendance:read'],
    });

    const response = NextResponse.json({
      success: true,
      message: `Account activated successfully! Welcome to Division of Television Studies, ${student.fullName}${isRep ? ' (Batch Representative)' : ''}.`,
      redirectUrl: isRep ? '/admin' : '/student',
      student: {
        id: student.id,
        fullName: student.fullName,
        studentNumber: student.studentNumber,
        course: student.course,
        isRepresentative: isRep,
      },
    });

    // Set HTTP-only 30-day cookie
    response.cookies.set({
      name: ADMIN_AUTH_COOKIE_NAME,
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (err) {
    console.error('Student activation error:', err);
    return NextResponse.json(
      { error: 'Internal server error while activating student account.' },
      { status: 500 }
    );
  }
}

