import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { runToken } from '@tidaq/core';
import type { FetchFn } from './dataforseo';
import { createWorker, CRON_COLLECT, CRON_DAILY, CRON_EVENING, CRON_MORNING } from './index';
import { testEnv } from './test/env';
import { fakeDataForSeo, memoryStore } from './test/memoryStore';
import { fakeMail } from './test/mail';
import { fakeResults, hotelInfoFixture, SEED_ALIASES } from './test/results';

const hotels = [{ id: 1, citySlug: 'berlin', dfsHotelIdentifier: 'id-adlon', xoteloKey: null }];
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

/** Posting goes to the task_post fake, everything else to a results fake with all tasks ready. */
function setupWithResults() {
  const mem = memoryStore(hotels, { aliases: SEED_ALIASES });
  const post = fakeDataForSeo();
  const fetchFn: FetchFn = async (url, init) => {
    if (url.endsWith('/task_post')) return post.fetchFn(url, init);
    const ids = mem.tasks.map((t) => t.id);
    const results = fakeResults({
      ready: ids,
      responses: Object.fromEntries(
        ids.map((id) => [id, hotelInfoFixture('hotel_info-info-adlon-dec-id.json', id)]),
      ),
    });
    return results.fetchFn(url);
  };
  const worker = createWorker({ store: mem.store, fetchFn, now });
  return { worker, mem };
}

describe('collector /collect', () => {
  it('rejects /collect without the token', async () => {
    const { worker } = setupWithResults();
    expect((await worker.fetch(req('/collect', { method: 'POST' }), testEnv())).status).toBe(401);
  });

  it('collects ready results after a manual run', async () => {
    const { worker, mem } = setupWithResults();
    const auth = { authorization: `Bearer ${await runToken('test-service-key')}` };
    await worker.fetch(req('/run', { method: 'POST', headers: auth }), testEnv());
    const res = await worker.fetch(req('/collect', { method: 'POST', headers: auth }), testEnv());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { summary: { done: number; snapshots: number } };
    expect(body.summary.done).toBe(mem.tasks.length);
    expect(body.summary.snapshots).toBeGreaterThan(0);
  });
});

describe('collector scheduled', () => {
  it('runs a collect run on the collect cron', async () => {
    const { worker, mem } = setupWithResults();
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await worker.scheduled(controller(CRON_MORNING), testEnv());
    await worker.scheduled(controller(CRON_COLLECT), testEnv());
    expect(mem.runs.map((r) => r.kind)).toEqual(['morning', 'collect']);
    expect(mem.tasks.every((t) => t.status === 'done')).toBe(true);
    // Nothing open any more: the next collect run writes no run row.
    await worker.scheduled(controller(CRON_COLLECT), testEnv());
    expect(mem.runs).toHaveLength(2);
    log.mockRestore();
  });

  it('uses the same crons as wrangler.jsonc', () => {
    const config = readFileSync(join(__dirname, '..', 'wrangler.jsonc'), 'utf8');
    const crons = /"crons":\s*\[([^\]]*)\]/.exec(config)?.[1] ?? '';
    expect([...crons.matchAll(/"([^"]+)"/g)].map((m) => m[1])).toEqual([
      CRON_MORNING,
      CRON_EVENING,
      CRON_COLLECT,
      CRON_DAILY,
    ]);
  });

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

describe('collector admin emails', () => {
  const mailEnv = testEnv({ RESEND_API_KEY: 're_test', ADMIN_EMAILS: 'ops@example.com' });

  it('emails when a posting run has errors', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const mem = memoryStore(hotels);
    const mail = fakeMail();
    const worker = createWorker({
      store: mem.store,
      fetchFn: fakeDataForSeo({ failStayIds: [1] }).fetchFn,
      mailFetchFn: mail.fetchFn,
      now,
    });
    await worker.scheduled(controller(CRON_MORNING), mailEnv);
    expect(mail.sent.map((m) => m.subject)).toEqual([
      '[staging] Collector: morning run had 1 error(s)',
    ]);
    vi.restoreAllMocks();
  });

  it('emails and rethrows when a run crashes', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const mem = memoryStore(hotels);
    mem.store.activeHotels = async () => {
      throw new Error('db down');
    };
    const mail = fakeMail();
    const worker = createWorker({ store: mem.store, mailFetchFn: mail.fetchFn, now });
    await expect(worker.scheduled(controller(CRON_MORNING), mailEnv)).rejects.toThrow('db down');
    expect(mail.sent[0]?.subject).toBe('[staging] Collector: morning run failed');
    vi.restoreAllMocks();
  });

  it('sends nothing for a clean run', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const mem = memoryStore(hotels);
    const mail = fakeMail();
    const worker = createWorker({
      store: mem.store,
      fetchFn: fakeDataForSeo().fetchFn,
      mailFetchFn: mail.fetchFn,
      now,
    });
    await worker.scheduled(controller(CRON_MORNING), mailEnv);
    expect(mail.sent).toEqual([]);
    vi.restoreAllMocks();
  });

  it('runs the daily check on its cron and emails if the check itself fails', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const mem = memoryStore(hotels);
    const mail = fakeMail();
    const worker = createWorker({
      store: mem.store,
      mailFetchFn: mail.fetchFn,
      now: () => new Date('2026-10-12T07:55:00Z'),
    });
    await worker.scheduled(controller(CRON_DAILY), mailEnv);
    expect(mem.pruneCalls()).toBe(1);
    expect(mail.sent[0]?.subject).toBe(
      '[staging] Collector: daily check found problems (2026-10-12)',
    );

    mem.store.pruneRaw = async () => {
      throw new Error('db down');
    };
    await expect(worker.scheduled(controller(CRON_DAILY), mailEnv)).rejects.toThrow('db down');
    expect(mail.sent[1]?.subject).toBe('[staging] Collector: daily check failed');
    vi.restoreAllMocks();
  });
});
