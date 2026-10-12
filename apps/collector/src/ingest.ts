import {
  aliasKey,
  DFS_NO_RESULTS,
  DFS_OK,
  DFS_TASK_HANDED,
  DFS_TASK_IN_QUEUE,
  nights,
  normalizeHotelInfo,
  registrableDomain,
  unknownSources,
  type DfsHotelInfoResponse,
  type DfsHotelInfoResult,
} from '@tidaq/core';

/** A posted task that has no result yet (`collector_tasks.status = 'posted'`). */
export interface OpenTask {
  id: string;
  stayId: number;
  hotelId: number;
  checkIn: string;
  checkOut: string;
  postedAt: string;
}

export type TaskOutcome =
  | { kind: 'pending' }
  | { kind: 'no_results' }
  | { kind: 'failed'; error: string }
  | { kind: 'done'; result: DfsHotelInfoResult };

export type FinalTaskStatus = 'done' | 'no_results' | 'failed';

/** What `collector_ingest` (SQL) writes in one transaction. Keys match the SQL function. */
export interface IngestPayload {
  /** Unknown sources, created as pending providers with one alias each. */
  providers: { slug: string; name: string; domain: string | null; alias: string }[];
  snapshots: {
    task_id: string;
    stay_id: number;
    provider_slug: string;
    captured_at: string;
    total_cents: number;
    free_cancellation: boolean | null;
    raw: unknown;
  }[];
  tasks: { id: string; status: FinalTaskStatus; error: string | null }[];
  /** Filled only where `hotels.official_url` is still null. */
  official_urls: { hotel_id: number; url: string }[];
}

/** Reads a `task_get` response: ready, still queued, no results, or failed. */
export function taskOutcome(res: DfsHotelInfoResponse): TaskOutcome {
  const task = res.tasks[0];
  if (!task) return { kind: 'failed', error: 'empty task list' };
  if (task.status_code === DFS_TASK_HANDED || task.status_code === DFS_TASK_IN_QUEUE) {
    return { kind: 'pending' };
  }
  if (task.status_code === DFS_NO_RESULTS) return { kind: 'no_results' };
  if (task.status_code !== DFS_OK) {
    return { kind: 'failed', error: `${task.status_code} ${task.status_message}` };
  }
  const result = task.result?.[0];
  if (!result || !result.prices?.items?.length) return { kind: 'no_results' };
  return { kind: 'done', result };
}

/** `2026-10-12 16:06:07 +00:00` → ISO; null if it can't be read. */
export function parseDfsDatetime(value: string | null | undefined): string | null {
  if (!value) return null;
  const m = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) ([+-]\d{2}:\d{2})$/.exec(value.trim());
  if (!m) return null;
  const t = Date.parse(`${m[1]}T${m[2]}${m[3]}`);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

/** The hotel's website without tracking parameters, or null if it isn't an http(s) URL. */
export function cleanOfficialUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Turns fetched task results into rows (pure). Only eligible offers become snapshots: suspected
 * stay totals and outliers would distort best prices and provider tables (PLAN §7.3).
 * Pending tasks are left out, so they stay `posted` and are polled again.
 */
export function buildIngest(
  items: readonly { task: OpenTask; outcome: TaskOutcome }[],
  aliases: ReadonlyMap<string, string>,
  nowIso: string,
): IngestPayload {
  const payload: IngestPayload = { providers: [], snapshots: [], tasks: [], official_urls: [] };
  const providerSlugs = new Set<string>();
  const hotelsWithUrl = new Set<number>();

  for (const { task, outcome } of items) {
    if (outcome.kind === 'pending') continue;
    if (outcome.kind === 'failed') {
      payload.tasks.push({ id: task.id, status: 'failed', error: outcome.error });
      continue;
    }
    if (outcome.kind === 'no_results') {
      payload.tasks.push({ id: task.id, status: 'no_results', error: null });
      continue;
    }

    const { result } = outcome;
    const norm = normalizeHotelInfo(result, nights(task.checkIn, task.checkOut), aliases);
    const eligible = norm.offers.filter((o) => o.eligible);
    if (eligible.length === 0) {
      payload.tasks.push({ id: task.id, status: 'no_results', error: null });
      continue;
    }

    const capturedAt = parseDfsDatetime(result.datetime) ?? nowIso;
    for (const offer of eligible) {
      // slugify can return '' for a name without letters or digits; such a source can't be stored.
      if (!(offer.providerSlug ?? offer.sourceSlug)) continue;
      payload.snapshots.push({
        task_id: task.id,
        stay_id: task.stayId,
        provider_slug: offer.providerSlug ?? offer.sourceSlug,
        captured_at: capturedAt,
        total_cents: offer.totalCents,
        free_cancellation: offer.freeCancellationUntil ? true : null,
        raw: {
          ...offer.raw,
          source: offer.sourceName,
          url: offer.url,
          nightlyCents: offer.nightlyCents,
          freeCancellationUntil: offer.freeCancellationUntil,
        },
      });
    }
    for (const src of unknownSources(eligible)) {
      if (!src.slug || providerSlugs.has(src.slug)) continue;
      providerSlugs.add(src.slug);
      payload.providers.push({
        slug: src.slug,
        name: src.name,
        domain: src.domain,
        alias: src.domain ? registrableDomain(src.domain) : aliasKey(src.name),
      });
    }
    const url = cleanOfficialUrl(result.about?.url);
    if (url && !hotelsWithUrl.has(task.hotelId)) {
      hotelsWithUrl.add(task.hotelId);
      payload.official_urls.push({ hotel_id: task.hotelId, url });
    }
    payload.tasks.push({ id: task.id, status: 'done', error: null });
  }
  return payload;
}
