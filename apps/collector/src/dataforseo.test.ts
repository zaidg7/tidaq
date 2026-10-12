import { describe, expect, it, vi } from 'vitest';
import { fetchWithRetry, postHotelInfoTasks, type HotelInfoTask } from './dataforseo';
import { fakeDataForSeo } from './test/memoryStore';

const task = (stayId: number): HotelInfoTask => ({
  hotelIdentifier: `id-${stayId}`,
  checkIn: '2026-12-01',
  checkOut: '2026-12-03',
  adults: 2,
  stayId,
});

describe('postHotelInfoTasks', () => {
  it('posts in batches of at most 100', async () => {
    const dfs = fakeDataForSeo();
    const r = await postHotelInfoTasks(
      Array.from({ length: 230 }, (_, i) => task(i + 1)),
      {},
      dfs.fetchFn,
    );
    expect(dfs.calls.map((c) => c.body.length)).toEqual([100, 100, 30]);
    expect(r.posted).toHaveLength(230);
    expect(r.posted[0]).toEqual({ id: 'task-1', stayId: 1, costUsd: 0.0008 });
  });

  it('adds Basic auth only when credentials are set (the cloud proxy adds its own)', async () => {
    const dfs = fakeDataForSeo();
    await postHotelInfoTasks([task(1)], {}, dfs.fetchFn);
    await postHotelInfoTasks([task(1)], { login: 'l', password: 'p' }, dfs.fetchFn);
    expect(dfs.calls[0]?.headers.authorization).toBeUndefined();
    expect(dfs.calls[1]?.headers.authorization).toBe(`Basic ${btoa('l:p')}`);
  });

  it('turns a failed batch into per-stay errors', async () => {
    const dfs = fakeDataForSeo({ httpStatus: [400] });
    const r = await postHotelInfoTasks([task(1), task(2)], {}, dfs.fetchFn);
    expect(r.posted).toEqual([]);
    expect(r.errors.map((e) => e.stayId)).toEqual([1, 2]);
  });

  it('posts nothing for an empty list', async () => {
    const dfs = fakeDataForSeo();
    expect(await postHotelInfoTasks([], {}, dfs.fetchFn)).toEqual({ posted: [], errors: [] });
    expect(dfs.calls).toHaveLength(0);
  });
});

describe('fetchWithRetry', () => {
  const sleep = vi.fn(async (ms: number) => void ms);

  it('retries 5xx with backoff and returns the first good response', async () => {
    const fetchFn = vi
      .fn<(url: string) => Promise<Response>>()
      .mockResolvedValueOnce(new Response('', { status: 502 }))
      .mockRejectedValueOnce(new Error('reset'))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));
    const res = await fetchWithRetry(fetchFn, 'https://x', {}, { sleep });
    expect(res.status).toBe(200);
    expect(sleep.mock.calls.map((c) => c[0])).toEqual([500, 1000]);
  });

  it('does not retry 4xx', async () => {
    const fetchFn = vi.fn(async () => new Response('', { status: 401 }));
    const res = await fetchWithRetry(fetchFn, 'https://x', {}, { sleep });
    expect(res.status).toBe(401);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('gives up after the last attempt', async () => {
    const fetchFn = vi.fn(async () => new Response('', { status: 503 }));
    await expect(fetchWithRetry(fetchFn, 'https://x', {}, { attempts: 2, sleep })).rejects.toThrow(
      'failed after 2 attempts',
    );
  });
});
