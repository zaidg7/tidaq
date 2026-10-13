import { NextResponse, type NextRequest } from 'next/server';
import { isAdminEmail, safeAdminPath } from '@tidaq/core';
import { refreshSession } from '@/lib/admin/gotrue';
import { ADMIN_COOKIES, adminEmails, clearSession, setSession } from '@/lib/admin/session';

/**
 * Renews an expired access token with the refresh token, then returns to the page. Pages can't
 * set cookies, so `requireAdmin` sends the browser through here.
 */
export async function GET(request: NextRequest) {
  const next = safeAdminPath(request.nextUrl.searchParams.get('next'));
  const token = request.cookies.get(ADMIN_COOKIES.refresh)?.value;
  const to = (path: string) => NextResponse.redirect(new URL(path, request.url), 303);

  if (token) {
    try {
      const session = await refreshSession(token);
      if (isAdminEmail(session.user.email, adminEmails())) {
        const response = to(next);
        setSession(response, request, session);
        return response;
      }
    } catch (e) {
      console.error('[admin] refresh failed', (e as Error).message);
    }
  }
  const response = to('/admin/login?error=expired');
  clearSession(response, request);
  return response;
}
