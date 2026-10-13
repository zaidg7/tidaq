import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { NextRequest, NextResponse } from 'next/server';
import { isAdminEmail, parseAdminEmails } from '@tidaq/core';
import { hasAuth, userEmail, type AuthSession } from './gotrue';

/**
 * Admin session cookies (C-020c). All of them are scoped to `Path=/admin`, HttpOnly and
 * SameSite=Lax, so public pages never set or receive a cookie (D-15).
 */
export const ADMIN_COOKIES = {
  access: 'tidaq_admin_at',
  refresh: 'tidaq_admin_rt',
  verifier: 'tidaq_admin_pkce',
} as const;

const REFRESH_MAX_AGE = 30 * 24 * 3600;
export const VERIFIER_MAX_AGE = 3600;

export function adminEmails(): string[] {
  return parseAdminEmails(process.env.ADMIN_EMAILS);
}

/** Secure cookies whenever the request came over HTTPS (always on staging and production). */
function secure(request: NextRequest): boolean {
  return request.nextUrl.protocol === 'https:';
}

export function cookieOptions(request: NextRequest, maxAge: number) {
  return {
    httpOnly: true,
    secure: secure(request),
    sameSite: 'lax' as const,
    path: '/admin',
    maxAge,
  };
}

export function setSession(response: NextResponse, request: NextRequest, session: AuthSession) {
  response.cookies.set(
    ADMIN_COOKIES.access,
    session.access_token,
    cookieOptions(request, session.expires_in),
  );
  response.cookies.set(
    ADMIN_COOKIES.refresh,
    session.refresh_token,
    cookieOptions(request, REFRESH_MAX_AGE),
  );
}

export function clearSession(response: NextResponse, request: NextRequest) {
  for (const name of Object.values(ADMIN_COOKIES)) {
    response.cookies.set(name, '', cookieOptions(request, 0));
  }
}

/**
 * Same-origin check for the POST handlers (login, logout): browsers always send `Origin` on a
 * POST, and a cross-site form must not be able to trigger an email or a logout.
 */
export function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    return new URL(origin).host === request.nextUrl.host;
  } catch {
    return false;
  }
}

/**
 * Guard for every admin page. Valid admin → their email. Expired access token with a refresh
 * token → the refresh route renews it and comes back. Anything else → the login page.
 * Pages call this themselves (no middleware-only protection), so a routing mistake can't
 * expose a page.
 */
export async function requireAdmin(path: string): Promise<{ email: string }> {
  const jar = await cookies();
  if (!hasAuth() || adminEmails().length === 0) redirect('/admin/login?error=config');
  const access = jar.get(ADMIN_COOKIES.access)?.value;
  const hasRefresh = Boolean(jar.get(ADMIN_COOKIES.refresh)?.value);
  const email = access ? await userEmail(access) : null;

  if (email && isAdminEmail(email, adminEmails())) return { email };
  if (email) redirect('/admin/login?error=denied');
  if (hasRefresh) redirect(`/admin/auth/refresh?next=${encodeURIComponent(path)}`);
  redirect('/admin/login');
}
