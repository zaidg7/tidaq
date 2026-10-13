/**
 * Helpers for the admin login (C-020c): who may sign in, where a login may send you back to,
 * and the PKCE pair for Supabase's magic link. Runtime-neutral (Web Crypto), so the same code
 * runs in Node, the Cloudflare Worker and tests.
 */

/** `ADMIN_EMAILS` = comma- or space-separated list; compared lowercased. */
export function parseAdminEmails(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return [
    ...new Set(
      raw
        .split(/[\s,;]+/)
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e.includes('@')),
    ),
  ];
}

export function isAdminEmail(
  email: string | null | undefined,
  allowed: readonly string[],
): boolean {
  if (!email) return false;
  return allowed.includes(email.trim().toLowerCase());
}

/** Where a login may return to: only `/admin` or a path below it, never another host. */
export function safeAdminPath(next: string | null | undefined): string {
  if (!next) return '/admin';
  // Reject protocol-relative (`//evil`), backslash tricks and anything outside /admin.
  if (!/^\/admin(?:[/?#]|$)/.test(next) || next.includes('//') || next.includes('\\')) {
    return '/admin';
  }
  return next;
}

function base64url(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** A PKCE code verifier: 32 random bytes, base64url (43 characters, RFC 7636 §4.1). */
export function randomVerifier(): string {
  return base64url(crypto.getRandomValues(new Uint8Array(32)));
}

/** The S256 code challenge for `verifier` (RFC 7636 §4.2). */
export async function pkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64url(new Uint8Array(digest));
}
