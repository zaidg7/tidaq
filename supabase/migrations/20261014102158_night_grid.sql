-- Night grid (C-070a, D-42): the price of every single night of every active hotel for the next
-- NIGHT_WINDOW_DAYS nights, per platform, collected daily. Any stay's history is built from it
-- (C-070b). Free source only (Xotelo).

create table public.night_daily (
  hotel_id integer not null references public.hotels (id),
  night date not null,
  adults smallint not null default 2 check (adults between 1 and 4),
  -- Collection day (UTC), like stay_daily.day.
  day date not null,
  -- `{ "<provider id>": cents for that night }`, every platform incl. pending ones.
  per_provider jsonb not null default '{}',
  -- Cheapest reviewed platform; null when no reviewed platform priced the night (or none did).
  best_cents integer check (best_cents > 0),
  best_provider_id integer references public.providers (id),
  collected_at timestamptz not null default now(),
  primary key (hotel_id, adults, night, day)
);
create index night_daily_day_idx on public.night_daily (day);
create index night_daily_best_provider_id_idx on public.night_daily (best_provider_id);

alter table public.night_daily enable row level security;
create policy "public read" on public.night_daily for select to anon, authenticated using (true);
grant select on public.night_daily to anon, authenticated;

alter table public.collector_runs drop constraint collector_runs_kind_check;
alter table public.collector_runs
  add constraint collector_runs_kind_check
    check (kind in ('morning', 'evening', 'collect', 'manual', 'request', 'nights'));

-- Nights still to price today: active hotels with a Xotelo key × the next p_window nights,
-- without a row for p_today yet. Nearest night first, so a short day still covers what matters.
create or replace function public.night_jobs(p_today date, p_window integer, p_limit integer)
returns table (hotel_id integer, xotelo_key text, night date)
language sql
stable
set search_path = ''
as $$
  select h.id, h.xotelo_key, n.night
  from public.hotels h
  cross join lateral (
    select (p_today + g)::date as night from generate_series(0, greatest(p_window, 0) - 1) as g
  ) n
  where h.active
    and h.xotelo_key is not null
    and not exists (
      select 1 from public.night_daily nd
      where nd.hotel_id = h.id and nd.adults = 2 and nd.night = n.night and nd.day = p_today
    )
  order by n.night, h.id
  limit greatest(p_limit, 0);
$$;

-- Stores one batch of nights. Payload:
--   { providers: [{ slug, name, domain, alias }],          -- unknown platforms → pending
--     nights: [{ hotel_id, night, day, offers: { "<provider slug>": cents } }] }
-- A night with empty `offers` is stored too (priced, nothing available), so it isn't asked again.
create or replace function public.night_ingest(payload jsonb)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_rows integer := 0;
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

  with r as (
    select (x->>'hotel_id')::integer as hotel_id,
           (x->>'night')::date as night,
           (x->>'day')::date as day,
           coalesce(x->'offers', '{}'::jsonb) as offers
    from jsonb_array_elements(coalesce(payload->'nights', '[]'::jsonb)) as x
  ),
  o as (
    select r.hotel_id, r.night, r.day, pr.id as provider_id, pr.pending,
           min((e.value #>> '{}')::integer) as cents
    from r
    cross join lateral jsonb_each(r.offers) as e
    join public.providers pr on pr.slug = e.key
    where (e.value #>> '{}')::integer > 0
    group by 1, 2, 3, 4, 5
  ),
  agg as (
    select r.hotel_id, r.night, r.day,
           coalesce(jsonb_object_agg(o.provider_id::text, o.cents)
                      filter (where o.provider_id is not null), '{}'::jsonb) as per_provider,
           min(o.cents) filter (where not o.pending) as best_cents,
           (array_agg(o.provider_id order by o.cents, o.provider_id)
              filter (where o.provider_id is not null and not o.pending))[1] as best_provider_id
    from r
    left join o on o.hotel_id = r.hotel_id and o.night = r.night and o.day = r.day
    group by r.hotel_id, r.night, r.day
  ),
  up as (
    insert into public.night_daily (hotel_id, night, day, per_provider, best_cents, best_provider_id)
    select hotel_id, night, day, per_provider, best_cents, best_provider_id from agg
    on conflict (hotel_id, adults, night, day) do update
      set per_provider = excluded.per_provider,
          best_cents = excluded.best_cents,
          best_provider_id = excluded.best_provider_id,
          collected_at = now()
    returning 1
  )
  select count(*) into v_rows from up;
  return v_rows;
end;
$$;

revoke all on function public.night_jobs(date, integer, integer) from public, anon, authenticated;
grant execute on function public.night_jobs(date, integer, integer) to service_role;
revoke all on function public.night_ingest(jsonb) from public, anon, authenticated;
grant execute on function public.night_ingest(jsonb) to service_role;
