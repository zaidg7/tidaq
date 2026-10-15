import 'server-only';
import { TURNSTILE_FIELD, verifyTurnstileToken } from '@tidaq/core';

/**
 * Cloudflare Turnstile (C-030c): every form that sends an email checks that a person filled it
 * in, so bots can't use Tidaq to mail strangers. The logic (off without keys, fail open when
 * Cloudflare is down) lives in core `verifyTurnstileToken`.
 */
export function verifyTurnstile(form: FormData, ip: string | null): Promise<boolean> {
  return verifyTurnstileToken({
    secret: process.env.TURNSTILE_SECRET_KEY,
    siteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    token: form.get(TURNSTILE_FIELD),
    ip,
    onUnavailable: (e) =>
      console.error('[turnstile] siteverify unavailable, letting the form through', String(e)),
  });
}
