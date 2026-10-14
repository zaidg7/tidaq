import { afterEach, describe, expect, it, vi } from 'vitest';
import { runPosting } from './morning';
import { runDailyCheck } from './report';
import { testEnv } from './test/env';
import { fakeMail } from './test/mail';
import { fakeDataForSeo, memoryStore } from './test/memoryStore';

const hotels = [{ id: 1, citySlug: 'berlin', dfsHotelIdentifier: 'id-adlon', xoteloKey: null }];
const env = testEnv({ RESEND_API_KEY: 're_test', ADMIN_EMAILS: 'ops@example.com' });
const CHECK = new Date('2026-10-12T07:55:00Z');

async function morning(opts: { failStayIds?: number[] } = {}) {
  const mem = memoryStore(hotels);
  mem.setClock('2026-10-12T05:00:00.000Z');
  await runPosting({
    store: mem.store,
    env,
    now: new Date('2026-10-12T05:00:00Z'),
    kind: 'morning',
    fetchFn: fakeDataForSeo(opts).fetchFn,
  });
  return mem;
}

afterEach(() => vi.restoreAllMocks());

describe('runDailyCheck', () => {
  it('prunes raw data and sends nothing on a good day', async () => {
    const mem = await morning();
    for (const t of mem.tasks) t.status = 'done';
    const mail = fakeMail();
    const s = await runDailyCheck({ store: mem.store, env, now: CHECK, fetchFn: mail.fetchFn });
    expect(s).toEqual({
      today: '2026-10-12',
      pruned: 0,
      problems: [],
      accuracy: null,
      email: null,
    });
    expect(mem.pruneCalls()).toBe(1);
    expect(mail.sent).toEqual([]);
  });

  it('flags a day without a night-grid run on the free source (C-070a)', async () => {
    const mem = await morning();
    for (const t of mem.tasks) t.status = 'done';
    const free = testEnv({ ...env, PRICE_SOURCE: 'xotelo' });
    const noNights = await runDailyCheck({
      store: mem.store,
      env: free,
      now: CHECK,
      fetchFn: fakeMail().fetchFn,
    });
    expect(noNights.problems).toEqual(['No night-grid run in staging today.']);

    mem.runs.push({
      id: 50,
      kind: 'nights',
      env: 'staging',
      startedAt: '2026-10-12T00:02:00.000Z',
      finishedAt: '2026-10-12T00:02:30.000Z',
    });
    const ok = await runDailyCheck({
      store: mem.store,
      env: free,
      now: CHECK,
      fetchFn: fakeMail().fetchFn,
    });
    expect(ok.problems).toEqual([]);
  });

  it("records yesterday's night-sum accuracy and alarms after 3 weak days (C-070c)", async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const mem = await morning();
    for (const t of mem.tasks) t.status = 'done';
    mem.runs.push({
      id: 50,
      kind: 'nights',
      env: 'staging',
      startedAt: '2026-10-12T00:02:00.000Z',
      finishedAt: '2026-10-12T00:02:30.000Z',
    });
    const free = testEnv({ ...env, PRICE_SOURCE: 'xotelo' });
    const day = (d: string, pairs: number, within3: number) => ({
      day: d,
      pairs,
      within3,
      medianGapPct: 1.4,
      worst: [{ name: 'Rosewood Munich', pairs: 15, within3: 0 }],
    });

    // Two weak days are not enough; yesterday is recorded.
    mem.accuracy.set('2026-10-10', day('2026-10-10', 500, 300));
    mem.accuracy.set('2026-10-11', day('2026-10-11', 524, 320));
    const quiet = await runDailyCheck({ store: mem.store, env: free, now: CHECK });
    expect(quiet.accuracy).toMatchObject({ day: '2026-10-11', pairs: 524, within3: 320 });
    expect(quiet.problems).toEqual([]);

    mem.accuracy.set('2026-10-09', day('2026-10-09', 400, 200));
    const mail = fakeMail();
    const weak = await runDailyCheck({
      store: mem.store,
      env: free,
      now: CHECK,
      fetchFn: mail.fetchFn,
    });
    expect(weak.problems).toEqual([
      'Night sums matched the real stay price (within 3 %) for only 61 %, 60 %, 50 % of pairs on the last 3 days (target 75 %).',
      '- Rosewood Munich: 0 of 15 within 3 %',
      'Next step: add a TASKS entry to investigate (minimum stays, multi-night rates per hotel).',
    ]);
    expect(weak.email).toBe('sent');
  });

  it('a failing accuracy check is a problem, not a crash', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const mem = await morning();
    for (const t of mem.tasks) t.status = 'done';
    mem.runs.push({
      id: 50,
      kind: 'nights',
      env: 'staging',
      startedAt: '2026-10-12T00:02:00.000Z',
      finishedAt: '2026-10-12T00:02:30.000Z',
    });
    mem.store.recordNightAccuracy = () => Promise.reject(new Error('timeout'));
    const s = await runDailyCheck({
      store: mem.store,
      env: testEnv({ ...env, PRICE_SOURCE: 'xotelo' }),
      now: CHECK,
      fetchFn: fakeMail().fetchFn,
    });
    expect(s.accuracy).toBeNull();
    expect(s.problems).toEqual(['Night accuracy check failed: Error: timeout']);
  });

  it('emails once with every problem of the day', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const mem = await morning({ failStayIds: [1] });
    const [a, b] = mem.tasks;
    if (!a || !b) throw new Error('expected tasks');
    a.status = 'failed';
    b.status = 'done';
    mem.runs.push({
      id: 99,
      kind: 'collect',
      env: 'staging',
      startedAt: '2026-10-12T05:20:00.000Z',
    });
    const mail = fakeMail();
    const s = await runDailyCheck({ store: mem.store, env, now: CHECK, fetchFn: mail.fetchFn });

    const open = mem.tasks.length - 2;
    expect(s.email).toBe('sent');
    expect(s.problems).toEqual([
      'morning run (staging, 05:00 UTC): 1 error(s)',
      '- stay 1: 40501 Invalid Field',
      'collect run (staging, 05:20 UTC) never finished (crashed or timed out).',
      `${open} task(s) posted today still have no result.`,
      '1 task(s) failed today.',
    ]);
    expect(mail.sent).toHaveLength(1);
    expect(mail.sent[0]?.subject).toBe(
      '[staging] Collector: daily check found problems (2026-10-12)',
    );
    expect(mail.sent[0]?.text).toContain(
      `Tasks posted today: ${mem.tasks.length} (done 1, no results 0, failed 1, still open ${open}).`,
    );
  });

  it('reports a missing morning run', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const mem = memoryStore(hotels);
    const s = await runDailyCheck({
      store: mem.store,
      env,
      now: CHECK,
      fetchFn: fakeMail().fetchFn,
    });
    expect(s.problems).toEqual(['No morning run in staging today.']);
  });
});
