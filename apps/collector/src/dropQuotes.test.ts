import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { QUOTES, quoteAllowance, runDropQuotes } from './dropQuotes';
import { testEnv } from './test/env';
import { memoryStore } from './test/memoryStore';
import { SEED_ALIASES } from './test/results';

const FIXTURES = join(__dirname, '..', '..', '..', 'tests', 'fixtures', 'dataforseo');
const NOW = new Date('2026-10-16T09:00:00Z');
const hotels = [{ id: 1, citySlug: 'berlin', dfsHotelIdentifier: 'ChX', xoteloKey: null }];

/** DataForSEO stand-in: posts get task ids, tasks_ready lists them, task_get returns `answer`. */
function fakeDfs(answer: unknown) {
  const calls: string[] = [];
  const fetchFn = async (input: string, init?: RequestInit): Promise<Response> => {
    calls.push(input);
    if (input.endsWith('/task_post')) {
      const body = JSON.parse(String(init?.body)) as { tag: string }[];
      return Response.json({
        status_code: 20000,
        status_message: 'Ok.',
        tasks: body.map((t, i) => ({
          id: `task-${i}`,
          status_code: 20100,
          status_message: 'Task Created.',
          cost: 0.0008,
          data: { tag: t.tag },
        })),
      });
    }
    if (input.endsWith('/tasks_ready')) {
      return Response.json({
        status_code: 20000,
        status_message: 'Ok.',
        tasks: [
          { status_code: 20000, status_message: 'Ok.', result: [{ id: 'task-7', tag: null }] },
        ],
      });
    }
    return Response.json(answer);
  };
  return { fetchFn, calls };
}

const recorded = JSON.parse(
  readFileSync(join(FIXTURES, 'hotel_info-info-adlon-weekend-id.json'), 'utf8'),
) as { tasks: { data: { check_in: string; check_out: string } }[] };

describe('quoteAllowance', () => {
  it('takes the smaller of the daily cap and the monthly budget', () => {
    expect(
      quoteAllowance({ postedToday: 0, spentMonthUsd: 0 }, { dailyCap: 600, monthlyUsd: 15 }),
    ).toBe(600);
    expect(
      quoteAllowance({ postedToday: 590, spentMonthUsd: 0 }, { dailyCap: 600, monthlyUsd: 15 }),
    ).toBe(10);
    // $0.004 left = 5 tasks.
    expect(
      quoteAllowance({ postedToday: 0, spentMonthUsd: 14.996 }, { dailyCap: 600, monthlyUsd: 15 }),
    ).toBe(5);
    expect(
      quoteAllowance({ postedToday: 700, spentMonthUsd: 20 }, { dailyCap: 600, monthlyUsd: 15 }),
    ).toBe(0);
  });
});

describe('runDropQuotes (C-148)', () => {
  it('posts a task for each drop that needs a quote and logs it', async () => {
    const mem = memoryStore(hotels, { aliases: SEED_ALIASES });
    mem.quoteJobs.push({
      hotelId: 1,
      hotelIdentifier: 'ChX',
      night: '2026-12-11',
      checkOut: '2026-12-16',
    });
    const dfs = fakeDfs(recorded);
    const summary = await runDropQuotes({
      store: mem.store,
      env: testEnv(),
      now: NOW,
      fetchFn: dfs.fetchFn,
    });
    expect(summary.posted).toBe(1);
    expect(mem.quotePosts).toEqual([
      expect.objectContaining({
        taskId: 'task-0',
        hotelId: 1,
        night: '2026-12-11',
        costUsd: 0.0008,
      }),
    ]);
    const post = dfs.calls.find((c) => c.endsWith('/task_post'));
    expect(post).toBeDefined();
  });

  it('stores the answer: every known site with its nightly price and the stay total', async () => {
    const mem = memoryStore(hotels, { aliases: SEED_ALIASES });
    mem.quotePending.push({
      taskId: 'task-7',
      hotelId: 1,
      night: '2026-12-11',
      checkOut: '2026-12-13',
      postedAt: '2026-10-16T08:58:00Z',
    });
    const summary = await runDropQuotes({
      store: mem.store,
      env: testEnv(),
      now: NOW,
      fetchFn: fakeDfs(recorded).fetchFn,
    });
    expect(summary.errors).toEqual([]);
    expect(summary.done).toBe(1);
    const result = mem.quoteResults[0];
    expect(result?.status).toBe('done');
    const offers = result?.offers ?? [];
    expect(offers.length).toBeGreaterThan(0);
    for (const o of offers) expect(o.total_cents).toBe(o.nightly_cents * 2);
    // Cheapest first, and only sites we know.
    expect(offers.map((o) => o.total_cents)).toEqual(
      [...offers.map((o) => o.total_cents)].sort((a, b) => a - b),
    );
    expect(offers.every((o) => o.slug.length > 0)).toBe(true);
  });

  it('posts nothing once the budget is used up', async () => {
    const mem = memoryStore(hotels, { aliases: SEED_ALIASES });
    mem.quoteJobs.push({
      hotelId: 1,
      hotelIdentifier: 'ChX',
      night: '2026-12-11',
      checkOut: '2026-12-16',
    });
    mem.quoteUsage.postedToday = QUOTES.defaultDailyCap;
    const dfs = fakeDfs(recorded);
    const summary = await runDropQuotes({
      store: mem.store,
      env: testEnv(),
      now: NOW,
      fetchFn: dfs.fetchFn,
    });
    expect(summary).toMatchObject({ posted: 0, budgetLimited: true });
    expect(dfs.calls).toHaveLength(0);
  });

  it('idle, it costs three queries and no paid call', async () => {
    const mem = memoryStore(hotels, { aliases: SEED_ALIASES });
    const dfs = fakeDfs(recorded);
    const summary = await runDropQuotes({
      store: mem.store,
      env: testEnv(),
      now: NOW,
      fetchFn: dfs.fetchFn,
    });
    expect(summary.requests).toBe(3);
    expect(dfs.calls).toHaveLength(0);
  });
});
