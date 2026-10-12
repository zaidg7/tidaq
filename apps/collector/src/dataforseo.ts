import { DFS_OK, DFS_TASK_CREATED, z } from '@tidaq/core';

const API = 'https://api.dataforseo.com/v3/business_data/google/hotel_info';
/** DataForSEO accepts at most 100 tasks per POST (C-010). */
export const MAX_TASKS_PER_POST = 100;
/** Germany: prices as German users see them (D-39). */
export const LOCATION_GERMANY = 2276;

export interface HotelInfoTask {
  hotelIdentifier: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  /** Our tracked stay id; DataForSEO returns it as `tag`. */
  stayId: number;
}

export interface PostedTask {
  id: string;
  stayId: number;
  costUsd: number;
}

export interface DfsCredentials {
  login?: string;
  password?: string;
}

export type FetchFn = (input: string, init?: RequestInit) => Promise<Response>;

const postResponseSchema = z.object({
  status_code: z.number(),
  status_message: z.string(),
  tasks: z.array(
    z.object({
      id: z.string(),
      status_code: z.number(),
      status_message: z.string(),
      cost: z.number(),
      data: z.object({ tag: z.string().optional() }),
    }),
  ),
});

function headers(creds: DfsCredentials): Record<string, string> {
  const h: Record<string, string> = { 'content-type': 'application/json' };
  // In cloud sessions an egress proxy adds auth, so credentials are optional (CLAUDE.md §7).
  if (creds.login && creds.password)
    h.authorization = `Basic ${btoa(`${creds.login}:${creds.password}`)}`;
  return h;
}

/** Retries 5xx and network errors with exponential backoff; 4xx fail at once. */
export async function fetchWithRetry(
  fetchFn: FetchFn,
  url: string,
  init: RequestInit,
  {
    attempts = 3,
    baseDelayMs = 500,
    sleep = (ms: number) => new Promise((r) => setTimeout(r, ms)),
  } = {},
): Promise<Response> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetchFn(url, init);
      if (res.status < 500) return res;
      lastError = new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastError = err;
    }
    if (i < attempts - 1) await sleep(baseDelayMs * 2 ** i);
  }
  throw new Error(`DataForSEO request failed after ${attempts} attempts: ${String(lastError)}`);
}

export interface PostResult {
  posted: PostedTask[];
  errors: { stayId: number; message: string }[];
}

/**
 * Posts Hotel Info tasks (standard queue) in batches of 100. Never call this without the budget
 * guard (`applyBudget`) in front of it (CLAUDE.md hard rule 4).
 */
export async function postHotelInfoTasks(
  tasks: readonly HotelInfoTask[],
  creds: DfsCredentials,
  fetchFn: FetchFn = fetch,
): Promise<PostResult> {
  const result: PostResult = { posted: [], errors: [] };
  for (let i = 0; i < tasks.length; i += MAX_TASKS_PER_POST) {
    const batch = tasks.slice(i, i + MAX_TASKS_PER_POST);
    const body = batch.map((t) => ({
      hotel_identifier: t.hotelIdentifier,
      check_in: t.checkIn,
      check_out: t.checkOut,
      adults: t.adults,
      currency: 'EUR',
      language_code: 'de',
      location_code: LOCATION_GERMANY,
      tag: String(t.stayId),
    }));
    try {
      const res = await fetchWithRetry(fetchFn, `${API}/task_post`, {
        method: 'POST',
        headers: headers(creds),
        body: JSON.stringify(body),
      });
      const json = postResponseSchema.parse(await res.json());
      if (json.status_code !== DFS_OK)
        throw new Error(`${json.status_code} ${json.status_message}`);
      for (const t of json.tasks) {
        const stayId = Number(t.data.tag);
        if (t.status_code === DFS_TASK_CREATED && Number.isInteger(stayId)) {
          result.posted.push({ id: t.id, stayId, costUsd: t.cost });
        } else {
          result.errors.push({ stayId, message: `${t.status_code} ${t.status_message}` });
        }
      }
    } catch (err) {
      for (const t of batch) result.errors.push({ stayId: t.stayId, message: String(err) });
    }
  }
  return result;
}
