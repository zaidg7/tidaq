import {
  DFS_OK,
  DFS_TASK_CREATED,
  dfsHotelInfoResponseSchema,
  dfsHotelSearchResponseSchema,
  dfsTasksReadyResponseSchema,
  z,
  type DfsHotelInfoResponse,
  type DfsHotelSearchResponse,
} from '@tidaq/core';

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

/** Ids of tasks whose results are ready (free call). Each id is listed until it is fetched. */
export async function tasksReady(
  creds: DfsCredentials,
  fetchFn: FetchFn = fetch,
): Promise<Set<string>> {
  const res = await fetchWithRetry(fetchFn, `${API}/tasks_ready`, { headers: headers(creds) });
  const json = dfsTasksReadyResponseSchema.parse(await res.json());
  if (json.status_code !== DFS_OK) throw new Error(`${json.status_code} ${json.status_message}`);
  return new Set((json.tasks ?? []).flatMap((t) => (t.result ?? []).map((r) => r.id)));
}

/**
 * One task's result (free call, available for 30 days). Throws on transport or envelope
 * errors; the task's own status (ready, queued, no results) is in `tasks[0]`.
 */
export async function taskGet(
  id: string,
  creds: DfsCredentials,
  fetchFn: FetchFn = fetch,
): Promise<DfsHotelInfoResponse> {
  const res = await fetchWithRetry(fetchFn, `${API}/task_get/advanced/${encodeURIComponent(id)}`, {
    headers: headers(creds),
  });
  const json = dfsHotelInfoResponseSchema.parse(await res.json());
  if (json.status_code !== DFS_OK) throw new Error(`${json.status_code} ${json.status_message}`);
  return json;
}

const SEARCH_API = 'https://api.dataforseo.com/v3/business_data/google/hotel_searches';

export interface HotelSearchTask {
  /** Our hotel id; DataForSEO returns it as `tag`. */
  hotelId: number;
  keyword: string;
  locationCode: number;
  checkIn: string;
  checkOut: string;
}

export interface PostedSearch {
  id: string;
  hotelId: number;
  costUsd: number;
}

/**
 * Posts Hotel Searches tasks (C-153: a hotel's Google id). Paid like Hotel Info: never call it
 * without the quote budget guard in front of it (CLAUDE.md hard rule 4).
 */
export async function postHotelSearchTasks(
  tasks: readonly HotelSearchTask[],
  creds: DfsCredentials,
  fetchFn: FetchFn = fetch,
): Promise<{ posted: PostedSearch[]; errors: { hotelId: number; message: string }[] }> {
  const result: { posted: PostedSearch[]; errors: { hotelId: number; message: string }[] } = {
    posted: [],
    errors: [],
  };
  if (tasks.length === 0) return result;
  const body = tasks.slice(0, MAX_TASKS_PER_POST).map((t) => ({
    keyword: t.keyword,
    location_code: t.locationCode,
    language_code: 'en',
    currency: 'EUR',
    adults: 2,
    check_in: t.checkIn,
    check_out: t.checkOut,
    tag: String(t.hotelId),
  }));
  try {
    const res = await fetchWithRetry(fetchFn, `${SEARCH_API}/task_post`, {
      method: 'POST',
      headers: headers(creds),
      body: JSON.stringify(body),
    });
    const json = postResponseSchema.parse(await res.json());
    if (json.status_code !== DFS_OK) throw new Error(`${json.status_code} ${json.status_message}`);
    for (const t of json.tasks) {
      const hotelId = Number(t.data.tag);
      if (t.status_code === DFS_TASK_CREATED && Number.isInteger(hotelId)) {
        result.posted.push({ id: t.id, hotelId, costUsd: t.cost });
      } else {
        result.errors.push({ hotelId, message: `${t.status_code} ${t.status_message}` });
      }
    }
  } catch (err) {
    for (const t of tasks) result.errors.push({ hotelId: t.hotelId, message: String(err) });
  }
  return result;
}

/** Ids of Hotel Searches tasks whose results are ready (free call). */
export async function searchTasksReady(
  creds: DfsCredentials,
  fetchFn: FetchFn = fetch,
): Promise<Set<string>> {
  const res = await fetchWithRetry(fetchFn, `${SEARCH_API}/tasks_ready`, {
    headers: headers(creds),
  });
  const json = dfsTasksReadyResponseSchema.parse(await res.json());
  if (json.status_code !== DFS_OK) throw new Error(`${json.status_code} ${json.status_message}`);
  return new Set((json.tasks ?? []).flatMap((t) => (t.result ?? []).map((r) => r.id)));
}

/** One Hotel Searches task's result (free call); the task's own status is in `tasks[0]`. */
export async function searchTaskGet(
  id: string,
  creds: DfsCredentials,
  fetchFn: FetchFn = fetch,
): Promise<DfsHotelSearchResponse> {
  const res = await fetchWithRetry(fetchFn, `${SEARCH_API}/task_get/${encodeURIComponent(id)}`, {
    headers: headers(creds),
  });
  const json = dfsHotelSearchResponseSchema.parse(await res.json());
  if (json.status_code !== DFS_OK) throw new Error(`${json.status_code} ${json.status_message}`);
  return json;
}
