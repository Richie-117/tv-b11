import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { AdminUser, AdminRole } from '@/types';
import { getSupabaseAdmin } from './supabase';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'ucr-new-portal-mobile-first-secret-key-2026-secure'
);

export const ADMIN_AUTH_COOKIE_NAME = 'ucr_admin_session';

/**
 * Official Batch 11 Representatives with automatic Administrator privileges.
 */
export const BATCH_11_REPRESENTATIVE_INDICES = [
  'RT/TPOPT/26/02', // P.A. Hesan Samudika (TPOPT Male Representative)
  'RT/TPOPT/26/22', // P. Tharushika Nethmi (TPOPT Female Representative)
  'RT/TPRPT/26/14', // M. Rafidh Rizwan (TPRPT Male Representative)
  'RT/TPRPT/26/21', // Yenuki Ruhansa Atapattu (TPRPT Female Representative)
];

export function isBatchRepresentative(studentNumber?: string, id?: string): boolean {
  if (!studentNumber && !id) return false;
  const clean = (studentNumber || '').trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return (
    BATCH_11_REPRESENTATIVE_INDICES.some(
      (idx) => idx.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() === clean
    ) ||
    id === 'student-tpopt-005' ||
    id === 'student-tpopt-003' ||
    id === 'student-tprpt-002' ||
    id === 'student-tprpt-015'
  );
}

export interface AdminTokenPayload {
  userId: string;
  username: string;
  email: string;
  name: string;
  role: AdminRole;
  representativeCourse?: 'TPOPT' | 'TPRPT';
  representativeRole?: string;
  permissions: string[];
}

/**
 * Creates an HTTP-only JWT session token.
 */
export async function createAdminSessionToken(payload: AdminTokenPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(JWT_SECRET);
}

/**
 * Verifies a JWT session token.
 */
export async function verifyAdminSessionToken(token: string): Promise<AdminTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as AdminTokenPayload;
  } catch {
    return null;
  }
}

/**
 * Reads and verifies the current session from incoming request cookies or Authorization header.
 */
export async function getSessionFromRequest(req: NextRequest): Promise<AdminTokenPayload | null> {
  const tokenFromCookie = req.cookies.get(ADMIN_AUTH_COOKIE_NAME)?.value;
  const authHeader = req.headers.get('Authorization');
  const tokenFromHeader = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

  const token = tokenFromCookie || tokenFromHeader;
  if (!token) return null;

  return await verifyAdminSessionToken(token);
}

export const getAdminSession = getSessionFromRequest;


/**
 * Reads the current session inside Server Components or Server Actions.
 */
export async function getCurrentAdminUser(): Promise<AdminTokenPayload | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(ADMIN_AUTH_COOKIE_NAME)?.value;
  if (!token) return null;

  return await verifyAdminSessionToken(token);
}

/**
 * Verifies whether the current user has a specific permission code.
 * Super Admins automatically have all permissions.
 */
export function hasPermission(user: AdminTokenPayload | null, permissionCode: string): boolean {
  if (!user) return false;
  if (user.role === 'superadmin') return true;
  if (isBatchRepresentative(user.username, user.userId)) {
    const repAllowed = [
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
    if (repAllowed.includes(permissionCode)) return true;
  }
  return user.permissions?.includes(permissionCode) || false;
}

/**
 * Enforces permission in API Route Handlers.
 */
export async function requireAdminPermission(
  req: NextRequest,
  permissionCode?: string
): Promise<{ user: AdminTokenPayload } | NextResponse> {
  const user = await getSessionFromRequest(req);
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required. Please sign in as an administrator.' },
      { status: 401 }
    );
  }

  if (permissionCode && !hasPermission(user, permissionCode)) {
    return NextResponse.json(
      { error: `Forbidden. You lack the required permission: ${permissionCode}` },
      { status: 403 }
    );
  }

  return { user };
}

export async function hashPassword(plain: string): Promise<string> {
  return await bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(plain, hash);
}
