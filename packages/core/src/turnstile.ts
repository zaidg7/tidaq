import { z } from 'zod';

/**
 * Cloudflare Turnstile check (C-030c): redeems the widget's one-time token with Siteverify.
 * Off (true) when the secret or the site key is missing (local, CI, or a deploy without the
 * widget), so a half-configured deploy can never block every sign-up. Fails open when
 * Cloudflare can't be reached: the rate limit and honeypot still apply.
 */
export const TURNSTILE_SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
export const TURNSTILE_FIELD = 'cf-turnstile-response';

const answer = z.object({ success: z.boolean() });

export async function verifyTurnstileToken(opts: {
  secret: string | undefined;
  siteKey: string | undefined;
  token: unknown;
  ip: string | null;
  fetchFn?: typeof fetch;
  onUnavailable?: (error: unknown) => void;
}): Promise<boolean> {
  const { secret, siteKey, token, ip, fetchFn = fetch } = opts;
  if (!secret || !siteKey) return true;
  if (typeof token !== 'string' || token.length === 0 || token.length > 2048) return false;
  try {
    const res = await fetchFn(TURNSTILE_SITEVERIFY, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ secret, response: token, ...(ip && { remoteip: ip }) }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`Siteverify HTTP ${res.status}`);
    return answer.parse(await res.json()).success;
  } catch (error) {
    opts.onUnavailable?.(error);
    return true;
  }
}
