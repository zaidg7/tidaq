-- stay_daily best price from reviewed providers only (C-020b data layer).
-- Pending providers (unreviewed resellers) are hidden from the public by RLS, so a best price
-- from one of them could not be named on the site. per_provider keeps every provider.
-- A day with offers from pending providers only keeps the raw minimum in best_cents but gets
-- best_provider_id = null: the web app and the stats skip such days ("no reviewed price").
-- rebuild_stay_daily(null) rebuilds everything, e.g. after approving providers in /admin (C-016).

create or replace function public.rebuild_stay_daily(p_stay_ids bigint[] default null)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_rows integer := 0;
begin
  with per_provider as (
    select ps.stay_id,
           (ps.captured_at at time zone 'UTC')::date as day,
           ps.provider_id,
           min(ps.total_cents) as cents
    from public.price_snapshots ps
    where p_stay_ids is null or ps.stay_id = any (p_stay_ids)
    group by 1, 2, 3
  ),
  agg as (
    select pp.stay_id, pp.day,
           coalesce(min(pp.cents) filter (where not pr.pending), min(pp.cents)) as best_cents,
           (array_agg(pp.provider_id order by pp.cents, pp.provider_id)
              filter (where not pr.pending))[1] as best_provider_id,
           jsonb_object_agg(pp.provider_id::text, pp.cents) as per_provider
    from per_provider pp
    join public.providers pr on pr.id = pp.provider_id
    group by pp.stay_id, pp.day
  ),
  up as (
    insert into public.stay_daily (stay_id, day, best_cents, best_provider_id, per_provider)
    select stay_id, day, best_cents, best_provider_id, per_provider
    from agg
    on conflict (stay_id, day) do update
      set best_cents = excluded.best_cents,
          best_provider_id = excluded.best_provider_id,
          per_provider = excluded.per_provider
    returning 1
  )
  select count(*) into v_rows from up;
  return v_rows;
end;
$$;

revoke all on function public.rebuild_stay_daily(bigint[]) from public, anon, authenticated;
grant execute on function public.rebuild_stay_daily(bigint[]) to service_role;

-- collector_ingest: step 3 now delegates to rebuild_stay_daily for the touched stays.
create or replace function public.collector_ingest(payload jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_snapshots integer := 0;
  v_daily integer := 0;
begin
  insert into public.providers (slug, name, domain, pending)
  select distinct on (p->>'slug') p->>'slug', coalesce(nullif(btrim(p->>'name'), ''), p->>'slug'),
         nullif(p->>'domain', ''), true
  from jsonb_array_elements(coalesce(payload->'providers', '[]'::jsonb)) as p
  on conflict (slug) do nothing;

  insert into public.provider_aliases (alias, provider_id)
  select distinct on (p->>'alias') p->>'alias', pr.id
  from jsonb_array_elements(coalesce(payload->'providers', '[]'::jsonb)) as p
  join public.providers pr on pr.slug = p->>'slug'
  where coalesce(p->>'alias', '') <> ''
  on conflict (alias) do nothing;

  with ins as (
    insert into public.price_snapshots
      (task_id, stay_id, provider_id, captured_at, total_cents, free_cancellation, raw)
    select s->>'task_id', (s->>'stay_id')::bigint, pr.id, (s->>'captured_at')::timestamptz,
           (s->>'total_cents')::integer, (s->>'free_cancellation')::boolean, s->'raw'
    from jsonb_array_elements(coalesce(payload->'snapshots', '[]'::jsonb)) as s
    join public.providers pr on pr.slug = s->>'provider_slug'
    on conflict (task_id, provider_id) where task_id is not null do nothing
    returning 1
  )
  select count(*) into v_snapshots from ins;

  v_daily := public.rebuild_stay_daily(array(
    select distinct (s->>'stay_id')::bigint
    from jsonb_array_elements(coalesce(payload->'snapshots', '[]'::jsonb)) as s
  ));

  update public.collector_tasks ct
     set status = t->>'status',
         error = t->>'error',
         collected_at = now()
    from jsonb_array_elements(coalesce(payload->'tasks', '[]'::jsonb)) as t
   where ct.id = t->>'id'
     and ct.status = 'posted';

  update public.hotels h
     set official_url = u->>'url'
    from jsonb_array_elements(coalesce(payload->'official_urls', '[]'::jsonb)) as u
   where h.id = (u->>'hotel_id')::integer
     and h.official_url is null;

  return jsonb_build_object('snapshots', v_snapshots, 'daily_rows', v_daily);
end;
$$;

revoke all on function public.collector_ingest(jsonb) from public, anon, authenticated;
grant execute on function public.collector_ingest(jsonb) to service_role;

-- Recompute the days collected so far with the new rule (upsert only; nothing is deleted).
select public.rebuild_stay_daily(null);
