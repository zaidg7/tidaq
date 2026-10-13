-- C-013g (D-41): Xotelo as the free price source, DataForSEO as fallback.
-- 1. hotels.xotelo_key: the hotel's TripAdvisor key (g<geo>-d<id>), matched by name in the spike.
-- 2. price_snapshots.source: which API a price came from.
-- 3. A stay's price history follows one source: stay_daily is built from the source of the stay's
--    newest snapshot only, so switching sources never shows a fake jump (Xotelo runs ~6 % below
--    DataForSEO). Older snapshots stay in price_snapshots; only derived stay_daily rows go.
-- 4. Xotelo names the hotels' own websites by brand ("RitzCarlton.com", "IHG", "Official website"):
--    aliases map them to hotel-direct.

alter table public.hotels
  add column xotelo_key text unique check (xotelo_key ~ '^g[0-9]+-d[0-9]+$');

update public.hotels h
   set xotelo_key = v.key
  from (values
  ('baur-au-lac-zuerich', 'g188113-d196060'),
  ('bulgari-hotel-milano', 'g187849-d313196'),
  ('claridges-london', 'g186338-d187685'),
  ('fairmont-hotel-vier-jahreszeiten-hamburg', 'g187331-d194643'),
  ('four-seasons-hotel-george-v-paris', 'g187147-d188975'),
  ('hotel-adlon-kempinski-berlin', 'g187323-d190694'),
  ('hotel-arts-barcelona', 'g187497-d190635'),
  ('hotel-atlantic-hamburg', 'g187331-d199575'),
  ('hotel-bayerischer-hof-muenchen', 'g187309-d190303'),
  ('hotel-de-rome-berlin', 'g187323-d601486'),
  ('hotel-de-russie-rom', 'g187791-d232851'),
  ('hotel-eden-rom', 'g187791-d191331'),
  ('hotel-hassler-roma', 'g187791-d191332'),
  ('hotel-imperial-wien', 'g190454-d195098'),
  ('hotel-sacher-wien', 'g190454-d206598'),
  ('intercontinental-amstel-amsterdam', 'g188590-d190614'),
  ('le-bristol-paris', 'g187147-d188729'),
  ('majestic-hotel-spa-barcelona', 'g187497-d190616'),
  ('mandarin-oriental-barcelona', 'g187497-d1456413'),
  ('mandarin-oriental-conservatorium-amsterdam', 'g188590-d2418096'),
  ('mandarin-oriental-milan', 'g187849-d7737531'),
  ('mandarin-oriental-munich', 'g187309-d233835'),
  ('palais-coburg-wien', 'g190454-d488395'),
  ('park-hyatt-milano', 'g187849-d289987'),
  ('park-hyatt-vienna', 'g190454-d6603500'),
  ('park-hyatt-zurich', 'g188113-d483104'),
  ('rosewood-munich', 'g187309-d26355406'),
  ('shangri-la-paris', 'g187147-d1959562'),
  ('sofitel-frankfurt-opera', 'g187337-d8618706'),
  ('steigenberger-icon-frankfurter-hof-frankfurt', 'g187337-d202275'),
  ('the-charles-hotel-muenchen', 'g187309-d656270'),
  ('the-dolder-grand-zuerich', 'g188113-d196061'),
  ('the-fontenay-hamburg', 'g187331-d11809998'),
  ('the-ritz-carlton-berlin', 'g187323-d289019'),
  ('the-ritz-london', 'g186338-d187591'),
  ('the-savoy-london', 'g186338-d187686'),
  ('the-westin-hamburg', 'g187331-d10600199'),
  ('waldorf-astoria-amsterdam', 'g188590-d5555141'),
  ('waldorf-astoria-berlin', 'g187323-d2481544')
  ) as v (slug, key)
 where h.slug = v.slug;

alter table public.price_snapshots
  add column source text not null default 'dataforseo' check (source in ('dataforseo', 'xotelo'));

insert into public.provider_aliases (alias, provider_id)
select a.alias, p.id
  from (values
    ('official website'),
    ('ritzcarlton.com'),
    ('autograph'),
    ('fairmont'),
    ('fourseasons.com'),
    ('ihg'),
    ('preferred hotels'),
    ('waldorf astoria')
  ) as a (alias)
  cross join public.providers p
 where p.slug = 'hotel-direct'
on conflict (alias) do nothing;

create or replace function public.rebuild_stay_daily(p_stay_ids bigint[] default null)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_rows integer := 0;
begin
  with latest as (
    select distinct on (ps.stay_id) ps.stay_id, ps.source
    from public.price_snapshots ps
    where p_stay_ids is null or ps.stay_id = any (p_stay_ids)
    order by ps.stay_id, ps.captured_at desc, ps.id desc
  ),
  per_provider as (
    select ps.stay_id,
           (ps.captured_at at time zone 'UTC')::date as day,
           ps.provider_id,
           min(ps.total_cents) as cents
    from public.price_snapshots ps
    join latest l on l.stay_id = ps.stay_id and l.source = ps.source
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
  -- Days that only the other source priced (derived rows; the snapshots stay).
  stale as (
    delete from public.stay_daily d
    using latest l
    where d.stay_id = l.stay_id
      and not exists (select 1 from agg a where a.stay_id = d.stay_id and a.day = d.day)
    returning 1
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

-- collector_ingest: snapshots carry their source (payload field `source`, default dataforseo).
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
      (task_id, stay_id, provider_id, captured_at, total_cents, free_cancellation, raw, source)
    select s->>'task_id', (s->>'stay_id')::bigint, pr.id, (s->>'captured_at')::timestamptz,
           (s->>'total_cents')::integer, (s->>'free_cancellation')::boolean, s->'raw',
           coalesce(s->>'source', 'dataforseo')
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

