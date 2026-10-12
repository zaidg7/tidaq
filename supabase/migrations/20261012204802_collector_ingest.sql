-- Collector ingest (C-013b): one transaction per collect run. Called by the collector with the
-- service role only. Payload shape: apps/collector/src/ingest.ts (IngestPayload).

create or replace function public.collector_ingest(payload jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_snapshots integer := 0;
  v_daily integer := 0;
begin
  -- 1. Unknown sources become pending providers (reviewed in /admin, C-016) with one alias.
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

  -- 2. Snapshots: once per task and provider, so re-collecting a task inserts nothing.
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

  -- 3. Rebuild stay_daily for every (stay, UTC day) in the payload, from all snapshots of that day.
  with touched as (
    select distinct (s->>'stay_id')::bigint as stay_id,
           ((s->>'captured_at')::timestamptz at time zone 'UTC')::date as day
    from jsonb_array_elements(coalesce(payload->'snapshots', '[]'::jsonb)) as s
  ),
  per_provider as (
    select t.stay_id, t.day, ps.provider_id, min(ps.total_cents) as cents
    from touched t
    join public.price_snapshots ps
      on ps.stay_id = t.stay_id
     and ps.captured_at >= (t.day::timestamp at time zone 'UTC')
     and ps.captured_at < ((t.day + 1)::timestamp at time zone 'UTC')
    group by t.stay_id, t.day, ps.provider_id
  ),
  agg as (
    select stay_id, day, min(cents) as best_cents,
           (array_agg(provider_id order by cents, provider_id))[1] as best_provider_id,
           jsonb_object_agg(provider_id::text, cents) as per_provider
    from per_provider
    group by stay_id, day
  ),
  up as (
    insert into public.stay_daily (stay_id, day, best_cents, best_provider_id, per_provider)
    select stay_id, day, best_cents, best_provider_id, per_provider from agg
    on conflict (stay_id, day) do update
      set best_cents = excluded.best_cents,
          best_provider_id = excluded.best_provider_id,
          per_provider = excluded.per_provider
    returning 1
  )
  select count(*) into v_daily from up;

  -- 4. Task outcomes. Only open tasks change, so a late duplicate can't undo a result.
  update public.collector_tasks ct
     set status = t->>'status',
         error = t->>'error',
         collected_at = now()
    from jsonb_array_elements(coalesce(payload->'tasks', '[]'::jsonb)) as t
   where ct.id = t->>'id'
     and ct.status = 'posted';

  -- 5. Official websites from Hotel Info, only where none is set (manual values win).
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
