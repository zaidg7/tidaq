import 'server-only';
import { z } from '@tidaq/core';

/**
 * The few Supabase Auth (GoTrue) REST calls the admin login needs, without the supabase-js
 * client: magic link with PKCE, code exchange, refresh, user lookup, logout. Every response is
 * validated with Zod (CLAUDE.md §5).
 */

const TIMEOUT_MS = 6000;

function config(): { url: string; key: string } | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  return url && key ? { url: `${url.replace(/\/$/, '')}/auth/v1`, key } : null;
}

export function hasAuth(): boolean {
  return config() !== null;
}

const sessionSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  expires_in: z.number().int().positive(),
  user: z.object({ email: z.string().optional() }).passthrough(),
});
export type AuthSession = z.infer<typeof sessionSchema>;

const userSchema = z.object({ email: z.string().optional() }).passthrough();

/** Thrown for responses we don't expect; `status` 0 = network error or timeout. */
export class AuthError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function call(path: string, init: { method: 'GET' | 'POST'; token?: string; body?: object }) {
  const cfg = config();
  if (!cfg) throw new AuthError(0, 'Supabase Auth is not configured');
  let res: Response;
  try {
    res = await fetch(`${cfg.url}${path}`, {
      method: init.method,
      headers: {
        apikey: cfg.key,
        authorization: `Bearer ${init.token ?? cfg.key}`,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: 'no-store',
    });
  } catch (e) {
    throw new AuthError(0, `Supabase Auth unreachable (${(e as Error).name})`);
  }
  if (!res.ok) {
    // Body text is GoTrue's error code/message; it never contains tokens.
    const detail = (await res.text().catch(() => '')).slice(0, 200);
    throw new AuthError(
      res.status,
      `Supabase Auth ${res.status} on ${path.split('?')[0]}: ${detail}`,
    );
  }
  return res.status === 204 ? null : res.json();
}

/** Sends the magic link. The link returns to `redirectTo?code=…` (must be allow-listed). */
export async function sendMagicLink(email: string, redirectTo: string, challenge: string) {
  await call(`/otp?redirect_to=${encodeURIComponent(redirectTo)}`, {
    method: 'POST',
    body: {
      email,
      create_user: true,
      code_challenge: challenge,
      code_challenge_method: 's256',
    },
  });
}

export async function exchangeCode(code: string, verifier: string): Promise<AuthSession> {
  const data = await call('/token?grant_type=pkce', {
    method: 'POST',
    body: { auth_code: code, code_verifier: verifier },
  });
  return sessionSchema.parse(data);
}

export async function refreshSession(refreshToken: string): Promise<AuthSession> {
  const data = await call('/token?grant_type=refresh_token', {
    method: 'POST',
    body: { refresh_token: refreshToken },
  });
  return sessionSchema.parse(data);
}

/** The signed-in user's email; null when the token is invalid or expired (401/403). */
export async function userEmail(accessToken: string): Promise<string | null> {
  try {
    const data = userSchema.parse(await call('/user', { method: 'GET', token: accessToken }));
    return data.email ?? null;
  } catch (e) {
    if (e instanceof AuthError && (e.status === 401 || e.status === 403)) return null;
    throw e;
  }
}

/** Ends the session everywhere. Best effort: the cookies are cleared either way. */
export async function logout(accessToken: string) {
  await call('/logout?scope=global', { method: 'POST', token: accessToken }).catch(() => null);
}
