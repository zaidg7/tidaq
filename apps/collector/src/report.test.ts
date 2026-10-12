import { afterEach, describe, expect, it, vi } from 'vitest';
import { runPosting } from './morning';
import { runDailyCheck } from './report';
import { testEnv } from './test/env';
import { fakeMail } from './test/mail';
import { fakeDataForSeo, memoryStore } from './test/memoryStore';

const hotels = [{ id: 1, citySlug: 'berlin', dfsHotelIdentifier: 'id-adlon' }];
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
    expect(s).toEqual({ today: '2026-10-12', pruned: 0, problems: [], email: null });
    expect(mem.pruneCalls()).toBe(1);
    expect(mail.sent).toEqual([]);
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
