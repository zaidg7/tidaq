-- C-139: live check of Price Drops. Drops come from the night grid (priced once a day), so many
-- were gone on the booking site hours later (Zaid, 15 Oct). The collector re-asks the price source
-- for each drop's exact trip and site every 30 minutes (core DROP_CHECK) and stores the answer
-- here; radar_trip_drops hides drops that no longer hold and shows the checked price and time.
create table public.drop_checks (
  hotel_id integer not null references public.hotels (id) on delete cascade,
  night date not null,
  check_out date not null,
  provider_slug text not null,
  checked_at timestamptz not null default now(),
  -- The drop's site still offers the trip at about the drop price (core judgeDropCheck).
  live boolean not null,
  -- That site's total now (null: no longer offered), and the cheapest site's total now.
  cents integer check (cents is null or cents > 0),
  best_cents integer check (best_cents is null or best_cents > 0),
  primary key (hotel_id, night, check_out)
);
alter table public.drop_checks enable row level security;
revoke all on public.drop_checks from anon, authenticated;

-- Drops due for a check: never checked or checked more than p_stale_minutes ago, never-checked
-- first, then the oldest check, then the biggest drop. One row per trip (5 and 7 nights both).
create or replace function public.drop_check_jobs(p_today date, p_stale_minutes integer, p_limit integer)
returns table (
  hotel_id integer,
  xotelo_key text,
  night date,
  check_out date,
  provider_slug text,
  now_cents integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with latest as (
    select max(x.today) as today from public.trip_drops x
     where x.today <= p_today and x.today >= p_today - 1
  ),
  trips as (
    select distinct on (t.hotel_id, t.night, t.check_out)
           t.hotel_id, h.xotelo_key, t.night, t.check_out, t.provider_slug, t.now_cents, t.drop_pct
      from public.trip_drops t
      join latest l on t.today = l.today
      join public.hotels h on h.id = t.hotel_id
     where t.night > p_today and h.xotelo_key is not null
     order by t.hotel_id, t.night, t.check_out, t.drop_pct desc
  )
  select tr.hotel_id, tr.xotelo_key, tr.night, tr.check_out, tr.provider_slug, tr.now_cents
    from trips tr
    left join public.drop_checks c
      on c.hotel_id = tr.hotel_id and c.night = tr.night and c.check_out = tr.check_out
   where c.checked_at is null
      or c.checked_at < now() - make_interval(mins => p_stale_minutes)
   order by c.checked_at nulls first, tr.drop_pct desc
   limit p_limit;
$$;
revoke all on function public.drop_check_jobs(date, integer, integer) from public, anon, authenticated;
grant execute on function public.drop_check_jobs(date, integer, integer) to service_role;

-- The radar with the live check: a drop whose last check says gone is hidden; a live one shows the
-- checked price, the drop recomputed from it (still at least DROPS.minDrop = 15 %) and the check
-- time as "seen". Drops not checked yet (the first minutes after a refresh) show as computed.
create or replace function public.radar_trip_drops(p_today date, p_nights integer)
returns table (
  hotel_id integer, hotel_slug text, hotel_name text, city_slug text, city_name_de text,
  city_name_en text, night date, check_out date, seen_day date, seen_at timestamptz,
  now_cents integer, prev_cents integer, drop_pct numeric, prior_low_cents integer,
  prior_days integer, prior_avg_cents integer, provider_slug text, provider_name text,
  provider_direct boolean, offers integer, confirmed boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select * from (
    select t.hotel_id, t.hotel_slug, t.hotel_name, t.city_slug, t.city_name_de, t.city_name_en,
           t.night, t.check_out,
           coalesce((c.checked_at at time zone 'Europe/Berlin')::date, t.seen_day) as seen_day,
           coalesce(c.checked_at, t.seen_at) as seen_at,
           coalesce(c.cents, t.now_cents) as now_cents,
           t.prev_cents,
           case when c.cents is null then t.drop_pct
                else round(1 - c.cents::numeric / t.prev_cents, 4) end as drop_pct,
           t.prior_low_cents, t.prior_days, t.prior_avg_cents, t.provider_slug, t.provider_name,
           t.provider_direct, t.offers, t.confirmed
      from public.trip_drops t
      left join public.drop_checks c
        on c.hotel_id = t.hotel_id and c.night = t.night and c.check_out = t.check_out
       and c.provider_slug = t.provider_slug
     where t.nights = p_nights
       and t.night > p_today
       and t.today = (
         select max(x.today) from public.trip_drops x
          where x.nights = p_nights and x.today <= p_today and x.today >= p_today - 1
       )
       and (c.live is null or c.live)
  ) d
   where d.drop_pct >= 0.15
   order by d.drop_pct desc, d.night;
$$;
