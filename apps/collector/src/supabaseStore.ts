import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@tidaq/core';
import type { IngestPayload, OpenTask } from './ingest';
import type { CatalogHotel, CollectorStore, StayJob } from './store';

/** PostgREST returns at most this many rows per request (Supabase default `max_rows`). */
const PAGE = 1000;
/** Stay ids per `in (...)` filter, to keep request URLs short. */
const ID_CHUNK = 100;

/** Postgres via the service role (server only; RLS keeps the public out). */
export function supabaseStore(url: string, serviceRoleKey: string): CollectorStore {
  const db: SupabaseClient<Database> = createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const check = <T>(res: { data: T; error: { message: string } | null }, what: string) => {
    if (res.error) throw new Error(`${what}: ${res.error.message}`);
    if (res.data === null) throw new Error(`${what}: no data`);
    return res.data as NonNullable<T>;
  };
  const checkOk = (res: { error: { message: string } | null }, what: string): void => {
    if (res.error) throw new Error(`${what}: ${res.error.message}`);
  };

  return {
    async activeHotels() {
      const rows = check(
        await db
          .from('hotels')
          .select('id, dfs_hotel_identifier, cities!inner(slug)')
          .eq('active', true)
          .not('dfs_hotel_identifier', 'is', null),
        'load hotels',
      );
      return rows.map((h): CatalogHotel => ({
        id: h.id,
        citySlug: h.cities.slug,
        dfsHotelIdentifier: h.dfs_hotel_identifier as string,
      }));
    },

    async upsertGridStays(stays) {
      if (stays.length === 0) return 0;
      const rows = check(
        await db
          .from('tracked_stays')
          .upsert(
            stays.map((s) => ({
              hotel_id: s.hotelId,
              check_in: s.checkIn,
              check_out: s.checkOut,
              adults: s.adults,
              origin: 'grid',
            })),
            { onConflict: 'hotel_id,check_in,check_out,adults', ignoreDuplicates: true },
          )
          .select('id'),
        'upsert grid stays',
      );
      return rows.length;
    },

    async deactivatePastStays(today) {
      const rows = check(
        await db
          .from('tracked_stays')
          .update({ active: false })
          .eq('active', true)
          .lt('check_in', today)
          .select('id'),
        'deactivate past stays',
      );
      return rows.length;
    },

    async stayJobs(today) {
      const stays = check(
        await db
          .from('tracked_stays')
          .select('id, check_in, check_out, adults, hotels!inner(dfs_hotel_identifier, active)')
          .eq('active', true)
          .gte('check_in', today)
          .eq('hotels.active', true)
          .not('hotels.dfs_hotel_identifier', 'is', null),
        'load stays',
      );
      const watches = check(
        await db.from('watches').select('stay_id').eq('active', true),
        'load watches',
      );
      const watched = new Set(watches.map((w) => w.stay_id));
      return stays.map((s): StayJob => ({
        stayId: s.id,
        checkIn: s.check_in,
        checkOut: s.check_out,
        adults: s.adults,
        hotelIdentifier: s.hotels.dfs_hotel_identifier as string,
        watched: watched.has(s.id),
      }));
    },

    async usage(today) {
      const monthStart = `${today.slice(0, 8)}01`;
      const runs = check(
        await db
          .from('collector_runs')
          .select('started_at, tasks_posted, est_cost_usd')
          .gte('started_at', `${monthStart}T00:00:00Z`),
        'load usage',
      );
      let postedToday = 0;
      let spentThisMonthUsd = 0;
      for (const r of runs) {
        spentThisMonthUsd += Number(r.est_cost_usd);
        if (r.started_at >= `${today}T00:00:00`) postedToday += r.tasks_posted;
      }
      return { postedToday, spentThisMonthUsd };
    },

    async startRun(kind, env, startedAt) {
      const row = check(
        await db
          .from('collector_runs')
          .insert({ kind, env, started_at: startedAt })
          .select('id')
          .single(),
        'start run',
      );
      return row.id;
    },

    async finishRun(runId, patch) {
      checkOk(
        await db
          .from('collector_runs')
          .update({
            finished_at: patch.finishedAt,
            tasks_posted: patch.tasksPosted,
            tasks_skipped: patch.tasksSkipped,
            tasks_done: patch.tasksDone,
            est_cost_usd: patch.estCostUsd,
            budget_reason: patch.budgetReason,
            errors: (patch.errors ??
              []) as Database['public']['Tables']['collector_runs']['Row']['errors'],
          })
          .eq('id', runId),
        'finish run',
      );
    },

    async recordTasks(runId, tasks) {
      if (tasks.length === 0) return;
      checkOk(
        await db
          .from('collector_tasks')
          .insert(
            tasks.map((t) => ({ id: t.id, run_id: runId, stay_id: t.stayId, cost_usd: t.costUsd })),
          ),
        'record tasks',
      );
    },

    async openTasks(limit) {
      const rows = check(
        await db
          .from('collector_tasks')
          .select('id, stay_id, posted_at, tracked_stays!inner(hotel_id, check_in, check_out)')
          .eq('status', 'posted')
          .order('posted_at', { ascending: true })
          .limit(limit),
        'load open tasks',
      );
      return rows.map((t): OpenTask => ({
        id: t.id,
        stayId: t.stay_id,
        hotelId: t.tracked_stays.hotel_id,
        checkIn: t.tracked_stays.check_in,
        checkOut: t.tracked_stays.check_out,
        postedAt: t.posted_at,
      }));
    },

    async providerAliases() {
      const rows = check(
        await db.from('provider_aliases').select('alias, providers!inner(slug)').limit(PAGE),
        'load provider aliases',
      );
      return new Map(rows.map((r) => [r.alias, r.providers.slug]));
    },

    async ingest(payload: IngestPayload) {
      const res = check(
        await db.rpc('collector_ingest', {
          payload:
            payload as unknown as Database['public']['Functions']['collector_ingest']['Args']['payload'],
        }),
        'ingest',
      ) as { snapshots?: number; daily_rows?: number };
      return { snapshots: res.snapshots ?? 0, dailyRows: res.daily_rows ?? 0 };
    },

    async dailySeries(stayIds, fromDay) {
      const out: { stayId: number; day: string; bestCents: number }[] = [];
      for (let i = 0; i < stayIds.length; i += ID_CHUNK) {
        const ids = stayIds.slice(i, i + ID_CHUNK);
        for (let from = 0; ; from += PAGE) {
          const rows = check(
            await db
              .from('stay_daily')
              .select('stay_id, day, best_cents')
              .in('stay_id', ids)
              .gte('day', fromDay)
              .order('stay_id')
              .order('day')
              .range(from, from + PAGE - 1),
            'load stay_daily',
          );
          out.push(
            ...rows.map((r) => ({ stayId: r.stay_id, day: r.day, bestCents: r.best_cents })),
          );
          if (rows.length < PAGE) break;
        }
      }
      return out;
    },

    async upsertStats(rows) {
      if (rows.length === 0) return;
      checkOk(
        await db.from('stay_stats').upsert([...rows], { onConflict: 'stay_id' }),
        'upsert stay_stats',
      );
    },
  };
}
