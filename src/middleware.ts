import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'ucr-new-portal-mobile-first-secret-key-2026-secure'
);

const AUTH_COOKIE_NAME = 'ucr_admin_session';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Static assets & api routes bypass middleware
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/api') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  let sessionPayload: any = null;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      sessionPayload = payload;
    } catch {
      sessionPayload = null;
    }
  }

  const isLoginPage = pathname === '/login' || pathname === '/admin/login';
  const isAdminRoute = pathname.startsWith('/admin') && pathname !== '/admin/login';
  const isStudentRoute = pathname.startsWith('/student');

  // 1. If accessing protected /admin route
  if (isAdminRoute) {
    if (!sessionPayload) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    // If student tries to enter admin area, redirect to student portal
    if (sessionPayload.role === 'student') {
      return NextResponse.redirect(new URL('/student', req.url));
    }
    return NextResponse.next();
  }

  // 2. If accessing protected /student route
  if (isStudentRoute) {
    if (!sessionPayload) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // 3. If accessing /login while already authenticated, redirect to appropriate console
  if (isLoginPage && sessionPayload) {
    if (sessionPayload.role === 'superadmin' || sessionPayload.role === 'representative') {
      return NextResponse.redirect(new URL('/admin', req.url));
    } else if (sessionPayload.role === 'student') {
      return NextResponse.redirect(new URL('/student', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/student/:path*', '/login', '/admin/login'],
};
