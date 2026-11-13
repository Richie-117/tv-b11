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
