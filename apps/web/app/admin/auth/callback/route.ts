import { NextResponse, type NextRequest } from 'next/server';
import { isAdminEmail } from '@tidaq/core';
import { exchangeCode, logout } from '@/lib/admin/gotrue';
import { ADMIN_COOKIES, adminEmails, clearSession, setSession } from '@/lib/admin/session';

/**
 * Step 2: the magic link lands here with `?code=…`. Exchange it (PKCE: only the browser that
 * asked for the link holds the verifier cookie), check the email against `ADMIN_EMAILS`, then
 * set the session cookies.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const verifier = request.cookies.get(ADMIN_COOKIES.verifier)?.value;
  const to = (path: string) => NextResponse.redirect(new URL(path, request.url), 303);

  if (!code) return to('/admin/login?error=link');
  if (!verifier) return to('/admin/login?error=browser');

  let session;
  try {
    session = await exchangeCode(code, verifier);
  } catch (e) {
    console.error('[admin] code exchange failed', (e as Error).message);
    const response = to('/admin/login?error=link');
    clearSession(response, request);
    return response;
  }

  if (!isAdminEmail(session.user.email, adminEmails())) {
    await logout(session.access_token);
    const response = to('/admin/login?error=denied');
    clearSession(response, request);
    return response;
  }

  const response = to('/admin');
  clearSession(response, request);
  setSession(response, request, session);
  return response;
}
