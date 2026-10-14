import { XOTELO, xoteloOutcome, xoteloRatesUrl } from '@tidaq/core';
import type { FetchFn } from './dataforseo';
import type { OpenTask, TaskOutcome } from './ingest';

const HEADERS = {
  accept: 'application/json',
  'user-agent': 'Tidaq/1.0 (+https://tidaq.com)',
};

/**
 * One stay's prices from Xotelo (D-41). One call, no retry inside the run: the Workers free plan
 * allows 50 outgoing requests per run, and a task that throws stays `posted`, so the next collect
 * run (10 minutes later) tries again. Network errors, 5xx and 429 throw; a 4xx or an answer that
 * doesn't fit fails the task for good.
 */
export async function fetchXoteloTask(
  task: OpenTask,
  fetchFn: FetchFn = fetch,
): Promise<TaskOutcome> {
  if (!task.xoteloKey) return { kind: 'failed', error: 'hotel has no xotelo_key' };
  const url = xoteloRatesUrl({
    hotelKey: task.xoteloKey,
    checkIn: task.checkIn,
    checkOut: task.checkOut,
    adults: task.adults,
  });
  const res = await fetchFn(url, {
    headers: HEADERS,
    signal: AbortSignal.timeout(XOTELO.timeoutMs),
  });
  if (res.status === 429 || res.status >= 500) throw new Error(`Xotelo HTTP ${res.status}`);
  if (!res.ok) return { kind: 'failed', error: `HTTP ${res.status}` };
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return { kind: 'failed', error: 'answer is not JSON' };
  }
  return xoteloOutcome(body, task);
}
