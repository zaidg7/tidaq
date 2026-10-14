import type { GridStay } from '@tidaq/core';
import type { IngestPayload, OpenTask } from '../ingest';
import type {
  AlertOffer,
  AlertWatch,
  CatalogHotel,
  CollectorStore,
  DayReport,
  NightAccuracyRow,
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
  const daily = new Map<
    string,
    { stayId: number; day: string; bestCents: number; best: string | null }
  >();
  const stats = new Map<number, StayStatsRow>();
  /**
   * night_accuracy by day. The comparison itself is SQL; tests seed the row a day should get
   * (recording a day without a seeded row stores an empty one).
   */
  const accuracy = new Map<string, NightAccuracyRow>();
  /** Watches for the alert engine (C-031): tests push into it; recorded alerts land below. */
  const alertWatches: AlertWatch[] = [];
  /** Today's offers per watch id (C-031b). */
  const alertOffers = new Map<string, AlertOffer[]>();
  const recordedAlerts: {
    watchId: string;
    kind: string;
    priceCents: number;
    resendId: string | null;
  }[] = [];
  /** night_daily by `hotelId|night|day`: rates by provider slug and the cheapest reviewed one. */
  const nights = new Map<
    string,
    {
      hotelId: number;
      night: string;
      day: string;
      offers: Record<string, number>;
      best: number | null;
    }
  >();
  const officialUrls = new Map<number, string>();
  let clock = '2026-10-12T05:00:00.000Z';
  let pruneCalls = 0;
  const watched = new Set(opts.watchedStayIds ?? []);
  const hotelById = new Map(hotels.map((h) => [h.id, h]));
  const toJob = (s: StayRow): StayJob => ({
    stayId: s.id,
    checkIn: s.checkIn,
    checkOut: s.checkOut,
    adults: s.adults,
    hotelIdentifier: hotelById.get(s.hotelId)?.dfsHotelIdentifier ?? null,
    xoteloKey: hotelById.get(s.hotelId)?.xoteloKey ?? null,
    watched: watched.has(s.id),
  });

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
        .map(toJob);
    },
    async requestedStayJobs(today) {
      return stays
        .filter(
          (s) =>
            s.origin === 'watch' &&
            s.active &&
            s.checkIn >= today &&
            hotelById.has(s.hotelId) &&
            !tasks.some((t) => t.stayId === s.id),
        )
        .map(toJob);
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
            adults: stay.adults,
            xoteloKey: hotelById.get(stay.hotelId)?.xoteloKey ?? null,
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
      // Mirrors rebuild_stay_daily: a stay's days come from the source of its newest snapshot
      // only (D-41); days only the other source priced are dropped.
      const sourceOf = new Map<number, string>();
      for (const stayId of new Set([...touched].map((k) => Number(k.split('|')[0])))) {
        const newest = snapshots
          .filter((x) => x.stay_id === stayId)
          .reduce((a, b) => (b.captured_at >= a.captured_at ? b : a));
        sourceOf.set(stayId, newest.source);
        for (const [key, row] of daily) {
          const kept = snapshots.some(
            (x) => x.stay_id === stayId && x.day === row.day && x.source === newest.source,
          );
          if (row.stayId === stayId && !kept) daily.delete(key);
        }
      }
      for (const key of touched) {
        const [stayId, day] = key.split('|') as [string, string];
        // The best price comes from reviewed providers; a day with pending providers only keeps
        // the raw minimum and has no best provider.
        const all = snapshots.filter(
          (x) =>
            x.stay_id === Number(stayId) &&
            x.day === day &&
            x.source === sourceOf.get(Number(stayId)),
        );
        if (all.length === 0) continue;
        const reviewed = all.filter((x) => !providers.get(x.provider_slug)?.pending);
        const rows = reviewed.length > 0 ? reviewed : all;
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
          best: reviewed.length > 0 ? best.provider_slug : null,
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
        .filter((d) => stayIds.includes(d.stayId) && d.day >= fromDay && d.best !== null)
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
    async recordNightAccuracy(day) {
      const row = accuracy.get(day) ?? {
        day,
        pairs: 0,
        within3: 0,
        pairsShown: 0,
        within3Shown: 0,
        medianGapPct: null,
        worst: [],
      };
      accuracy.set(day, row);
      return row;
    },
    async nightAccuracy(fromDay) {
      return [...accuracy.values()]
        .filter((r) => r.day >= fromDay)
        .sort((a, b) => (a.day < b.day ? 1 : -1));
    },
    async pruneRaw() {
      pruneCalls++;
      return 0;
    },
    async alertInputs(today) {
      return alertWatches.filter((w) => w.checkIn > today);
    },
    async alertOffers(watchId) {
      return alertOffers.get(watchId) ?? [];
    },
    async recordAlert(watchId, kind, priceCents, resendId) {
      recordedAlerts.push({ watchId, kind, priceCents, resendId });
      const w = alertWatches.find((x) => x.watchId === watchId);
      if (w) {
        w.lastAlertCents = priceCents;
        w.lastAlertAt = new Date().toISOString();
      }
    },
    async nightJobs(today, window, limit) {
      const jobs: { hotelId: number; xoteloKey: string; night: string }[] = [];
      for (let i = 0; i < window; i++) {
        const night = new Date(Date.parse(`${today}T00:00:00Z`) + i * 86_400_000)
          .toISOString()
          .slice(0, 10);
        for (const h of [...hotels].sort((a, b) => a.id - b.id)) {
          if (!h.xoteloKey || nights.has(`${h.id}|${night}|${today}`)) continue;
          jobs.push({ hotelId: h.id, xoteloKey: h.xoteloKey, night });
        }
      }
      return jobs.slice(0, limit);
    },
    async ingestNights(payload) {
      for (const p of payload.providers) {
        if (!providers.has(p.slug)) providers.set(p.slug, { pending: true, name: p.name });
        if (p.alias && !aliases.has(p.alias)) aliases.set(p.alias, p.slug);
      }
      for (const n of payload.nights) {
        const reviewed = Object.entries(n.offers).filter(
          ([slug]) => providers.get(slug)?.pending === false,
        );
        nights.set(`${n.hotel_id}|${n.night}|${n.day}`, {
          hotelId: n.hotel_id,
          night: n.night,
          day: n.day,
          offers: n.offers,
          best: reviewed.length ? Math.min(...reviewed.map(([, c]) => c)) : null,
        });
      }
      return payload.nights.length;
    },
  };
  return {
    store,
    nights,
    accuracy,
    stays,
    runs,
    tasks,
    snapshots,
    daily,
    stats,
    providers,
    officialUrls,
    pruneCalls: () => pruneCalls,
    alertWatches,
    alertOffers,
    recordedAlerts,
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
