import { NextResponse, type NextRequest } from 'next/server';
import { isAdminEmail, pkceChallenge, randomVerifier } from '@tidaq/core';
import { AuthError, hasAuth, sendMagicLink } from '@/lib/admin/gotrue';
import {
  ADMIN_COOKIES,
  adminEmails,
  cookieOptions,
  isSameOrigin,
  VERIFIER_MAX_AGE,
} from '@/lib/admin/session';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function back(request: NextRequest, query: string) {
  return NextResponse.redirect(new URL(`/admin/login?${query}`, request.url), 303);
}

/**
 * Step 1 of the admin login: send a magic link. Only addresses in `ADMIN_EMAILS` get one; the
 * answer is the same for every valid address, so the page doesn't reveal who is an admin.
 */
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return new NextResponse('Forbidden', { status: 403 });

  const form = await request.formData();
  const email = String(form.get('email') ?? '')
    .trim()
    .toLowerCase();
  if (!EMAIL.test(email)) return back(request, 'error=email');

  const allowed = adminEmails();
  if (!hasAuth() || allowed.length === 0) return back(request, 'error=config');

  const response = back(request, 'sent=1');
  if (isAdminEmail(email, allowed)) {
    const verifier = randomVerifier();
    try {
      const callback = new URL('/admin/auth/callback', request.url).toString();
      await sendMagicLink(email, callback, await pkceChallenge(verifier));
    } catch (e) {
      // No email address in the log (CLAUDE.md §5).
      console.error('[admin] magic link failed', (e as Error).message);
      const tooMany = e instanceof AuthError && e.status === 429;
      return back(request, tooMany ? 'error=rate' : 'error=send');
    }
    response.cookies.set(
      ADMIN_COOKIES.verifier,
      verifier,
      cookieOptions(request, VERIFIER_MAX_AGE),
    );
  }
  return response;
}
