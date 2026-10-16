import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { createWorker, CRON_COLLECT } from './index';
import { runDropChecks } from './dropChecks';
import { testEnv } from './test/env';
import { memoryStore } from './test/memoryStore';
import { SEED_ALIASES } from './test/results';

const FIXTURES = join(__dirname, '..', '..', '..', 'tests', 'fixtures', 'xotelo');
const ALIASES = { ...SEED_ALIASES, 'ritzcarlton.com': 'hotel-direct' };
const hotels = [
  { id: 1, citySlug: 'berlin', dfsHotelIdentifier: null, xoteloKey: 'g187323-d289019' },
];
const NOW = new Date('2026-10-15T09:00:00Z');
const env = testEnv({ PRICE_SOURCE: 'xotelo' });

/** The recorded Ritz-Carlton answer (Booking.com, Agoda, Trip.com €316 a night) for any dates. */
function fakeXotelo(status: (url: URL) => number = () => 200) {
  const calls: URL[] = [];
  const fetchFn = async (input: string): Promise<Response> => {
    const url = new URL(input);
    calls.push(url);
    const code = status(url);
    if (code !== 200) return new Response('nope', { status: code });
    const json = JSON.parse(readFileSync(join(FIXTURES, 'rates-ritz-carlton-berlin.json'), 'utf8'));
    json.result.chk_in = url.searchParams.get('chk_in');
    json.result.chk_out = url.searchParams.get('chk_out');
    return Response.json(json);
  };
  return { fetchFn, calls };
}

// Five nights from 1 Nov: €316 × 5 = €1,580 on Booking.com, Agoda and Trip.com.
const job = (providerSlug: string, nowCents: number, night = '2026-11-01') => ({
  hotelId: 1,
  xoteloKey: 'g187323-d289019',
  night,
  checkOut: '2026-11-06',
  providerSlug,
  nowCents,
});

describe('runDropChecks (C-139)', () => {
  it('asks for the exact trip and stores live and gone drops', async () => {
    const mem = memoryStore(hotels, { aliases: ALIASES });
    mem.dropCheckJobs.push(
      // Still €1,580 on Booking.com: live.
      job('booking-com', 158_000),
      // Found at €1,400 on Agoda, now €1,580 (+13 %): gone.
      job('agoda', 140_000),
      // Expedia no longer offers it: gone.
      job('expedia', 150_000),
    );
    const x = fakeXotelo();
    const summary = await runDropChecks({ store: mem.store, env, now: NOW, fetchFn: x.fetchFn });

    expect(summary).toEqual({ checked: 3, live: 1, gone: 2, retry: 0, requests: 6 });
    expect(x.calls[0]?.searchParams.get('chk_in')).toBe('2026-11-01');
    expect(x.calls[0]?.searchParams.get('chk_out')).toBe('2026-11-06');
    expect(x.calls.every((u) => u.searchParams.get('adults') === '2')).toBe(true);
    const bySite = Object.fromEntries(mem.dropChecks.map((c) => [c.providerSlug, c]));
    expect(bySite['booking-com']).toMatchObject({ live: true, cents: 158_000, bestCents: 158_000 });
    expect(bySite.agoda).toMatchObject({ live: false, cents: 158_000 });
    expect(bySite.expedia).toMatchObject({ live: false, cents: null, bestCents: 158_000 });
  });

  it('leaves busy answers for the next run', async () => {
    const mem = memoryStore(hotels, { aliases: ALIASES });
    mem.dropCheckJobs.push(job('booking-com', 158_000), job('agoda', 158_000, '2026-11-02'));
    const x = fakeXotelo((u) => (u.searchParams.get('chk_in') === '2026-11-02' ? 503 : 200));
    const summary = await runDropChecks({ store: mem.store, env, now: NOW, fetchFn: x.fetchFn });
    expect(summary).toMatchObject({ checked: 2, live: 1, retry: 1 });
    expect(mem.dropChecks).toHaveLength(1);
  });

  it('does nothing without due drops or with the paid source', async () => {
    const mem = memoryStore(hotels, { aliases: ALIASES });
    const x = fakeXotelo();
    expect(await runDropChecks({ store: mem.store, env, now: NOW, fetchFn: x.fetchFn })).toEqual({
      checked: 0,
      live: 0,
      gone: 0,
      retry: 0,
      requests: 1,
    });
    mem.dropCheckJobs.push(job('booking-com', 158_000));
    const paid = testEnv({ PRICE_SOURCE: 'dataforseo' });
    await runDropChecks({ store: mem.store, env: paid, now: NOW, fetchFn: x.fetchFn });
    expect(x.calls).toHaveLength(0);
  });

  it('runs in the collect run first; the night grid takes the requests left', async () => {
    const run = async (drops: number) => {
      const mem = memoryStore(hotels, { aliases: ALIASES });
      for (let i = 0; i < drops; i++) mem.dropCheckJobs.push(job('booking-com', 158_000));
      const limits: number[] = [];
      const nightJobs = mem.store.nightJobs.bind(mem.store);
      mem.store.nightJobs = (today, window, limit) => {
        limits.push(limit);
        return nightJobs(today, window, limit);
      };
      const x = fakeXotelo();
      const worker = createWorker({ store: mem.store, fetchFn: x.fetchFn, now: () => NOW });
      const log = vi.spyOn(console, 'log').mockImplementation(() => {});
      await worker.scheduled(
        { cron: CRON_COLLECT } as ScheduledController,
        testEnv({ PRICE_SOURCE: 'xotelo', NIGHT_BATCH: '40' }),
      );
      log.mockRestore();
      return { mem, limits, calls: x.calls.length };
    };
    // One drop: jobs + aliases + 1 price call + upsert = 4 requests off the 40 nights, and the
    // idle quote step 5 more (C-148: pending, usage, jobs; C-153: lookup pending, lookup jobs),
    // the idle calibration step 2 (C-157: pending, due cities).
    const one = await run(1);
    expect(one.mem.dropChecks).toHaveLength(1);
    expect(one.limits).toEqual([29]);
    expect(one.calls).toBe(1 + 29);
    // Nothing to check still cost the jobs query.
    const none = await run(0);
    expect(none.limits).toEqual([32]);
  });
});
