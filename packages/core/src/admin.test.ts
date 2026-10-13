import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  isAdminEmail,
  parseAdminEmails,
  pkceChallenge,
  randomVerifier,
  safeAdminPath,
} from './admin';

describe('parseAdminEmails', () => {
  it('splits, trims, lowercases and dedupes', () => {
    expect(parseAdminEmails(' Zaid@Example.com, ops@example.com ;zaid@example.com')).toEqual([
      'zaid@example.com',
      'ops@example.com',
    ]);
  });

  it('is empty without a value', () => {
    expect(parseAdminEmails(undefined)).toEqual([]);
    expect(parseAdminEmails('')).toEqual([]);
    expect(parseAdminEmails(' , ')).toEqual([]);
  });
});

describe('isAdminEmail', () => {
  const allowed = parseAdminEmails('zaid@example.com');

  it('matches case-insensitively', () => {
    expect(isAdminEmail('ZAID@example.com ', allowed)).toBe(true);
  });

  it('rejects everything else', () => {
    expect(isAdminEmail('other@example.com', allowed)).toBe(false);
    expect(isAdminEmail('', allowed)).toBe(false);
    expect(isAdminEmail(null, allowed)).toBe(false);
    expect(isAdminEmail('zaid@example.com', [])).toBe(false);
  });
});

describe('safeAdminPath', () => {
  it('keeps admin paths', () => {
    expect(safeAdminPath('/admin')).toBe('/admin');
    expect(safeAdminPath('/admin/audit?hotel=adlon')).toBe('/admin/audit?hotel=adlon');
  });

  it('falls back to /admin for anything else', () => {
    for (const bad of [
      null,
      '',
      '/',
      '/administrator',
      'https://evil.example/admin',
      '//evil.example/admin',
      '/admin//evil.example',
      '/admin\\evil',
      'admin',
    ]) {
      expect(safeAdminPath(bad)).toBe('/admin');
    }
  });
});

describe('PKCE', () => {
  it('makes 43-character base64url verifiers that differ', () => {
    const a = randomVerifier();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(randomVerifier()).not.toBe(a);
  });

  it('derives the S256 challenge like Node does', async () => {
    const verifier = randomVerifier();
    const expected = createHash('sha256').update(verifier).digest('base64url');
    expect(await pkceChallenge(verifier)).toBe(expected);
  });
});
