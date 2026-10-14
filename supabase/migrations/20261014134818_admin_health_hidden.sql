-- Admin dashboard (C-016): everything /admin shows in one call. Production runs only; days are
-- German calendar days. Service role only: the web server calls it after requireAdmin().
-- C-070c: night-grid runs leave the daily run table (their thousands of nights drowned the stay
-- checks in "collected") and get their own block, plus the last 7 days of night-sum accuracy.
-- C-070d: hotels whose night history is hidden (single nights mislead there).
create or replace function public.admin_health(p_days integer default 14)
returns jsonb
language sql
stable
set search_path = public
as $$
  with
  t as (select (now() at time zone 'Europe/Berlin')::date as today),
  r as (
    select
      (cr.started_at at time zone 'Europe/Berlin')::date as day,
      cr.started_at,
      cr.kind,
      coalesce(cr.tasks_posted, 0) as posted,
      coalesce(cr.tasks_done, 0) as done,
      coalesce(cr.tasks_skipped, 0) as skipped,
      coalesce(cr.est_cost_usd, 0) as cost,
      cr.budget_reason,
      case when jsonb_typeof(cr.errors) = 'array' then cr.errors else '[]'::jsonb end as errors,
      cr.finished_at
    from collector_runs cr
    where cr.env = 'production'
      and cr.kind <> 'nights'
  ),
  -- Night grid (C-070a): days are UTC collection days, like night_daily.day.
  nt as (select (now() at time zone 'UTC')::date as day),
  night_runs as (
    select count(*)::int as runs,
           coalesce(sum(jsonb_array_length(
             case when jsonb_typeof(cr.errors) = 'array' then cr.errors else '[]'::jsonb end
           )), 0)::int as errors
    from collector_runs cr, nt
    where cr.env = 'production'
      and cr.kind = 'nights'
      and cr.started_at >= nt.day::timestamp at time zone 'UTC'
  ),
  days as (
    select
      r.day,
      count(*)::int as runs,
      sum(r.posted)::int as posted,
      sum(r.done)::int as collected,
      sum(r.skipped)::int as skipped,
      round(sum(r.cost), 4) as cost_usd,
      sum(jsonb_array_length(r.errors))::int as errors,
      count(*) filter (where r.finished_at is null)::int as unfinished,
      (array_agg(left(r.errors ->> 0, 300) order by r.started_at desc)
        filter (where jsonb_array_length(r.errors) > 0))[1] as first_error,
      (array_agg(r.budget_reason order by r.started_at desc)
        filter (where r.budget_reason is not null))[1] as budget_reason
    from r, t
    where r.day > t.today - p_days
    group by r.day
  ),
  stays as (
    select ts.id
    from tracked_stays ts
    join hotels h on h.id = ts.hotel_id
    where ts.active and h.active
  ),
  hotel_last as (
    select h.id, h.slug, h.name, max(sd.day) as last_day
    from hotels h
    left join tracked_stays ts on ts.hotel_id = h.id and ts.active
    left join stay_daily sd on sd.stay_id = ts.id
    where h.active
    group by h.id
  ),
  pending as (
    select
      p.id,
      p.slug,
      p.name,
      p.domain,
      count(ps.id)::int as offers,
      max(ps.captured_at) as last_seen
    from providers p
    left join price_snapshots ps
      on ps.provider_id = p.id and ps.captured_at > now() - interval '14 days'
    where p.pending
    group by p.id
  )
  select jsonb_build_object(
    'today', t.today,
    'generated_at', now(),
    'days', coalesce((select jsonb_agg(to_jsonb(d) order by d.day desc) from days d), '[]'::jsonb),
    'month_cost_usd', (
      select round(coalesce(sum(r.cost), 0), 4)
      from r
      where r.day >= date_trunc('month', t.today)::date
    ),
    'last_run_at', (select max(r.started_at) from r),
    'coverage', jsonb_build_object(
      'hotels', (select count(*) from hotels where active),
      'stays', (select count(*) from stays),
      'with_today', (
        select count(distinct sd.stay_id) from stay_daily sd
        where sd.day = t.today and sd.stay_id in (select id from stays)
      ),
      'with_yesterday', (
        select count(distinct sd.stay_id) from stay_daily sd
        where sd.day = t.today - 1 and sd.stay_id in (select id from stays)
      )
    ),
    'stale_hotels', coalesce((
      select jsonb_agg(jsonb_build_object('id', id, 'slug', slug, 'name', name, 'last_day', last_day)
        order by last_day nulls first, name)
      from hotel_last
      where last_day is null or last_day < t.today - 2
    ), '[]'::jsonb),
    'inactive_hotels', coalesce((
      select jsonb_agg(jsonb_build_object('id', id, 'slug', slug, 'name', name) order by name)
      from hotels where not active
    ), '[]'::jsonb),
    'nights', (
      select jsonb_build_object(
        'day', nt.day,
        'hotels', (select count(*) from hotels where active and xotelo_key is not null),
        'rows', (select count(*) from night_daily nd where nd.day = nt.day),
        'priced', (
          select count(*) from night_daily nd where nd.day = nt.day and nd.best_cents is not null
        ),
        'last_collected_at', (select max(nd.collected_at) from night_daily nd where nd.day = nt.day),
        'runs', nr.runs,
        'errors', nr.errors
      )
      from nt, night_runs nr
    ),
    'accuracy', coalesce((
      select jsonb_agg(to_jsonb(a) - 'computed_at' order by a.day desc)
      from (select * from night_accuracy order by day desc limit 7) a
    ), '[]'::jsonb),
    'night_hidden', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', h.id, 'name', h.name, 'pairs', r.pairs, 'within_3', r.within_3,
               'gap_pct', r.gap_pct)
             order by abs(r.gap_pct) desc, h.name)
      from night_reliability((now() at time zone 'UTC')::date) r
      join hotels h on h.id = r.hotel_id
      where not r.reliable
    ), '[]'::jsonb),
    'pending_total', (select count(*) from pending),
    'pending_providers', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.offers desc, x.name)
      from (select * from pending order by offers desc, name limit 25) x
    ), '[]'::jsonb)
  )
  from t;
$$;

revoke all on function public.admin_health(integer) from public, anon, authenticated;
grant execute on function public.admin_health(integer) to service_role;
