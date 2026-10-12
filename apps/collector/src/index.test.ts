import { describe, expect, it, vi } from 'vitest';
import { runToken, safeEqual } from './auth';
import { createWorker, CRON_EVENING, CRON_MORNING } from './index';
import { testEnv } from './test/env';
import { fakeDataForSeo, memoryStore } from './test/memoryStore';

const hotels = [{ id: 1, citySlug: 'berlin', dfsHotelIdentifier: 'id-adlon' }];
const now = () => new Date('2026-10-12T05:00:00Z');

function setup() {
  const mem = memoryStore(hotels);
  const dfs = fakeDataForSeo();
  const worker = createWorker({ store: mem.store, fetchFn: dfs.fetchFn, now });
  return { worker, mem, dfs };
}

const req = (path: string, init?: RequestInit) =>
  new Request(`https://collector.test${path}`, init) as Parameters<
    ReturnType<typeof createWorker>['fetch']
  >[0];

const controller = (cron: string) =>
  ({ cron, scheduledTime: Date.now(), noRetry: () => {} }) as ScheduledController;

describe('collector fetch', () => {
  it('returns ok on /health', async () => {
    const res = await setup().worker.fetch(req('/health'), testEnv());
    expect(await res.json()).toEqual({ ok: true });
  });

  it('returns 501 on /postback and 404 elsewhere', async () => {
    const { worker } = setup();
    expect((await worker.fetch(req('/postback'), testEnv())).status).toBe(501);
    expect((await worker.fetch(req('/nope'), testEnv())).status).toBe(404);
  });

  it('rejects /run without the right token or with GET', async () => {
    const { worker, dfs } = setup();
    expect((await worker.fetch(req('/run', { method: 'POST' }), testEnv())).status).toBe(401);
    const wrong = req('/run', { method: 'POST', headers: { authorization: 'Bearer nope' } });
    expect((await worker.fetch(wrong, testEnv())).status).toBe(401);
    expect((await worker.fetch(req('/run'), testEnv())).status).toBe(405);
    const noSecret = req('/run', { method: 'POST', headers: { authorization: 'Bearer x' } });
    expect(
      (await worker.fetch(noSecret, testEnv({ SUPABASE_SERVICE_ROLE_KEY: undefined }))).status,
    ).toBe(401);
    expect(dfs.calls).toHaveLength(0);
  });

  it('runs a manual posting run with the derived token', async () => {
    const { worker, mem, dfs } = setup();
    const token = await runToken('test-service-key');
    const res = await worker.fetch(
      req('/run', { method: 'POST', headers: { authorization: `Bearer ${token}` } }),
      testEnv(),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; summary: { kind: string; posted: number } };
    expect(body.summary.kind).toBe('manual');
    expect(body.summary.posted).toBe(mem.stays.length);
    expect(dfs.calls).toHaveLength(1);
  });

  it('reports a failed manual run as 500', async () => {
    const { worker, mem } = setup();
    mem.store.activeHotels = async () => {
      throw new Error('db down');
    };
    const token = await runToken('test-service-key');
    const res = await worker.fetch(
      req('/run', { method: 'POST', headers: { authorization: `Bearer ${token}` } }),
      testEnv(),
    );
    expect(res.status).toBe(500);
  });
});

describe('collector scheduled', () => {
  it('runs the morning posting run', async () => {
    const { worker, mem } = setup();
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await worker.scheduled(controller(CRON_MORNING), testEnv());
    expect(mem.runs[0]?.kind).toBe('morning');
    log.mockRestore();
  });

  it('skips the evening run while EVENING_RUN is false, runs it when true', async () => {
    const { worker, mem } = setup();
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await worker.scheduled(controller(CRON_EVENING), testEnv());
    expect(mem.runs).toHaveLength(0);
    await worker.scheduled(controller(CRON_EVENING), testEnv({ EVENING_RUN: 'true' }));
    expect(mem.runs[0]?.kind).toBe('evening');
    log.mockRestore();
  });

  it('ignores unknown crons', async () => {
    const { worker, mem } = setup();
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await worker.scheduled(controller('30 5 * * *'), testEnv());
    expect(mem.runs).toHaveLength(0);
    log.mockRestore();
  });

  it('fails loudly without Supabase settings', async () => {
    const worker = createWorker({ now });
    await expect(worker.scheduled(controller(CRON_MORNING), testEnv())).rejects.toThrow(
      'SUPABASE_URL',
    );
  });
});

describe('auth', () => {
  it('derives a stable 64-char hex token and compares safely', async () => {
    const a = await runToken('k');
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(await runToken('k')).toBe(a);
    expect(await runToken('other')).not.toBe(a);
    expect(safeEqual(a, a)).toBe(true);
    expect(safeEqual(a, a.slice(0, 63))).toBe(false);
  });
});
