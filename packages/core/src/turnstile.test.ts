import { describe, expect, it } from 'vitest';
import { TURNSTILE_SITEVERIFY, verifyTurnstileToken } from './turnstile';

const keys = { secret: 'sec', siteKey: 'site' };
const answering = (body: unknown, status = 200) => {
  const calls: { url: string; body: Record<string, unknown> }[] = [];
  const fetchFn = (async (url: string, init?: RequestInit) => {
    calls.push({ url, body: JSON.parse(String(init?.body)) });
    return new Response(JSON.stringify(body), { status });
  }) as typeof fetch;
  return { fetchFn, calls };
};

describe('verifyTurnstileToken (C-030c)', () => {
  it('is off without the secret or the site key', async () => {
    for (const k of [
      { secret: undefined, siteKey: 'site' },
      { secret: 'sec', siteKey: undefined },
    ]) {
      expect(await verifyTurnstileToken({ ...k, token: undefined, ip: null })).toBe(true);
    }
  });

  it('rejects a missing or absurd token without calling Cloudflare', async () => {
    const f = answering({ success: true });
    expect(await verifyTurnstileToken({ ...keys, token: null, ip: null, fetchFn: f.fetchFn })).toBe(
      false,
    );
    expect(await verifyTurnstileToken({ ...keys, token: '', ip: null, fetchFn: f.fetchFn })).toBe(
      false,
    );
    expect(
      await verifyTurnstileToken({
        ...keys,
        token: 'x'.repeat(3000),
        ip: null,
        fetchFn: f.fetchFn,
      }),
    ).toBe(false);
    expect(f.calls).toEqual([]);
  });

  it("follows Siteverify's answer and sends the secret, token and IP", async () => {
    const ok = answering({ success: true });
    expect(
      await verifyTurnstileToken({ ...keys, token: 'tok', ip: '1.2.3.4', fetchFn: ok.fetchFn }),
    ).toBe(true);
    expect(ok.calls[0]).toEqual({
      url: TURNSTILE_SITEVERIFY,
      body: { secret: 'sec', response: 'tok', remoteip: '1.2.3.4' },
    });
    const no = answering({ success: false, 'error-codes': ['invalid-input-response'] });
    expect(
      await verifyTurnstileToken({ ...keys, token: 'tok', ip: null, fetchFn: no.fetchFn }),
    ).toBe(false);
    expect(no.calls[0]?.body).not.toHaveProperty('remoteip');
  });

  it('lets the form through when Cloudflare is unreachable or answers nonsense', async () => {
    const seen: unknown[] = [];
    const down = answering({}, 503);
    expect(
      await verifyTurnstileToken({
        ...keys,
        token: 'tok',
        ip: null,
        fetchFn: down.fetchFn,
        onUnavailable: (e) => seen.push(e),
      }),
    ).toBe(true);
    const odd = answering({ ok: 1 });
    expect(
      await verifyTurnstileToken({ ...keys, token: 'tok', ip: null, fetchFn: odd.fetchFn }),
    ).toBe(true);
    expect(seen).toHaveLength(1);
  });
});
