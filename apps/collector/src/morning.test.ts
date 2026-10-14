import { describe, expect, it } from 'vitest';
import { runPosting, runRequests } from './morning';
import { testEnv } from './test/env';
import { fakeDataForSeo, memoryStore } from './test/memoryStore';

const NOW = new Date('2026-10-12T05:00:00Z');
const hotels = [
  { id: 1, citySlug: 'berlin', dfsHotelIdentifier: 'id-adlon', xoteloKey: null },
  { id: 2, citySlug: 'muenchen', dfsHotelIdentifier: 'id-bayerischer-hof', xoteloKey: null },
];

describe('runPosting', () => {
  it('refreshes the grid, posts one task per stay and records the run', async () => {
    const { store, stays, runs, tasks } = memoryStore(hotels);
    const dfs = fakeDataForSeo();
    const summary = await runPosting({
      store,
      env: testEnv(),
      now: NOW,
      kind: 'morning',
      fetchFn: dfs.fetchFn,
    });

    // 6 weekends + 2 midweek per hotel; no specials within 90 days of 12 Oct apart from December.
    expect(summary.gridStaysInserted).toBe(stays.length);
    expect(summary.posted).toBe(stays.length);
    expect(summary).toMatchObject({ skipped: 0, budgetReason: 'ok', errors: [] });
    expect(tasks).toHaveLength(stays.length);
    expect(runs[0]).toMatchObject({
      kind: 'morning',
      env: 'staging',
      tasksPosted: stays.length,
      budgetReason: 'ok',
      // request_stay() reads the cap from here (C-022c1).
      dailyCap: 300,
    });
    expect(runs[0]?.estCostUsd).toBeCloseTo(stays.length * 0.0008, 10);
    // Every posted task carries the stay id as tag and the right identifier, location Germany, EUR.
    const body = dfs.calls[0]?.body ?? [];
    expect(body[0]).toMatchObject({
      location_code: 2276,
      currency: 'EUR',
      language_code: 'de',
      adults: 2,
    });
    expect(new Set(body.map((t) => t.hotel_identifier))).toEqual(
      new Set(['id-adlon', 'id-bayerischer-hof']),
    );
  });

  it('flags the run that crosses 80 % of the monthly budget, and only that one', async () => {
    const mem = memoryStore(hotels);
    // Earlier this month: $9.59 of the $12 budget (80 % = $9.60).
    mem.runs.push({
      id: 0,
      kind: 'morning',
      env: 'production',
      startedAt: '2026-10-01T05:00:00.000Z',
      estCostUsd: 9.59,
      tasksPosted: 0,
    });
    const run = () =>
      runPosting({
        store: mem.store,
        env: testEnv(),
        now: NOW,
        kind: 'morning',
        fetchFn: fakeDataForSeo().fetchFn,
      });
    const first = await run();
    expect(first.monthlyAlertCrossed).toBe(true);
    expect(first.monthSpendUsd).toBeCloseTo(9.59 + first.posted * 0.0008, 6);
    const second = await run();
    expect(second).toMatchObject({ monthlyAlert: true, monthlyAlertCrossed: false });
  });

  it('is idempotent for the grid: a second run inserts nothing new', async () => {
    const { store } = memoryStore(hotels);
    const dfs = fakeDataForSeo();
    await runPosting({ store, env: testEnv(), now: NOW, kind: 'morning', fetchFn: dfs.fetchFn });
    const second = await runPosting({
      store,
      env: testEnv(),
      now: NOW,
      kind: 'manual',
      fetchFn: dfs.fetchFn,
    });
    expect(second.gridStaysInserted).toBe(0);
  });

  it('respects the daily cap across runs and posts watched stays first', async () => {
    const { store, stays } = memoryStore(hotels, { watchedStayIds: [16] });
    const dfs = fakeDataForSeo();
    const first = await runPosting({
      store,
      env: testEnv({ DAILY_TASK_CAP: '5' }),
      now: NOW,
      kind: 'manual',
      fetchFn: dfs.fetchFn,
    });
    expect(first).toMatchObject({ posted: 5, budgetReason: 'daily_cap' });
    expect(first.skipped).toBe(stays.length - 5);
    const postedTags = dfs.calls.flatMap((c) => c.body.map((t) => Number(t.tag)));
    expect(postedTags[0]).toBe(16);
    // Same day, cap already used up: nothing more is posted.
    const second = await runPosting({
      store,
      env: testEnv({ DAILY_TASK_CAP: '5' }),
      now: NOW,
      kind: 'manual',
      fetchFn: dfs.fetchFn,
    });
    expect(second.posted).toBe(0);
    expect(dfs.calls).toHaveLength(1);
  });

  it('evening runs only price stays within 21 days', async () => {
    const { store } = memoryStore(hotels);
    const dfs = fakeDataForSeo();
    const s = await runPosting({
      store,
      env: testEnv(),
      now: NOW,
      kind: 'evening',
      fetchFn: dfs.fetchFn,
    });
    const checkIns = dfs.calls.flatMap((c) => c.body).length;
    expect(s.jobs).toBe(checkIns);
    expect(s.jobs).toBeLessThan(16);
  });

  it('records per-task errors without failing the run', async () => {
    const { store, tasks } = memoryStore(hotels);
    const dfs = fakeDataForSeo({ failStayIds: [1] });
    const s = await runPosting({
      store,
      env: testEnv(),
      now: NOW,
      kind: 'morning',
      fetchFn: dfs.fetchFn,
    });
    expect(s.errors).toEqual(['stay 1: 40501 Invalid Field']);
    expect(tasks.some((t) => t.stayId === 1)).toBe(false);
  });

  it('refuses to run with broken budget settings and posts nothing', async () => {
    const { store, runs } = memoryStore(hotels);
    const dfs = fakeDataForSeo();
    await expect(
      runPosting({
        store,
        env: testEnv({ DAILY_TASK_CAP: 'lots' }),
        now: NOW,
        kind: 'morning',
        fetchFn: dfs.fetchFn,
      }),
    ).rejects.toThrow();
    expect(dfs.calls).toHaveLength(0);
    expect(runs).toHaveLength(0);
  });

  it('marks the run as failed when the store breaks mid-run', async () => {
    const { store, runs } = memoryStore(hotels);
    store.stayJobs = async () => {
      throw new Error('db down');
    };
    await expect(runPosting({ store, env: testEnv(), now: NOW, kind: 'morning' })).rejects.toThrow(
      'db down',
    );
    expect(runs[0]?.errors).toEqual(['run failed: db down']);
    expect(runs[0]?.finishedAt).toBeTruthy();
  });
});

describe('runRequests (C-022c1)', () => {
  const requested = (mem: ReturnType<typeof memoryStore>, id: number, hotelId = 1) =>
    mem.stays.push({
      id,
      hotelId,
      checkIn: '2026-11-20',
      checkOut: '2026-11-22',
      adults: 3,
      active: true,
      origin: 'watch',
    });

  it('does nothing and writes no run row when no requested stay is waiting', async () => {
    const mem = memoryStore(hotels);
    const summary = await runRequests({ store: mem.store, env: testEnv(), now: NOW });
    expect(summary).toEqual({
      runId: null,
      waiting: 0,
      posted: 0,
      skipped: 0,
      budgetReason: null,
      errors: [],
    });
    expect(mem.runs).toHaveLength(0);
  });

  it('posts requested stays without a task, once, and records the cap', async () => {
    const mem = memoryStore(hotels);
    requested(mem, 101);
    requested(mem, 102, 2);
    // Already priced once (e.g. by the morning run): not posted again.
    requested(mem, 103);
    mem.tasks.push({
      id: 'task-103',
      runId: 0,
      stayId: 103,
      costUsd: 0.0008,
      postedAt: '2026-10-12T04:00:00.000Z',
      status: 'done',
      error: null,
    });
    // A grid stay is never part of a request run.
    mem.stays.push({
      id: 104,
      hotelId: 1,
      checkIn: '2026-11-20',
      checkOut: '2026-11-22',
      adults: 2,
      active: true,
      origin: 'grid',
    });
    const dfs = fakeDataForSeo();

    const summary = await runRequests({
      store: mem.store,
      env: testEnv(),
      now: NOW,
      fetchFn: dfs.fetchFn,
    });
    expect(summary).toMatchObject({ waiting: 2, posted: 2, skipped: 0, budgetReason: 'ok' });
    expect(mem.runs[0]).toMatchObject({ kind: 'request', tasksPosted: 2, dailyCap: 300 });
    expect(dfs.calls[0]?.body.map((t) => t.tag)).toEqual(['101', '102']);
    expect(dfs.calls[0]?.body[0]).toMatchObject({ adults: 3 });

    const again = await runRequests({
      store: mem.store,
      env: testEnv(),
      now: NOW,
      fetchFn: dfs.fetchFn,
    });
    expect(again.runId).toBeNull();
  });

  it('stays inside the daily cap', async () => {
    const mem = memoryStore(hotels);
    mem.runs.push({
      id: 0,
      kind: 'morning',
      env: 'staging',
      startedAt: '2026-10-12T05:00:00.000Z',
      tasksPosted: 299,
    });
    requested(mem, 101);
    requested(mem, 102);
    const summary = await runRequests({
      store: mem.store,
      env: testEnv(),
      now: NOW,
      fetchFn: fakeDataForSeo().fetchFn,
    });
    expect(summary).toMatchObject({ posted: 1, skipped: 1, budgetReason: 'daily_cap' });
  });

  it('skips stays whose hotel has no id at the active source', async () => {
    const mem = memoryStore(hotels);
    requested(mem, 101);
    const summary = await runRequests({
      store: mem.store,
      env: testEnv({ PRICE_SOURCE: 'xotelo' }),
      now: NOW,
    });
    expect(summary.runId).toBeNull();
  });
});
