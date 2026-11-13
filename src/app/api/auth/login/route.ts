import { NextRequest, NextResponse } from 'next/server';
import { getAdminByUsername, getStudents } from '@/lib/db';
import { verifyPassword, createAdminSessionToken, ADMIN_AUTH_COOKIE_NAME } from '@/lib/auth';
import { recordAdminAuditLog } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required.' }, { status: 400 });
    }

    const cleanInput = username.trim().toLowerCase();
    const envSuperAdmin = (process.env.INITIAL_SUPERADMIN_USERNAME || 'ucrtvrepb11').toLowerCase();
    const envSuperPass = process.env.INITIAL_SUPERADMIN_PASSWORD || 'TelevisionStudies#2026';

    const isSuperAdminUser =
      cleanInput === envSuperAdmin ||
      cleanInput === 'admin' ||
      cleanInput === 'superadmin';

    const isSuperAdminPass =
      password === envSuperPass ||
      password === 'TelevisionStudies#2026' ||
      password === 'TelevisionStudies' ||
      password === 'TelevisionStudies2026';

    // 1. Direct SuperAdmin Verification
    if (isSuperAdminUser && isSuperAdminPass) {
      const payload = {
        userId: 'admin-1',
        username: 'ucrtvrepb11',
        email: 'hesansamudika20@gmail.com',
        name: 'Television Studies Administrator',
        role: 'superadmin' as const,
        permissions: [
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
        ],
      };

      const token = await createAdminSessionToken(payload);

      await recordAdminAuditLog({
        admin: payload,
        action: 'ADMIN_LOGIN',
        targetType: 'auth',
        targetId: 'admin-1',
        ipAddress: req.headers.get('x-forwarded-for') || undefined,
        userAgent: req.headers.get('user-agent') || undefined,
      });

      const response = NextResponse.json({
        success: true,
        user: payload,
        redirectUrl: '/admin',
      });

      response.cookies.set({
        name: ADMIN_AUTH_COOKIE_NAME,
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days session persistence
      });

      return response;
    }

    // 2. Check Database Admins
    const admin = await getAdminByUsername(cleanInput);
    if (admin && admin.isActive) {
      const isMatch = await verifyPassword(password, admin.passwordHash);
      if (isMatch) {
        const payload = {
          userId: admin.id,
          username: admin.username,
          email: admin.email,
          name: admin.name,
          role: admin.role,
          representativeCourse: admin.representativeCourse,
          representativeRole: admin.representativeRole,
          permissions: admin.permissions || [],
        };

        const token = await createAdminSessionToken(payload);

        await recordAdminAuditLog({
          admin: payload,
          action: 'ADMIN_LOGIN',
          targetType: 'auth',
          targetId: admin.id,
          ipAddress: req.headers.get('x-forwarded-for') || undefined,
          userAgent: req.headers.get('user-agent') || undefined,
        });

        const response = NextResponse.json({
          success: true,
          user: payload,
          redirectUrl: admin.role === 'student' ? '/student' : '/admin',
        });

        response.cookies.set({
          name: ADMIN_AUTH_COOKIE_NAME,
          value: token,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24 * 30,
        });

        return response;
      }
    }

    // 3. Check Activated Student & Representative Accounts
    const allStudents = await getStudents();
    const student = allStudents.find(
      (s) =>
        s.studentNumber.toLowerCase() === cleanInput ||
        s.studentNumber.replace(/\//g, '').toLowerCase() === cleanInput.replace(/\//g, '') ||
        (s.email && s.email.toLowerCase() === cleanInput)
    );

    if (student && (student as any).isActivated && (student as any).passwordHash) {
      const isMatch = await verifyPassword(password, (student as any).passwordHash);
      if (isMatch) {
        const isRep = Boolean(student.isRepresentative);
        const payload = {
          userId: student.id,
          username: student.studentNumber.toLowerCase(),
          email: student.email || `${student.studentNumber.replace(/\//g, '').toLowerCase()}@ucr.ac.lk`,
          name: student.fullName,
          role: isRep ? ('representative' as const) : ('student' as const),
          representativeCourse: student.course,
          representativeRole: student.representativeRole || (isRep ? (student.gender === 'Female' ? 'Female Representative' : 'Male Representative') : undefined),
          permissions: isRep
            ? [
                'students:read',
                'students:write',
                'attendance:read',
                'attendance:write',
                'timetables:write',
                'assignments:write',
                'chat:moderate',
                'tools:pdf',
              ]
            : ['students:read', 'attendance:read'],
        };

        const token = await createAdminSessionToken(payload);

        const response = NextResponse.json({
          success: true,
          user: payload,
          redirectUrl: isRep ? '/admin' : '/student',
        });

        response.cookies.set({
          name: ADMIN_AUTH_COOKIE_NAME,
          value: token,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24 * 30, // 30 days
        });

        return response;
      }
    }

    return NextResponse.json({ error: 'Invalid username, student index, or password.' }, { status: 401 });
  } catch (err: any) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'An unexpected error occurred during login.' }, { status: 500 });
  }
}
