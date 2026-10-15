import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { DEALS, priceDropRowSchema, z, type Database } from '@tidaq/core';
import type { IngestPayload, OpenTask } from './ingest';
import type {
  CatalogHotel,
  CollectorStore,
  DayReport,
  NightAccuracyRow,
  RunKind,
  StayJob,
} from './store';

/** PostgREST returns at most this many rows per request (Supabase default `max_rows`). */
const PAGE = 1000;

/** `alert_inputs` rows (C-031): validated before any email goes out. */
const alertRows = z.array(
  z.object({
    watch_id: z.string().uuid(),
    email: z.string().email(),
    locale: z.enum(['de', 'en']),
    manage_token: z.string().uuid(),
    hotel_slug: z.string(),
    hotel_name: z.string(),
    check_in: z.string(),
    check_out: z.string(),
    adults: z.number().int(),
    target_cents: z.number().int().nullable(),
    last_alert_cents: z.number().int().nullable(),
    last_alert_at: z.string().nullable(),
    series: z.array(z.object({ day: z.string(), cents: z.number().int() })),
  }),
);

/** Newsletter recipients (C-054b): confirmed, subscribed addresses. */
const recipientRows = z.array(
  z.object({
    email: z.string().email(),
    locale: z.enum(['de', 'en']),
    manage_token: z.string().uuid(),
  }),
);

/** Preissturz-Alarm recipients (C-080e2). */
const dropRecipientRows = z.array(
  z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    locale: z.enum(['de', 'en']),
    manage_token: z.string().uuid(),
    drop_alerts: z.boolean(),
    drop_city: z.string().nullable(),
    hotel_ids: z.array(z.number().int()),
  }),
);

/** `v_stay_public` rows for the weekly deals (C-054b). */
const dealRows = z.array(
  z.object({
    stay_id: z.number().int(),
    hotel_slug: z.string(),
    hotel_name: z.string(),
    city_name_de: z.string(),
    city_name_en: z.string(),
    check_in: z.string(),
    check_out: z.string(),
    adults: z.number().int(),
    now_cents: z.number().int().nullable(),
    avg30_cents: z.number().int().nullable(),
    days_tracked: z.number().int().nullable(),
  }),
);

/** `web_error_digest` rows (C-041c). */
const webErrorRows = z.array(
  z.object({ source: z.string(), message: z.string(), n: z.number().int(), last_at: z.string() }),
);

/** `alert_offers` (C-031b): today's offers of one watched stay, reviewed providers only. */
const alertOfferRows = z.array(
  z.object({
    id: z.number().int(),
    slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
    name: z.string().min(1),
    is_direct: z.boolean(),
    partner: z.boolean(),
    cents: z.number().int().positive(),
    score: z.number().int().nullable(),
    tests: z.number().int().nonnegative(),
    matches: z.number().int().nonnegative(),
    avg_markup_pct: z.coerce.number().nullable(),
  }),
);

/** A `night_accuracy` row as Postgres returns it (numeric comes back as a number or string). */
const accuracyRow = z.object({
  day: z.string(),
  pairs: z.number().int(),
  within_3: z.number().int(),
  pairs_shown: z.number().int(),
  within_3_shown: z.number().int(),
  median_gap_pct: z.coerce.number().nullable(),
  worst: z.array(
    z.object({ name: z.string(), pairs: z.number().int(), within_3: z.number().int() }),
  ),
});

function toAccuracy(raw: unknown): NightAccuracyRow {
  const r = accuracyRow.parse(raw);
  return {
    day: r.day,
    pairs: r.pairs,
    within3: r.within_3,
    pairsShown: r.pairs_shown,
    within3Shown: r.within_3_shown,
    medianGapPct: r.median_gap_pct,
    worst: r.worst.map((w) => ({ name: w.name, pairs: w.pairs, within3: w.within_3 })),
  };
}
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
          .select('id, dfs_hotel_identifier, xotelo_key, cities!inner(slug)')
          .eq('active', true)
          .or('dfs_hotel_identifier.not.is.null,xotelo_key.not.is.null'),
        'load hotels',
      );
      return rows.map((h): CatalogHotel => ({
        id: h.id,
        citySlug: h.cities.slug,
        dfsHotelIdentifier: h.dfs_hotel_identifier,
        xoteloKey: h.xotelo_key,
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
          .select(
            'id, check_in, check_out, adults, hotels!inner(dfs_hotel_identifier, xotelo_key, active)',
          )
          .eq('active', true)
          .gte('check_in', today)
          .eq('hotels.active', true),
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
        hotelIdentifier: s.hotels.dfs_hotel_identifier,
        xoteloKey: s.hotels.xotelo_key,
        watched: watched.has(s.id),
      }));
    },

    async requestedStayJobs(today) {
      // Anti-join: stays without any collector task (PostgREST `rel=is.null` on the embed).
      const stays = check(
        await db
          .from('tracked_stays')
          .select(
            'id, check_in, check_out, adults, hotels!inner(dfs_hotel_identifier, xotelo_key, active), collector_tasks(id)',
          )
          .eq('origin', 'watch')
          .eq('active', true)
          .gte('check_in', today)
          .eq('hotels.active', true)
          .is('collector_tasks', null),
        'load requested stays',
      );
      return stays.map((s): StayJob => ({
        stayId: s.id,
        checkIn: s.check_in,
        checkOut: s.check_out,
        adults: s.adults,
        hotelIdentifier: s.hotels.dfs_hotel_identifier,
        xoteloKey: s.hotels.xotelo_key,
        watched: false,
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
            daily_cap: patch.dailyCap,
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
          .select(
            'id, stay_id, posted_at, tracked_stays!inner(hotel_id, check_in, check_out, adults, hotels!inner(xotelo_key))',
          )
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
        adults: t.tracked_stays.adults,
        xoteloKey: t.tracked_stays.hotels.xotelo_key,
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

    async nightJobs(today, window, limit) {
      const rows = check(
        await db.rpc('night_jobs', { p_today: today, p_window: window, p_limit: limit }),
        'load night jobs',
      );
      return rows.map((r) => ({ hotelId: r.hotel_id, xoteloKey: r.xotelo_key, night: r.night }));
    },

    async ingestNights(payload) {
      const res = await db.rpc('night_ingest', {
        payload:
          payload as unknown as Database['public']['Functions']['night_ingest']['Args']['payload'],
      });
      checkOk(res, 'ingest nights');
      return Number(res.data ?? 0);
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
              // Days with offers from unreviewed providers only have no public best price.
              .not('best_provider_id', 'is', null)
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

    async dayReport(today) {
      const runs = check(
        await db
          .from('collector_runs')
          .select('kind, env, started_at, finished_at, errors')
          .gte('started_at', `${today}T00:00:00Z`)
          .order('started_at'),
        'load runs',
      );
      const count = async (status: string) => {
        const res = await db
          .from('collector_tasks')
          .select('id', { count: 'exact', head: true })
          .eq('status', status)
          .gte('posted_at', `${today}T00:00:00Z`);
        checkOk(res, `count ${status} tasks`);
        return res.count ?? 0;
      };
      const [posted, done, noResults, failed] = await Promise.all(
        ['posted', 'done', 'no_results', 'failed'].map(count),
      );
      return {
        runs: runs.map((r): DayReport['runs'][number] => ({
          kind: r.kind as RunKind,
          env: r.env,
          startedAt: r.started_at,
          finishedAt: r.finished_at,
          errors: Array.isArray(r.errors) ? r.errors.map(String) : [],
        })),
        tasks: {
          posted: posted ?? 0,
          done: done ?? 0,
          noResults: noResults ?? 0,
          failed: failed ?? 0,
        },
      };
    },

    async recordNightAccuracy(day) {
      const row = check(
        await db.rpc('night_accuracy_record', { p_day: day }),
        'record night accuracy',
      );
      return toAccuracy(row);
    },

    async nightAccuracy(fromDay) {
      const rows = check(
        await db
          .from('night_accuracy')
          .select('day, pairs, within_3, pairs_shown, within_3_shown, median_gap_pct, worst')
          .gte('day', fromDay)
          .order('day', { ascending: false }),
        'load night accuracy',
      );
      return rows.map(toAccuracy);
    },

    async alertInputs(today) {
      const rows = check(await db.rpc('alert_inputs', { p_today: today }), 'load alert inputs');
      return alertRows.parse(rows).map((r) => ({
        watchId: r.watch_id,
        email: r.email,
        locale: r.locale,
        manageToken: r.manage_token,
        hotelSlug: r.hotel_slug,
        hotelName: r.hotel_name,
        checkIn: r.check_in,
        checkOut: r.check_out,
        adults: r.adults,
        targetCents: r.target_cents,
        lastAlertCents: r.last_alert_cents,
        lastAlertAt: r.last_alert_at,
        series: r.series.map((p) => ({ day: p.day, bestCents: p.cents })),
      }));
    },

    async alertOffers(watchId, today) {
      const rows = check(
        await db.rpc('alert_offers', { p_watch_id: watchId, p_today: today }),
        'load alert offers',
      );
      return alertOfferRows.parse(rows).map((r) => ({
        providerId: r.id,
        slug: r.slug,
        name: r.name,
        isDirect: r.is_direct,
        partner: r.partner,
        totalCents: r.cents,
        trust:
          r.score === null
            ? null
            : {
                score: r.score,
                tests: r.tests,
                matches: r.matches,
                avgMarkupPct: r.avg_markup_pct,
              },
      }));
    },

    async recordAlert(watchId, kind, priceCents, resendId) {
      checkOk(
        await db.rpc('alert_record', {
          p_watch_id: watchId,
          p_kind: kind,
          p_price_cents: priceCents,
          p_resend_id: resendId,
        }),
        'record alert',
      );
    },

    async newsletterRecipients() {
      const rows = check(
        await db
          .from('watchers')
          .select('email, locale, manage_token')
          .eq('newsletter', true)
          .not('confirmed_at', 'is', null)
          .is('unsubscribed_at', null)
          .limit(5000),
        'load newsletter recipients',
      );
      return recipientRows
        .parse(rows)
        .map((r) => ({ email: r.email, locale: r.locale, manageToken: r.manage_token }));
    },

    async dropAlertRecipients(today) {
      // City alarms and followed hotels (C-080k), not mailed yet today (SQL `drop_alert_recipients`).
      const rows = check(
        await db.rpc('drop_alert_recipients', { p_today: today }),
        'load drop alert recipients',
      );
      return dropRecipientRows.parse(rows).map((r) => ({
        id: r.id,
        email: r.email,
        locale: r.locale,
        manageToken: r.manage_token,
        cityAlarm: r.drop_alerts,
        city: r.drop_city,
        hotels: r.hotel_ids,
      }));
    },

    async todayDrops(today) {
      // Single nights and weekends (C-080f).
      const [nights, weekends] = await Promise.all([
        db.rpc('radar_drops', { p_today: today }),
        db.rpc('radar_weekend_drops', { p_today: today }),
      ]);
      const rows = z.array(priceDropRowSchema);
      return [
        ...rows.parse(check(nights, 'load drops')),
        ...rows.parse(check(weekends, 'load weekend drops')),
      ];
    },

    async markDropAlertsSent(ids, today) {
      if (ids.length === 0) return;
      checkOk(
        await db.from('watchers').update({ drop_sent_on: today }).in('id', ids),
        'mark drop alerts sent',
      );
    },

    async dealCandidates(today) {
      const rows = check(
        await db
          .from('v_stay_public')
          .select(
            'stay_id, hotel_slug, hotel_name, city_name_de, city_name_en, check_in, check_out, adults, now_cents, avg30_cents, days_tracked',
          )
          .eq('active', true)
          .gt('check_in', today)
          .gte('days_tracked', DEALS.minDays)
          .not('now_cents', 'is', null)
          .not('avg30_cents', 'is', null)
          .limit(1000),
        'load deal candidates',
      );
      return dealRows.parse(rows).map((r) => ({
        stayId: r.stay_id,
        hotelSlug: r.hotel_slug,
        hotelName: r.hotel_name,
        cityName: { de: r.city_name_de, en: r.city_name_en },
        checkIn: r.check_in,
        checkOut: r.check_out,
        adults: r.adults,
        nowCents: r.now_cents,
        avg30Cents: r.avg30_cents,
        daysTracked: r.days_tracked,
      }));
    },

    async webErrors(env, since) {
      const rows = check(
        await db.rpc('web_error_digest', { p_env: env, p_since: since }),
        'load web errors',
      );
      return webErrorRows
        .parse(rows)
        .map((r) => ({ source: r.source, message: r.message, n: r.n, lastAt: r.last_at }));
    },

    async pruneRaw() {
      const res = await db.rpc('prune_raw_snapshots', {});
      checkOk(res, 'prune raw snapshots');
      return Number(res.data ?? 0);
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
