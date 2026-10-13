/** Manual collector runs (`POST /run`, C-013) and the admin "run now" button (C-016). */

/** Message signed to derive the manual-run token. Changing it invalidates old tokens. */
export const RUN_TOKEN_MESSAGE = 'tidaq-collector-run';

/**
 * Token for `POST /run`: HMAC-SHA256(SUPABASE_SERVICE_ROLE_KEY, RUN_TOKEN_MESSAGE) as hex.
 * Derived from a secret the worker and CI already have, so no extra secret is needed; the service
 * key itself never leaves either side. CI computes the same with
 * `printf '%s' tidaq-collector-run | openssl dgst -sha256 -hmac "$KEY"`.
 */
export async function runToken(secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(RUN_TOKEN_MESSAGE));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Compares without leaking the position of the first difference. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
