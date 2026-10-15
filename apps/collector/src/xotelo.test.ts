import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { runCollect } from './collect';
import { createWorker, CRON_COLLECT } from './index';
import type { OpenTask } from './ingest';
import { runPosting } from './morning';
import { testEnv } from './test/env';
import { fakeDataForSeo, memoryStore } from './test/memoryStore';
import { fakeResults, hotelInfoFixture, SEED_ALIASES } from './test/results';
import { fetchXoteloTask } from './xotelo';

const FIXTURES = join(__dirname, '..', '..', '..', 'tests', 'fixtures', 'xotelo');
/** A recorded Xotelo rates answer, re-labelled with the stay that was asked for. */
const rates = (name: string, checkIn: string, checkOut: string): unknown => {
  const json = JSON.parse(readFileSync(join(FIXTURES, `${name}.json`), 'utf8'));
  json.result.chk_in = checkIn;
  json.result.chk_out = checkOut;
  return json;
};

const ALIASES = { ...SEED_ALIASES, 'ritzcarlton.com': 'hotel-direct' };
const hotels = [
  { id: 1, citySlug: 'berlin', dfsHotelIdentifier: 'id-ritz', xoteloKey: 'g187323-d289019' },
  // No Xotelo key: skipped while PRICE_SOURCE=xotelo.
  { id: 2, citySlug: 'berlin', dfsHotelIdentifier: 'id-adlon', xoteloKey: null },
];
const at = (iso: string) => new Date(iso);
const noSleep = async () => {};

/** Fake Xotelo: answers every stay with the Ritz-Carlton fixture, or a given status. */
function fakeXotelo(opts: { status?: number[]; body?: (url: URL) => unknown } = {}) {
  const calls: URL[] = [];
  const statuses = [...(opts.status ?? [])];
  const fetchFn = async (input: string): Promise<Response> => {
    const url = new URL(input);
    calls.push(url);
    const status = statuses.shift() ?? 200;
    if (status !== 200) return new Response('busy', { status });
    const body =
      opts.body?.(url) ??
      rates(
        'rates-ritz-carlton-berlin',
        url.searchParams.get('chk_in') ?? '',
        url.searchParams.get('chk_out') ?? '',
      );
    return Response.json(body);
  };
  return { fetchFn, calls };
}

const task = (over: Partial<OpenTask> = {}): OpenTask => ({
  id: 'xo-1-7',
  stayId: 7,
  hotelId: 1,
  checkIn: '2026-12-04',
  checkOut: '2026-12-06',
  adults: 2,
  xoteloKey: 'g187323-d289019',
  postedAt: '2026-10-14T05:00:00.000Z',
  ...over,
});

describe('fetchXoteloTask', () => {
  it('asks Xotelo for the stay and returns its prices', async () => {
    const x = fakeXotelo();
    const out = await fetchXoteloTask(task(), x.fetchFn);
    expect(out.kind).toBe('done');
    expect(Object.fromEntries(x.calls[0]?.searchParams ?? [])).toMatchObject({
      hotel_key: 'g187323-d289019',
      chk_in: '2026-12-04',
      chk_out: '2026-12-06',
      adults: '2',
      currency: 'EUR',
    });
  });

  it('throws on busy answers (retried next run) and fails on client errors', async () => {
    await expect(fetchXoteloTask(task(), fakeXotelo({ status: [503] }).fetchFn)).rejects.toThrow(
      'Xotelo HTTP 503',
    );
    await expect(fetchXoteloTask(task(), fakeXotelo({ status: [429] }).fetchFn)).rejects.toThrow(
      'Xotelo HTTP 429',
    );
    expect(await fetchXoteloTask(task(), fakeXotelo({ status: [404] }).fetchFn)).toEqual({
      kind: 'failed',
      error: 'HTTP 404',
    });
    const html = async () => new Response('<html>', { status: 200 });
    expect(await fetchXoteloTask(task(), html)).toEqual({
      kind: 'failed',
      error: 'answer is not JSON',
    });
    expect(await fetchXoteloTask(task({ xoteloKey: null }), html)).toEqual({
      kind: 'failed',
      error: 'hotel has no xotelo_key',
    });
  });
});

describe('PRICE_SOURCE=xotelo (D-41)', () => {
  const env = testEnv({ PRICE_SOURCE: 'xotelo', COLLECT_BATCH: '5' });

  it('morning: queues free jobs for hotels with a key, without calling DataForSEO', async () => {
    const mem = memoryStore(hotels, { aliases: ALIASES });
    const dfs = fakeDataForSeo();
    const summary = await runPosting({
      store: mem.store,
      env,
      now: at('2026-10-14T05:00:00Z'),
      kind: 'morning',
      fetchFn: dfs.fetchFn,
    });
    expect(dfs.calls).toHaveLength(0);
    const ritzStays = mem.stays.filter((s) => s.hotelId === 1);
    expect(summary).toMatchObject({ posted: ritzStays.length, estCostUsd: 0, budgetReason: 'ok' });
    expect(mem.tasks.every((t) => t.id.startsWith('xo-') && t.costUsd === 0)).toBe(true);
    expect(new Set(mem.tasks.map((t) => t.stayId))).toEqual(new Set(ritzStays.map((s) => s.id)));
  });

  it('morning: the daily cap still limits the jobs', async () => {
    const mem = memoryStore(hotels, { aliases: ALIASES });
    // 33 minus the 30 kept for visitor requests (C-132a).
    const summary = await runPosting({
      store: mem.store,
      env: testEnv({ PRICE_SOURCE: 'xotelo', DAILY_TASK_CAP: '33' }),
      now: at('2026-10-14T05:00:00Z'),
      kind: 'morning',
    });
    expect(summary).toMatchObject({ posted: 3, budgetReason: 'daily_cap' });
  });

  it('collect: works through the queue in batches and stores Xotelo prices', async () => {
    const mem = memoryStore(hotels, { aliases: ALIASES });
    mem.setClock('2026-10-14T05:00:00.000Z');
    await runPosting({ store: mem.store, env, now: at('2026-10-14T05:00:00Z'), kind: 'morning' });
    const queued = mem.tasks.length;

    const x = fakeXotelo();
    const first = await runCollect({
      store: mem.store,
      env,
      now: at('2026-10-14T05:10:00Z'),
      fetchFn: x.fetchFn,
      sleep: noSleep,
    });
    expect(first).toMatchObject({ fetched: 5, done: 5, failed: 0, errors: [] });
    expect(x.calls).toHaveLength(5);
    expect(mem.tasks.filter((t) => t.status === 'posted')).toHaveLength(queued - 5);

    // Ritz-Carlton site → hotel direct; Vio.com is unknown → a pending provider.
    const slugs = new Set(mem.snapshots.map((s) => s.provider_slug));
    expect(slugs).toEqual(new Set(['hotel-direct', 'booking-com', 'agoda', 'trip-com', 'vio-com']));
    expect(mem.providers.get('vio-com')?.pending).toBe(true);
    expect(mem.snapshots.every((s) => s.source === 'xotelo')).toBe(true);
    // Booking.com €316 a night × 2 nights.
    for (const d of mem.daily.values()) expect(d).toMatchObject({ bestCents: 63_200 });
    expect(first.statsUpdated).toBe(5);
  });

  it('a visitor-requested stay is priced by the next 10-minute collect cron (C-022c1)', async () => {
    const mem = memoryStore(hotels, { aliases: ALIASES });
    mem.stays.push({
      id: 50,
      hotelId: 1,
      checkIn: '2026-11-20',
      checkOut: '2026-11-23',
      adults: 1,
      active: true,
      origin: 'watch',
    });
    const x = fakeXotelo();
    const worker = createWorker({
      store: mem.store,
      fetchFn: x.fetchFn,
      now: () => at('2026-10-14T13:40:00Z'),
    });
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await worker.scheduled(
      { cron: CRON_COLLECT, scheduledTime: 0, noRetry: () => {} } as ScheduledController,
      env,
    );
    log.mockRestore();
    expect(mem.runs.map((r) => r.kind)).toEqual(['request', 'collect']);
    expect(mem.tasks).toMatchObject([{ id: 'xo-1-50', stayId: 50, status: 'done' }]);
    expect(Object.fromEntries(x.calls[0]?.searchParams ?? [])).toMatchObject({
      chk_in: '2026-11-20',
      chk_out: '2026-11-23',
      adults: '1',
    });
    // Booking.com €316 a night × 3 nights.
    expect([...mem.daily.values()]).toMatchObject([{ stayId: 50, bestCents: 94_800 }]);
  });

  it('collect: a busy Xotelo leaves the job queued for the next run', async () => {
    const mem = memoryStore(hotels, { aliases: ALIASES });
    mem.setClock('2026-10-14T05:00:00.000Z');
    await runPosting({ store: mem.store, env, now: at('2026-10-14T05:00:00Z'), kind: 'morning' });
    const sleeps: number[] = [];
    const summary = await runCollect({
      store: mem.store,
      env,
      now: at('2026-10-14T05:10:00Z'),
      fetchFn: fakeXotelo({ status: [503] }).fetchFn,
      sleep: async (ms) => {
        sleeps.push(ms);
      },
    });
    expect(summary).toMatchObject({ fetched: 4, done: 4 });
    expect(summary.errors).toEqual([expect.stringMatching(/^task xo-\d+-\d+: Xotelo HTTP 503$/)]);
    // One pause between consecutive calls, none before the first.
    expect(sleeps).toEqual([400, 400, 400, 400]);
    expect(mem.tasks.filter((t) => t.status === 'posted').length).toBeGreaterThan(0);
  });

  it('switching from DataForSEO: the stay keeps only its Xotelo days', async () => {
    const mem = memoryStore(hotels, { aliases: ALIASES });
    // Day 1: DataForSEO.
    mem.setClock('2026-10-13T05:00:00.000Z');
    await runPosting({
      store: mem.store,
      env: testEnv(),
      now: at('2026-10-13T05:00:00Z'),
      kind: 'morning',
      fetchFn: fakeDataForSeo().fetchFn,
    });
    const dfsTask = mem.tasks.find((t) => t.stayId === mem.stays.find((s) => s.hotelId === 1)?.id);
    if (!dfsTask) throw new Error('no task');
    const stayId = dfsTask.stayId;
    const results = fakeResults({
      ready: [dfsTask.id],
      responses: {
        [dfsTask.id]: hotelInfoFixture('hotel_info-info-ritz-carlton-dec-id.json', dfsTask.id),
      },
    });
    await runCollect({
      store: mem.store,
      env: testEnv(),
      now: at('2026-10-13T05:10:00Z'),
      fetchFn: results.fetchFn,
    });
    const dfsDays = [...mem.daily.values()].filter((d) => d.stayId === stayId);
    expect(dfsDays).toHaveLength(1);

    // Day 2: Xotelo for the same stay.
    mem.setClock('2026-10-14T05:00:00.000Z');
    for (const t of mem.tasks) t.status = 'done';
    await runPosting({ store: mem.store, env, now: at('2026-10-14T05:00:00Z'), kind: 'morning' });
    const xoTask = mem.tasks.find((t) => t.stayId === stayId && t.id.startsWith('xo-'));
    if (!xoTask) throw new Error('no xotelo task');
    for (const t of mem.tasks) if (t !== xoTask) t.status = 'done';
    await runCollect({
      store: mem.store,
      env,
      now: at('2026-10-14T05:10:00Z'),
      fetchFn: fakeXotelo().fetchFn,
      sleep: noSleep,
    });
    const days = [...mem.daily.values()].filter((d) => d.stayId === stayId);
    expect(days.map((d) => d.day)).toEqual(['2026-10-14']);
    expect(mem.stats.get(stayId)).toMatchObject({ days_tracked: 1, now_cents: days[0]?.bestCents });
  });
});
