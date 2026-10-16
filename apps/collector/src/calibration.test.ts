import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CALIBRATIONS, runCalibrations } from './calibration';
import { testEnv } from './test/env';
import { memoryStore } from './test/memoryStore';

const FIXTURES = join(__dirname, '..', '..', '..', 'tests', 'fixtures', 'dataforseo');
const NOW = new Date('2026-10-16T14:00:00Z');
const search = JSON.parse(
  readFileSync(join(FIXTURES, 'hotel_searches-search-luxushotel-berlin.json'), 'utf8'),
) as unknown;

/** DataForSEO stand-in for Hotel Searches: posts get ids, every task is ready with `answer`. */
function fakeDfs(answer: unknown) {
  const calls: { url: string; body: unknown }[] = [];
  const fetchFn = async (input: string, init?: RequestInit): Promise<Response> => {
    calls.push({ url: input, body: init?.body ? JSON.parse(String(init.body)) : null });
    if (input.endsWith('/task_post')) {
      const body = JSON.parse(String(init?.body)) as { tag: string }[];
      return Response.json({
        status_code: 20000,
        status_message: 'Ok.',
        tasks: body.map((t, i) => ({
          id: `cal-${i}`,
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
        tasks: [{ status_code: 20000, status_message: 'Ok.', result: [{ id: 'cal-9' }] }],
      });
    }
    return Response.json(answer);
  };
  return { fetchFn, calls };
}

describe('runCalibrations (C-157)', () => {
  it('asks Google from Germany, in German, for each due city and logs the paid task', async () => {
    const mem = memoryStore([]);
    mem.calibrationJobs.push({
      cityId: 1,
      cityEn: 'Berlin',
      anchorHotelId: 3,
      checkIn: '2026-11-06',
      checkOut: '2026-11-08',
    });
    const dfs = fakeDfs(search);
    const s = await runCalibrations({
      store: mem.store,
      env: testEnv(),
      now: NOW,
      fetchFn: dfs.fetchFn,
    });
    expect(s.posted).toBe(1);
    const post = dfs.calls.find((c) => c.url.endsWith('/task_post'));
    expect(post?.body).toEqual([
      expect.objectContaining({
        keyword: 'luxury hotels Berlin',
        location_code: CALIBRATIONS.locationCode,
        language_code: 'de',
        check_in: '2026-11-06',
        check_out: '2026-11-08',
      }),
    ]);
    expect(mem.calibrationPosts).toEqual([
      expect.objectContaining({ taskId: 'cal-0', cityId: 1, anchorHotelId: 3, costUsd: 0.0008 }),
    ]);
  });

  it('stores a point per hotel found in the answer', async () => {
    const mem = memoryStore([]);
    mem.calibrationPending.push({
      id: 7,
      taskId: 'cal-9',
      cityId: 1,
      checkIn: '2026-12-01',
      checkOut: '2026-12-03',
      postedAt: '2026-10-16T13:58:00Z',
    });
    mem.calibrationHotels.set(1, [
      {
        hotelId: 3,
        name: 'The Ritz-Carlton Berlin',
        lat: 52.5103836,
        lng: 13.3752744,
        identifier: null,
        baseNightCents: 26_000,
      },
      {
        hotelId: 4,
        name: 'Hotel Sacher Wien',
        lat: 48.2039,
        lng: 16.3699,
        identifier: null,
        baseNightCents: 50_000,
      },
    ]);
    const s = await runCalibrations({
      store: mem.store,
      env: testEnv(),
      now: NOW,
      fetchFn: fakeDfs(search).fetchFn,
    });
    expect(s.errors).toEqual([]);
    expect(s.done).toBe(1);
    expect(mem.calibrationResults).toEqual([
      expect.objectContaining({
        id: 7,
        status: 'done',
        points: [expect.objectContaining({ hotelId: 3, googleNightCents: 30_000, ratio: 1.1538 })],
      }),
    ]);
  });

  it('posts nothing once the day has its calibrations', async () => {
    const mem = memoryStore([]);
    mem.calibrationJobs.push({
      cityId: 1,
      cityEn: 'Berlin',
      anchorHotelId: 3,
      checkIn: '2026-11-06',
      checkOut: '2026-11-08',
    });
    mem.calibrationUsage.postedToday = CALIBRATIONS.dailyCap;
    const dfs = fakeDfs(search);
    const s = await runCalibrations({
      store: mem.store,
      env: testEnv(),
      now: NOW,
      fetchFn: dfs.fetchFn,
    });
    expect(s).toMatchObject({ posted: 0, budgetLimited: true });
    expect(dfs.calls).toHaveLength(0);
  });
});
