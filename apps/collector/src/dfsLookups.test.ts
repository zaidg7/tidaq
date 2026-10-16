import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LOOKUPS, runDfsLookups } from './dfsLookups';
import { runDropQuotes } from './dropQuotes';
import { testEnv } from './test/env';
import { memoryStore } from './test/memoryStore';
import { SEED_ALIASES } from './test/results';

const FIXTURES = join(__dirname, '..', '..', '..', 'tests', 'fixtures', 'dataforseo');
// A recorded Hotel Searches answer (Berlin luxury hotels: Ritz-Carlton, Grand Hyatt, …).
const recorded = JSON.parse(
  readFileSync(join(FIXTURES, 'hotel_searches-search-luxushotel-berlin.json'), 'utf8'),
) as unknown;
const NOW = new Date('2026-10-16T13:00:00Z');
const hotels = [
  { id: 1, citySlug: 'berlin', dfsHotelIdentifier: null, xoteloKey: 'g1-d1' },
  { id: 2, citySlug: 'berlin', dfsHotelIdentifier: null, xoteloKey: 'g1-d2' },
];

/** DataForSEO stand-in for Hotel Searches: posts get ids, everything is ready, task_get → `answer`. */
function fakeSearch(answer: unknown) {
  const calls: { url: string; body: unknown }[] = [];
  const fetchFn = async (input: string, init?: RequestInit): Promise<Response> => {
    calls.push({ url: input, body: init?.body ? JSON.parse(String(init.body)) : null });
    if (input.endsWith('/task_post')) {
      const body = JSON.parse(String(init?.body)) as { tag: string }[];
      return Response.json({
        status_code: 20000,
        status_message: 'Ok.',
        tasks: body.map((t, i) => ({
          id: `search-${t.tag}-${i}`,
          status_code: 20100,
          status_message: 'Task Created.',
          cost: 0.0008,
          data: { tag: t.tag },
        })),
      });
    }
    if (input.endsWith('/tasks_ready')) {
      return Response.json({ status_code: 20000, status_message: 'Ok.', tasks: [] });
    }
    return Response.json(answer);
  };
  return { fetchFn, calls };
}

const job = (hotelId: number, name: string, countryCode = 'DE') => ({
  hotelId,
  name,
  cityEn: 'Berlin',
  countryCode,
  lat: 52.508404,
  lng: 13.372401,
});

describe('runDfsLookups (C-153)', () => {
  it('searches Google in the hotel’s country for hotels with a drop, within the allowance', async () => {
    const mem = memoryStore(hotels);
    mem.lookupJobs.push(job(1, 'Grand Hyatt Berlin'), job(2, 'Unknown Place', 'XX'));
    const dfs = fakeSearch(recorded);
    const s = await runDfsLookups({
      store: mem.store,
      creds: {},
      now: NOW,
      allowed: 10,
      fetchFn: dfs.fetchFn,
    });

    // Hotel 2's country has no DataForSEO location: not posted, nothing paid.
    expect(s.posted).toBe(1);
    const post = dfs.calls.find((c) => c.url.endsWith('/hotel_searches/task_post'));
    expect(post?.body).toEqual([
      expect.objectContaining({
        keyword: 'Grand Hyatt Berlin Berlin',
        location_code: 2276,
        check_in: '2026-11-15',
        check_out: '2026-11-16',
        tag: '1',
      }),
    ]);
    // Logged in the quote budget log with its cost.
    expect(mem.lookupPosts).toEqual([
      expect.objectContaining({ hotelId: 1, costUsd: 0.0008, checkIn: '2026-11-15' }),
    ]);
  });

  it('posts nothing without an allowance (budget guard, hard rule 4)', async () => {
    const mem = memoryStore(hotels);
    mem.lookupJobs.push(job(1, 'Grand Hyatt Berlin'));
    const dfs = fakeSearch(recorded);
    const s = await runDfsLookups({
      store: mem.store,
      creds: {},
      now: NOW,
      allowed: 0,
      fetchFn: dfs.fetchFn,
    });
    expect(s.posted).toBe(0);
    expect(dfs.calls).toHaveLength(0);
    expect(s.requests).toBe(1);
  });

  it('stores the id of the result that is the same hotel, and a miss with its candidates', async () => {
    const mem = memoryStore(hotels);
    const old = new Date(
      NOW.getTime() - (LOOKUPS.fetchDirectlyAfterMinutes + 1) * 60_000,
    ).toISOString();
    mem.lookupPending.push(
      {
        taskId: 't1',
        hotelId: 1,
        name: 'Grand Hyatt Berlin',
        lat: 52.508404,
        lng: 13.372401,
        postedAt: old,
      },
      {
        taskId: 't2',
        hotelId: 2,
        name: 'Hotel Sacher',
        lat: 52.5162,
        lng: 13.3801,
        postedAt: old,
      },
    );
    const dfs = fakeSearch(recorded);
    const s = await runDfsLookups({
      store: mem.store,
      creds: {},
      now: NOW,
      allowed: 0,
      fetchFn: dfs.fetchFn,
    });

    expect(s).toMatchObject({ found: 1, notFound: 1, failed: 0 });
    expect(mem.lookupResults[0]).toMatchObject({
      hotelId: 1,
      status: 'found',
      identifier: 'ChkIhOHzpdH5nuewARoML2cvMWhjN2M1bmxoEAE',
    });
    expect(mem.lookupResults[1]).toMatchObject({
      hotelId: 2,
      status: 'not_found',
      identifier: null,
    });
    expect(mem.lookupResults[1]?.candidates.length).toBe(3);
    // The id lands on the hotel, so its drops can be quoted from the next run on.
    expect(mem.hotelsById.get(1)?.dfsHotelIdentifier).toBe(
      'ChkIhOHzpdH5nuewARoML2cvMWhjN2M1bmxoEAE',
    );
    expect(mem.hotelsById.get(2)?.dfsHotelIdentifier).toBeNull();
  });

  it('waits for an answer that is neither ready nor old', async () => {
    const mem = memoryStore(hotels);
    mem.lookupPending.push({
      taskId: 't1',
      hotelId: 1,
      name: 'Grand Hyatt Berlin',
      lat: 52.508404,
      lng: 13.372401,
      postedAt: new Date(NOW.getTime() - 2 * 60_000).toISOString(),
    });
    const dfs = fakeSearch(recorded);
    const s = await runDfsLookups({
      store: mem.store,
      creds: {},
      now: NOW,
      allowed: 0,
      fetchFn: dfs.fetchFn,
    });
    expect(s.found).toBe(0);
    expect(dfs.calls.map((c) => c.url)).toEqual([
      expect.stringContaining('/hotel_searches/tasks_ready'),
    ]);
  });
});

describe('runDropQuotes with lookups (C-153)', () => {
  it('lookups come out of the same allowance as quotes', async () => {
    const mem = memoryStore(hotels, { aliases: SEED_ALIASES });
    mem.lookupJobs.push(job(1, 'Grand Hyatt Berlin'));
    // 2 tasks left today: the lookup takes one, a quote the other.
    mem.quoteUsage.postedToday = 78;
    mem.quoteJobs.push(
      { hotelId: 2, hotelIdentifier: 'ChX', night: '2026-11-20', checkOut: '2026-11-25' },
      { hotelId: 2, hotelIdentifier: 'ChX', night: '2026-11-21', checkOut: '2026-11-26' },
    );
    const dfs = fakeSearch(recorded);
    const s = await runDropQuotes({
      store: mem.store,
      env: testEnv({ DROP_QUOTE_DAILY_CAP: '80' }),
      now: NOW,
      fetchFn: dfs.fetchFn,
    });
    expect(s.lookups?.posted).toBe(1);
    expect(s.posted).toBe(1);
    expect(mem.quotePosts).toHaveLength(1);
  });
});
