import type { GridStay } from '@tidaq/core';
import type { IngestPayload, OpenTask } from '../ingest';
import type {
  CatalogHotel,
  CollectorStore,
  DayReport,
  RunKind,
  RunPatch,
  StayJob,
  StayStatsRow,
} from '../store';

interface StayRow {
  id: number;
  hotelId: number;
  checkIn: string;
  checkOut: string;
  adults: number;
  active: boolean;
  origin: string;
}

/** In-memory CollectorStore for tests. Mirrors the Supabase behaviour the run logic relies on. */
export function memoryStore(
  hotels: CatalogHotel[],
  opts: { watchedStayIds?: number[]; aliases?: Record<string, string> } = {},
) {
  const stays: StayRow[] = [];
  const runs: ({
    id: number;
    kind: RunKind;
    env: string;
    startedAt: string;
  } & Partial<RunPatch>)[] = [];
  const tasks: {
    id: string;
    runId: number;
    stayId: number;
    costUsd: number;
    postedAt: string;
    status: string;
    error: string | null;
  }[] = [];
  const aliases = new Map(Object.entries(opts.aliases ?? {}));
  const providers = new Map<string, { pending: boolean; name: string }>(
    [...new Set(aliases.values())].map((slug) => [slug, { pending: false, name: slug }]),
  );
  const snapshots: (IngestPayload['snapshots'][number] & { day: string })[] = [];
  const daily = new Map<string, { stayId: number; day: string; bestCents: number; best: string }>();
  const stats = new Map<number, StayStatsRow>();
  const officialUrls = new Map<number, string>();
  let clock = '2026-10-12T05:00:00.000Z';
  let pruneCalls = 0;
  const watched = new Set(opts.watchedStayIds ?? []);
  const hotelById = new Map(hotels.map((h) => [h.id, h]));

  const store: CollectorStore = {
    async activeHotels() {
      return hotels;
    },
    async upsertGridStays(grid: readonly GridStay[]) {
      let inserted = 0;
      for (const s of grid) {
        const exists = stays.some(
          (r) =>
            r.hotelId === s.hotelId &&
            r.checkIn === s.checkIn &&
            r.checkOut === s.checkOut &&
            r.adults === s.adults,
        );
        if (!exists) {
          stays.push({ id: stays.length + 1, ...s, active: true, origin: 'grid' });
          inserted++;
        }
      }
      return inserted;
    },
    async deactivatePastStays(today) {
      let n = 0;
      for (const s of stays) {
        if (s.active && s.checkIn < today) {
          s.active = false;
          n++;
        }
      }
      return n;
    },
    async stayJobs(today) {
      return stays
        .filter((s) => s.active && s.checkIn >= today && hotelById.has(s.hotelId))
        .map((s): StayJob => ({
          stayId: s.id,
          checkIn: s.checkIn,
          checkOut: s.checkOut,
          adults: s.adults,
          hotelIdentifier: hotelById.get(s.hotelId)?.dfsHotelIdentifier ?? '',
          watched: watched.has(s.id),
        }));
    },
    async usage(today) {
      const month = today.slice(0, 7);
      let postedToday = 0;
      let spentThisMonthUsd = 0;
      for (const r of runs) {
        if (r.startedAt.startsWith(month)) spentThisMonthUsd += r.estCostUsd ?? 0;
        if (r.startedAt.startsWith(today)) postedToday += r.tasksPosted ?? 0;
      }
      return { postedToday, spentThisMonthUsd };
    },
    async startRun(kind, env, startedAt) {
      runs.push({ id: runs.length + 1, kind, env, startedAt });
      return runs.length;
    },
    async finishRun(runId, patch) {
      Object.assign(runs[runId - 1] ?? {}, patch);
    },
    async recordTasks(runId, posted) {
      tasks.push(
        ...posted.map((t) => ({ ...t, runId, postedAt: clock, status: 'posted', error: null })),
      );
    },
    async openTasks(limit) {
      return tasks
        .filter((t) => t.status === 'posted')
        .sort((a, b) => a.postedAt.localeCompare(b.postedAt))
        .slice(0, limit)
        .map((t): OpenTask => {
          const stay = stays.find((s) => s.id === t.stayId);
          if (!stay) throw new Error(`no stay ${t.stayId}`);
          return {
            id: t.id,
            stayId: t.stayId,
            hotelId: stay.hotelId,
            checkIn: stay.checkIn,
            checkOut: stay.checkOut,
            postedAt: t.postedAt,
          };
        });
    },
    async providerAliases() {
      return new Map(aliases);
    },
    // Mirrors the SQL function collector_ingest (supabase/migrations/*_collector_ingest.sql).
    async ingest(payload) {
      for (const p of payload.providers) {
        if (!providers.has(p.slug))
          providers.set(p.slug, { pending: true, name: p.name || p.slug });
        if (p.alias && !aliases.has(p.alias)) aliases.set(p.alias, p.slug);
      }
      let inserted = 0;
      const touched = new Set<string>();
      for (const s of payload.snapshots) {
        if (!providers.has(s.provider_slug)) continue;
        const dup = snapshots.some(
          (x) => x.task_id === s.task_id && x.provider_slug === s.provider_slug,
        );
        const day = s.captured_at.slice(0, 10);
        touched.add(`${s.stay_id}|${day}`);
        if (dup) continue;
        snapshots.push({ ...s, day });
        inserted++;
      }
      for (const key of touched) {
        const [stayId, day] = key.split('|') as [string, string];
        const rows = snapshots.filter((x) => x.stay_id === Number(stayId) && x.day === day);
        const best = rows.reduce((a, b) =>
          b.total_cents < a.total_cents ||
          (b.total_cents === a.total_cents && b.provider_slug < a.provider_slug)
            ? b
            : a,
        );
        daily.set(key, {
          stayId: Number(stayId),
          day,
          bestCents: best.total_cents,
          best: best.provider_slug,
        });
      }
      for (const t of payload.tasks) {
        const row = tasks.find((x) => x.id === t.id && x.status === 'posted');
        if (row) Object.assign(row, { status: t.status, error: t.error });
      }
      for (const u of payload.official_urls) {
        if (!officialUrls.has(u.hotel_id)) officialUrls.set(u.hotel_id, u.url);
      }
      return { snapshots: inserted, dailyRows: touched.size };
    },
    async dailySeries(stayIds, fromDay) {
      return [...daily.values()]
        .filter((d) => stayIds.includes(d.stayId) && d.day >= fromDay)
        .map(({ stayId, day, bestCents }) => ({ stayId, day, bestCents }));
    },
    async upsertStats(rows) {
      for (const r of rows) stats.set(r.stay_id, r);
    },
    async dayReport(today) {
      const count = (status: string) =>
        tasks.filter((t) => t.status === status && t.postedAt.startsWith(today)).length;
      return {
        runs: runs
          .filter((r) => r.startedAt.startsWith(today))
          .map((r): DayReport['runs'][number] => ({
            kind: r.kind,
            env: r.env,
            startedAt: r.startedAt,
            finishedAt: r.finishedAt ?? null,
            errors: (r.errors ?? []).map(String),
          })),
        tasks: {
          posted: count('posted'),
          done: count('done'),
          noResults: count('no_results'),
          failed: count('failed'),
        },
      };
    },
    async pruneRaw() {
      pruneCalls++;
      return 0;
    },
  };
  return {
    store,
    stays,
    runs,
    tasks,
    snapshots,
    daily,
    stats,
    providers,
    officialUrls,
    pruneCalls: () => pruneCalls,
    /** Sets the `posted_at` time for tasks recorded from now on. */
    setClock(iso: string) {
      clock = iso;
    },
  };
}

/** Fake DataForSEO task_post: accepts every task unless its stay id is in `failStayIds`. */
export function fakeDataForSeo(opts: { failStayIds?: number[]; httpStatus?: number[] } = {}) {
  const calls: {
    url: string;
    body: { tag: string; hotel_identifier: string }[];
    headers: Record<string, string>;
  }[] = [];
  const statuses = [...(opts.httpStatus ?? [])];
  const fetchFn = async (url: string, init?: RequestInit): Promise<Response> => {
    const body = JSON.parse(String(init?.body ?? '[]'));
    calls.push({ url, body, headers: (init?.headers ?? {}) as Record<string, string> });
    const status = statuses.shift() ?? 200;
    if (status !== 200) return new Response('error', { status });
    return Response.json({
      status_code: 20000,
      status_message: 'Ok.',
      cost: body.length * 0.0008,
      tasks: body.map((t: { tag: string }, i: number) =>
        opts.failStayIds?.includes(Number(t.tag))
          ? {
              id: `x-${i}`,
              status_code: 40501,
              status_message: 'Invalid Field',
              cost: 0,
              data: { tag: t.tag },
            }
          : {
              id: `task-${t.tag}`,
              status_code: 20100,
              status_message: 'Task Created.',
              cost: 0.0008,
              data: { tag: t.tag },
            },
      ),
    });
  };
  return { fetchFn, calls };
}
