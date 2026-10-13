import { describe, expect, it } from 'vitest';
import { COLLECT, refreshStats, runCollect } from './collect';
import { runPosting } from './morning';
import { testEnv } from './test/env';
import { fakeDataForSeo, memoryStore } from './test/memoryStore';
import { fakeResults, hotelInfoFixture, SEED_ALIASES, statusOnly } from './test/results';

const hotels = [
  { id: 1, citySlug: 'berlin', dfsHotelIdentifier: 'id-adlon' },
  { id: 2, citySlug: 'berlin', dfsHotelIdentifier: 'id-ritz' },
];
const at = (iso: string) => new Date(iso);
const POSTED = '2026-10-12T05:00:00.000Z';

/** Posts the grid for two hotels at 05:00 and returns the posted task ids. */
async function posted() {
  const mem = memoryStore(hotels, { aliases: SEED_ALIASES });
  mem.setClock(POSTED);
  await runPosting({
    store: mem.store,
    env: testEnv(),
    now: at(POSTED),
    kind: 'morning',
    fetchFn: fakeDataForSeo().fetchFn,
  });
  const ids = mem.tasks.map((t) => t.id);
  expect(ids.length).toBeGreaterThan(10);
  return { mem, ids };
}

const adlon = (id: string) => hotelInfoFixture('hotel_info-info-adlon-dec-id.json', id);
const ritz = (id: string) => hotelInfoFixture('hotel_info-info-ritz-carlton-dec-id.json', id);

describe('runCollect', () => {
  it('stores snapshots, stay_daily and stats for ready tasks (full pipeline)', async () => {
    const { mem, ids } = await posted();
    const [a, b, c] = ids as [string, string, string];
    const dfs = fakeResults({
      ready: [a, b, c],
      responses: { [a]: adlon(a), [b]: ritz(b), [c]: statusOnly(c, 40102, 'No Search Results.') },
    });
    const summary = await runCollect({
      store: mem.store,
      env: testEnv(),
      now: at('2026-10-12T05:10:00Z'),
      fetchFn: dfs.fetchFn,
    });

    expect(summary).toMatchObject({ fetched: 3, done: 2, noResults: 1, failed: 0, expired: 0 });
    expect(summary.snapshots).toBe(mem.snapshots.length);
    expect(summary.snapshots).toBeGreaterThan(30);
    expect(summary.dailyRows).toBe(2);
    expect(summary.statsUpdated).toBe(2);
    expect(mem.tasks.filter((t) => t.status === 'done').map((t) => t.id)).toEqual([a, b]);
    expect(mem.tasks.find((t) => t.id === c)?.status).toBe('no_results');

    // stay_daily holds the cheapest snapshot of a reviewed provider per stay day (pending
    // resellers are hidden from the public); stats start as "collecting".
    for (const d of mem.daily.values()) {
      const cheapest = Math.min(
        ...mem.snapshots
          .filter((s) => s.stay_id === d.stayId && !mem.providers.get(s.provider_slug)?.pending)
          .map((s) => s.total_cents),
      );
      const overall = Math.min(
        ...mem.snapshots.filter((s) => s.stay_id === d.stayId).map((s) => s.total_cents),
      );
      expect(cheapest).toBeGreaterThanOrEqual(overall);
      expect(d.bestCents).toBe(cheapest);
      expect(d.day).toBe('2026-10-12');
      expect(mem.stats.get(d.stayId)).toMatchObject({
        days_tracked: 1,
        now_cents: cheapest,
        state: 'collecting',
      });
    }
    // Unknown resellers became pending providers; the official site URL was filled.
    expect([...mem.providers.values()].some((p) => p.pending)).toBe(true);
    expect(mem.officialUrls.get(1)).toBe('https://www.kempinski.com/en/hotel-adlon');

    const run = mem.runs.find((r) => r.kind === 'collect');
    expect(run).toMatchObject({ id: summary.runId, tasksDone: 2, errors: [] });
  });

  it('is idempotent: a second run finds nothing new and writes no run', async () => {
    const { mem, ids } = await posted();
    const a = ids[0] as string;
    const dfs = fakeResults({ ready: [a], responses: { [a]: adlon(a) } });
    const now = at('2026-10-12T05:10:00Z');
    await runCollect({ store: mem.store, env: testEnv(), now, fetchFn: dfs.fetchFn });
    const snapshots = mem.snapshots.length;
    const runs = mem.runs.length;

    const again = await runCollect({ store: mem.store, env: testEnv(), now, fetchFn: dfs.fetchFn });
    expect(again).toMatchObject({ runId: null, fetched: 0, snapshots: 0 });
    expect(mem.snapshots.length).toBe(snapshots);
    expect(mem.runs.length).toBe(runs);
  });

  it('fetches at most COLLECT_BATCH results per run, ready tasks first', async () => {
    const { mem, ids } = await posted();
    const ready = ids.slice(0, 5);
    const dfs = fakeResults({
      ready,
      responses: Object.fromEntries(ready.map((id) => [id, adlon(id)])),
    });
    const summary = await runCollect({
      store: mem.store,
      env: testEnv({ COLLECT_BATCH: '2' }),
      now: at('2026-10-12T06:00:00Z'),
      fetchFn: dfs.fetchFn,
    });
    expect(summary.fetched).toBe(2);
    expect(dfs.calls.filter((u) => u.includes('/task_get/'))).toEqual([
      expect.stringContaining(ready[0] as string),
      expect.stringContaining(ready[1] as string),
    ]);
  });

  it('fetches tasks missing from tasks_ready only after 45 minutes', async () => {
    const { mem, ids } = await posted();
    const a = ids[0] as string;
    const dfs = fakeResults({ ready: [], responses: { [a]: adlon(a) } });
    const early = await runCollect({
      store: mem.store,
      env: testEnv(),
      now: at('2026-10-12T05:30:00Z'),
      fetchFn: dfs.fetchFn,
    });
    expect(early.runId).toBeNull();

    const late = await runCollect({
      store: mem.store,
      env: testEnv(),
      now: at(`2026-10-12T05:${COLLECT.staleAfterMinutes + 1}:00Z`),
      fetchFn: dfs.fetchFn,
    });
    const expected = Math.min(ids.length, COLLECT.defaultBatch);
    expect(late.fetched).toBe(expected);
    expect(late.done).toBe(1);
    expect(late.stillPending).toBe(expected - 1);
    expect(mem.tasks.filter((t) => t.status === 'posted').length).toBe(ids.length - 1);
  });

  it('marks tasks without a result after 3 days as failed', async () => {
    const { mem, ids } = await posted();
    const summary = await runCollect({
      store: mem.store,
      env: testEnv(),
      now: at('2026-10-15T05:10:00Z'),
      fetchFn: fakeResults({}).fetchFn,
    });
    expect(summary).toMatchObject({ expired: ids.length, fetched: 0, failed: 0 });
    expect(mem.tasks.every((t) => t.status === 'failed')).toBe(true);
    expect(mem.tasks[0]?.error).toBe('no result within 3 days');
  });

  it('keeps tasks open and logs errors when the API fails', async () => {
    const { mem, ids } = await posted();
    const a = ids[0] as string;
    const dfs = fakeResults({ readyStatus: 404, responses: { [a]: 404 } });
    const summary = await runCollect({
      store: mem.store,
      env: testEnv({ COLLECT_BATCH: '1' }),
      now: at('2026-10-12T06:00:00Z'),
      fetchFn: dfs.fetchFn,
    });
    expect(summary.fetched).toBe(0);
    expect(summary.errors).toEqual([
      expect.stringMatching(/^tasks_ready: /),
      expect.stringMatching(new RegExp(`^task ${a}: `)),
    ]);
    expect(mem.tasks.every((t) => t.status === 'posted')).toBe(true);
    expect(mem.runs.find((r) => r.kind === 'collect')?.errors).toHaveLength(2);
  });

  it('logs failed tasks and marks them failed', async () => {
    const { mem, ids } = await posted();
    const a = ids[0] as string;
    const dfs = fakeResults({
      ready: [a],
      responses: { [a]: statusOnly(a, 40501, 'Invalid Field.') },
    });
    const summary = await runCollect({
      store: mem.store,
      env: testEnv(),
      now: at('2026-10-12T05:10:00Z'),
      fetchFn: dfs.fetchFn,
    });
    expect(summary).toMatchObject({ failed: 1, errors: [`task ${a}: 40501 Invalid Field.`] });
    expect(mem.tasks.find((t) => t.id === a)).toMatchObject({
      status: 'failed',
      error: '40501 Invalid Field.',
    });
  });

  it('does nothing without open tasks', async () => {
    const mem = memoryStore(hotels);
    const dfs = fakeResults({});
    const summary = await runCollect({
      store: mem.store,
      env: testEnv(),
      now: at('2026-10-12T05:10:00Z'),
      fetchFn: dfs.fetchFn,
    });
    expect(summary).toMatchObject({ runId: null, open: 0, fetched: 0 });
    expect(dfs.calls).toEqual([]);
    expect(mem.runs).toEqual([]);
  });

  it('rejects an invalid COLLECT_BATCH before doing anything', async () => {
    const mem = memoryStore(hotels);
    await expect(
      runCollect({ store: mem.store, env: testEnv({ COLLECT_BATCH: '0' }), now: at(POSTED) }),
    ).rejects.toThrow();
  });
});

describe('refreshStats', () => {
  it('computes the signal from the stay_daily history', async () => {
    const mem = memoryStore(hotels);
    const prices = [1000, 990, 980, 970, 960, 950, 940, 900];
    prices.forEach((cents, i) => {
      const day = `2026-10-${String(5 + i).padStart(2, '0')}`;
      mem.daily.set(`9|${day}`, { stayId: 9, day, bestCents: cents * 100, best: 'booking-com' });
    });
    const n = await refreshStats(
      mem.store,
      new Map([[9, '2026-12-04']]),
      at('2026-10-12T06:00:00Z'),
    );
    expect(n).toBe(1);
    const row = mem.stats.get(9);
    expect(row).toMatchObject({
      stay_id: 9,
      days_tracked: 8,
      now_cents: 90000,
      low_cents: 90000,
      high_cents: 100000,
      state: 'near_low',
    });
    expect(row?.trend_7d).toBeLessThan(0);
  });

  it('does nothing for no stays', async () => {
    const mem = memoryStore(hotels);
    expect(await refreshStats(mem.store, new Map(), at(POSTED))).toBe(0);
  });
});

describe('stay_daily without reviewed providers', () => {
  it('skips days whose offers all come from pending providers in the stats', async () => {
    const mem = memoryStore(hotels);
    mem.daily.set('5|2026-10-11', { stayId: 5, day: '2026-10-11', bestCents: 90_000, best: null });
    mem.daily.set('5|2026-10-12', {
      stayId: 5,
      day: '2026-10-12',
      bestCents: 100_000,
      best: 'booking-com',
    });
    await refreshStats(mem.store, new Map([[5, '2026-12-04']]), at('2026-10-12T06:00:00Z'));
    expect(mem.stats.get(5)).toMatchObject({ days_tracked: 1, now_cents: 100_000 });
  });
});
