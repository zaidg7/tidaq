import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { RUN_TOKEN_MESSAGE, runToken, safeEqual } from './runToken';

describe('runToken', () => {
  it('is HMAC-SHA256 of the fixed message, as hex', async () => {
    const expected = createHmac('sha256', 'k').update(RUN_TOKEN_MESSAGE).digest('hex');
    expect(await runToken('k')).toBe(expected);
    expect(await runToken('other')).not.toBe(expected);
  });
});

describe('safeEqual', () => {
  it('compares equal strings and rejects others', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'ab')).toBe(false);
  });
});
