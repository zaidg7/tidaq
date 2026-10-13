import { NextResponse, type NextRequest } from 'next/server';
import { logout } from '@/lib/admin/gotrue';
import { ADMIN_COOKIES, clearSession, isSameOrigin } from '@/lib/admin/session';

/** Ends the Supabase session and clears the admin cookies. */
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return new NextResponse('Forbidden', { status: 403 });
  const access = request.cookies.get(ADMIN_COOKIES.access)?.value;
  if (access) await logout(access);
  const response = NextResponse.redirect(new URL('/admin/login?out=1', request.url), 303);
  clearSession(response, request);
  return response;
}
