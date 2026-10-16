import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { createWorker, CRON_COLLECT, CRON_NIGHTS } from './index';
import { runNights } from './nights';
import { testEnv } from './test/env';
import { memoryStore } from './test/memoryStore';
import { SEED_ALIASES } from './test/results';

const FIXTURES = join(__dirname, '..', '..', '..', 'tests', 'fixtures', 'xotelo');
const ALIASES = { ...SEED_ALIASES, 'ritzcarlton.com': 'hotel-direct' };
const hotels = [
  { id: 1, citySlug: 'berlin', dfsHotelIdentifier: 'id-ritz', xoteloKey: 'g187323-d289019' },
  { id: 2, citySlug: 'paris', dfsHotelIdentifier: null, xoteloKey: 'g187147-d188975' },
  // No Xotelo key: never part of the night grid.
  { id: 3, citySlug: 'berlin', dfsHotelIdentifier: 'id-adlon', xoteloKey: null },
];
const NOW = new Date('2026-10-15T00:02:00Z');
const env = testEnv({ PRICE_SOURCE: 'xotelo', NIGHT_WINDOW_DAYS: '3', NIGHT_BATCH: '4' });

/** Fake Xotelo: the recorded Ritz-Carlton answer for whatever night is asked, or a status. */
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

describe('runNights (C-070a)', () => {
  it('prices the nearest nights first, one call per night, and stores every platform', async () => {
    const mem = memoryStore(hotels, { aliases: ALIASES });
    const x = fakeXotelo();
    const summary = await runNights({ store: mem.store, env, now: NOW, fetchFn: x.fetchFn });

    // 2 hotels with a key × 3 nights = 6 jobs; batch 4: night 1 for both, then night 2 for both.
    expect(summary).toMatchObject({ fetched: 4, priced: 4, empty: 0, retry: 0, failed: 0 });
    expect(
      x.calls.map((u) => [u.searchParams.get('hotel_key'), u.searchParams.get('chk_in')]),
    ).toEqual(
      expect.arrayContaining([
        ['g187323-d289019', '2026-10-15'],
        ['g187147-d188975', '2026-10-15'],
        ['g187323-d289019', '2026-10-16'],
        ['g187147-d188975', '2026-10-16'],
      ]),
    );
    expect(x.calls.every((u) => u.searchParams.get('adults') === '2')).toBe(true);
    // One night = check-out the next day.
    expect(x.calls[0]?.searchParams.get('chk_out')).toBe('2026-10-16');

    const night = mem.nights.get('1|2026-10-15|2026-10-15');
    // Booking.com €316 a night (fixture); the Ritz-Carlton's own site maps to hotel-direct.
    expect(night?.offers).toMatchObject({
      'booking-com': 31_600,
      'hotel-direct': expect.any(Number),
    });
    expect(night?.best).toBe(31_600);
    // Vio.com is unknown: created as a pending provider, kept out of the best price.
    expect(mem.providers.get('vio-com')?.pending).toBe(true);
    expect(mem.runs).toMatchObject([{ kind: 'nights', tasksDone: 4, errors: [] }]);
  });

  it('starts no call after the deadline and leaves those nights for the next run (C-151)', async () => {
    const mem = memoryStore(hotels, { aliases: ALIASES });
    const x = fakeXotelo();
    const late = await runNights({
      store: mem.store,
      env,
      now: NOW,
      fetchFn: x.fetchFn,
      deadline: Date.now() - 1,
    });
    expect(late).toMatchObject({ fetched: 4, priced: 0, empty: 0, retry: 4, rows: 0 });
    expect(x.calls).toHaveLength(0);
    expect(mem.nights.size).toBe(0);
    // The next run, in time, prices them.
    const next = await runNights({ store: mem.store, env, now: NOW, fetchFn: x.fetchFn });
    expect(next).toMatchObject({ fetched: 4, priced: 4, retry: 0 });
  });

  it('continues where the last run stopped and is idle once the day is done', async () => {
    const mem = memoryStore(hotels, { aliases: ALIASES });
    const x = fakeXotelo();
    await runNights({ store: mem.store, env, now: NOW, fetchFn: x.fetchFn });
    const second = await runNights({ store: mem.store, env, now: NOW, fetchFn: x.fetchFn });
    expect(second.fetched).toBe(2);
    expect(mem.nights.size).toBe(6);
    const third = await runNights({ store: mem.store, env, now: NOW, fetchFn: x.fetchFn });
    expect(third.runId).toBeNull();
    expect(x.calls).toHaveLength(6);
    expect(mem.runs).toHaveLength(2);
    // The next day starts over with that day's window.
    const nextDay = await runNights({
      store: mem.store,
      env,
      now: new Date('2026-10-16T00:02:00Z'),
      fetchFn: x.fetchFn,
    });
    expect(nextDay.fetched).toBe(4);
  });

  it('leaves busy nights for the next run and stores refused ones empty, without run errors', async () => {
    const mem = memoryStore(hotels, { aliases: ALIASES });
    const x = fakeXotelo((u) =>
      u.searchParams.get('hotel_key') === 'g187147-d188975'
        ? u.searchParams.get('chk_in') === '2026-10-15'
          ? 503
          : 404
        : 200,
    );
    const summary = await runNights({ store: mem.store, env, now: NOW, fetchFn: x.fetchFn });
    expect(summary).toMatchObject({ fetched: 4, priced: 2, empty: 1, retry: 1, failed: 1 });
    expect(summary.failures[0]).toMatch(/^hotel 2 2026-10-16: HTTP 404$/);
    expect(mem.nights.has('2|2026-10-15|2026-10-15')).toBe(false);
    expect(mem.nights.get('2|2026-10-16|2026-10-15')).toMatchObject({ offers: {}, best: null });
    // A single refused night isn't a run error: errors trigger the daily problem email.
    expect(mem.runs[0]?.errors).toEqual([]);
  });

  it('never runs on the paid source and can be switched off', async () => {
    const mem = memoryStore(hotels, { aliases: ALIASES });
    const x = fakeXotelo();
    const paid = await runNights({
      store: mem.store,
      env: testEnv({ PRICE_SOURCE: 'dataforseo' }),
      now: NOW,
      fetchFn: x.fetchFn,
    });
    const off = await runNights({
      store: mem.store,
      env: testEnv({ PRICE_SOURCE: 'xotelo', NIGHT_WINDOW_DAYS: '0' }),
      now: NOW,
      fetchFn: x.fetchFn,
    });
    expect(paid.runId).toBeNull();
    expect(off.runId).toBeNull();
    expect(x.calls).toHaveLength(0);
    expect(mem.runs).toHaveLength(0);
  });
});

describe('collect cron and the night grid', () => {
  const controller = (cron: string) =>
    ({ cron, scheduledTime: 0, noRetry: () => {} }) as ScheduledController;

  it('prices nights only when no stay result is waiting', async () => {
    const mem = memoryStore(hotels, { aliases: ALIASES });
    const x = fakeXotelo();
    const worker = createWorker({
      store: mem.store,
      fetchFn: x.fetchFn,
      now: () => new Date('2026-10-15T05:00:00Z'),
    });
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const collectEnv = testEnv({
      PRICE_SOURCE: 'xotelo',
      NIGHT_WINDOW_DAYS: '3',
      NIGHT_BATCH: '12',
    });
    // A visitor-requested stay (C-022c1): the first cycle queues and collects it.
    mem.stays.push({
      id: 9,
      hotelId: 1,
      checkIn: '2026-11-20',
      checkOut: '2026-11-22',
      adults: 2,
      active: true,
      origin: 'watch',
    });
    await worker.scheduled(controller(CRON_COLLECT), collectEnv);
    expect(mem.runs.map((r) => r.kind)).toEqual(['request', 'collect']);
    expect(mem.nights.size).toBe(0);
    // Nothing open any more: the next cycle prices nights.
    await worker.scheduled(controller(CRON_COLLECT), collectEnv);
    log.mockRestore();
    expect(mem.runs.map((r) => r.kind)).toEqual(['request', 'collect', 'nights']);
    // Half 0 of the hotels only (C-154): hotel 2's 3 nights; hotel 1 is the odd-minute run's.
    // (NIGHT_BATCH 12 minus the drop-check query, the idle quote step's 5, calibrations' 2.)
    expect([...mem.nights.keys()].every((k) => k.startsWith('2|'))).toBe(true);
    expect(mem.nights.size).toBe(3);
  });

  it('the odd-minute run prices the other half of the hotels at the same time (C-154)', async () => {
    const mem = memoryStore(hotels, { aliases: ALIASES });
    const x = fakeXotelo();
    const worker = createWorker({
      store: mem.store,
      fetchFn: x.fetchFn,
      now: () => new Date('2026-10-15T05:01:00Z'),
    });
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const env = testEnv({ PRICE_SOURCE: 'xotelo', NIGHT_WINDOW_DAYS: '3', NIGHT_BATCH: '12' });
    await worker.scheduled(controller(CRON_NIGHTS), env);
    expect(mem.runs.map((r) => r.kind)).toEqual(['nights']);
    expect([...mem.nights.keys()].sort()).toEqual([
      '1|2026-10-15|2026-10-15',
      '1|2026-10-16|2026-10-15',
      '1|2026-10-17|2026-10-15',
    ]);
    // Both halves together cover every hotel with a Xotelo key, and no night twice.
    await worker.scheduled(controller(CRON_COLLECT), env);
    log.mockRestore();
    expect(mem.nights.size).toBe(6);
    expect(x.calls).toHaveLength(6);
  });
});
