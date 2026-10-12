import { describe, expect, it, vi } from 'vitest';
import worker from './index';
import type { Env } from './env';

const env: Env = {
  DAILY_TASK_CAP: '300',
  MONTHLY_BUDGET_USD: '12',
  EVENING_RUN: 'false',
  GRID_WEEKENDS: '6',
  GRID_MIDWEEK: '2',
  ALERTS_DRY_RUN: 'true',
};

const call = (path: string) =>
  worker.fetch(new Request(`https://collector.test${path}`) as Parameters<typeof worker.fetch>[0]);

const controller = (cron: string) =>
  ({ cron, scheduledTime: Date.now(), noRetry: () => {} }) as ScheduledController;

describe('collector fetch', () => {
  it('returns ok on /health', async () => {
    const res = await call('/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('returns 501 on /postback until C-013', async () => {
    const res = await call('/postback?token=x');
    expect(res.status).toBe(501);
  });

  it('returns 404 for unknown paths', async () => {
    const res = await call('/nope');
    expect(res.status).toBe(404);
  });
});

describe('collector scheduled', () => {
  it('skips the evening run while EVENING_RUN is false', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await worker.scheduled(controller('0 17 * * *'), env);
    expect(log).toHaveBeenCalledWith(expect.stringContaining('evening run disabled'));
    log.mockRestore();
  });

  it('runs the morning cron', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await worker.scheduled(controller('0 5 * * *'), env);
    expect(log).toHaveBeenCalledWith(expect.stringContaining('cron fired'));
    log.mockRestore();
  });
});
