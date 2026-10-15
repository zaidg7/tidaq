-- C-125: trip drops. Zaid: a cheaper single night is useless, nobody flies to Shanghai for one
-- night. A trip is 5 or 7 nights in a row (2 adults) booked on one site, so its price on a site
-- exists only when that site priced every night on the same check day (like the weekend drops).
-- Same rules as radar_drops: at least 15 % and 50 € less than the check of the day before, below
-- every check of the 14 days before, and a fall below 40 % needs a second reviewed site within
-- 10 %. Computing one length takes about half a second, too slow for every page view, so pg_cron
-- stores the result every 15 minutes in trip_drops and pages read that table.

-- The computation. Private: only the refresh below calls it.
create or replace function public.compute_trip_drops(p_today date, p_nights integer)
returns table (
  hotel_id integer,
  hotel_slug text,
  hotel_name text,
  city_slug text,
  city_name_de text,
  city_name_en text,
  night date,
  check_out date,
  seen_day date,
  seen_at timestamptz,
  now_cents integer,
  prev_cents integer,
  drop_pct numeric,
  prior_low_cents integer,
  prior_days integer,
  prior_avg_cents integer,
  provider_slug text,
  provider_name text,
  provider_direct boolean,
  offers integer,
  confirmed boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with unreliable as (
    select r.hotel_id from public.night_reliability(p_today) r where not r.reliable
  ),
  -- Only the last two check days decide whether a trip dropped.
  recent as (
    select n.hotel_id, n.night, n.day, n.collected_at,
           e.key::integer as pid, (e.value #>> '{}')::integer as cents
      from public.night_daily n
      join public.hotels h on h.id = n.hotel_id and h.active
      cross join lateral jsonb_each(n.per_provider) as e
      join public.providers pr on pr.id = e.key::integer and not pr.pending
     where n.adults = 2 and n.day >= p_today - 2 and n.day <= p_today
       and n.night > p_today
       and n.hotel_id not in (select u.hotel_id from unreliable u)
  ),
  tot as (
    select w.hotel_id, w.day, w.pid, w.check_in, w.total, w.collected_at
      from (
        select r.hotel_id, r.day, r.pid, r.night as check_in,
               sum(r.cents) over w as total,
               count(*) over w as n,
               max(r.night) over w as last_night,
               max(r.collected_at) over w as collected_at
          from recent r
        window w as (partition by r.hotel_id, r.day, r.pid order by r.night
                     rows between current row and p_nights - 1 following)
      ) w
     where w.n = p_nights and w.last_night = w.check_in + (p_nights - 1)
  ),
  best as (
    select t.hotel_id, t.day, t.check_in,
           min(t.total) as best_cents,
           (array_agg(t.pid order by t.total, t.pid))[1] as best_pid,
           max(t.collected_at) as collected_at
      from tot t
     group by t.hotel_id, t.day, t.check_in
  ),
  latest as (
    select distinct on (b.hotel_id, b.check_in) b.*
      from best b
     where b.day >= p_today - 1
     order by b.hotel_id, b.check_in, b.day desc
  ),
  cand as (
    select l.*, p.best_cents as prev_cents
      from latest l
      join best p on p.hotel_id = l.hotel_id and p.check_in = l.check_in and p.day = l.day - 1
     where l.best_cents <= p.best_cents * 0.85
       and p.best_cents - l.best_cents >= 5000
  ),
  -- The 14 check days before, for the candidates only (primary key: hotel, adults, night, day).
  past as (
    select c.hotel_id, c.check_in, n.day, (e.key)::integer as pid,
           sum((e.value #>> '{}')::integer) as total
      from cand c
      join public.night_daily n
        on n.hotel_id = c.hotel_id and n.adults = 2
       and n.night >= c.check_in and n.night < c.check_in + p_nights
       and n.day < c.day and n.day >= c.day - 14
      cross join lateral jsonb_each(n.per_provider) as e
      join public.providers pr on pr.id = e.key::integer and not pr.pending
     group by c.hotel_id, c.check_in, n.day, e.key
    having count(*) = p_nights
  ),
  hist as (
    select d.hotel_id, d.check_in, min(d.low) as prior_low, count(*)::integer as prior_days,
           round(avg(d.low))::integer as prior_avg
      from (
        select p.hotel_id, p.check_in, p.day, min(p.total) as low
          from past p group by p.hotel_id, p.check_in, p.day
      ) d
     group by d.hotel_id, d.check_in
  ),
  reviewed as (
    select c.hotel_id, c.check_in,
           count(*)::integer as offers,
           count(*) filter (where t.total <= c.best_cents * 1.10)::integer as near
      from cand c
      join tot t on t.hotel_id = c.hotel_id and t.check_in = c.check_in and t.day = c.day
     group by c.hotel_id, c.check_in
  )
  select c.hotel_id, h.slug, h.name, ci.slug, ci.name_de, ci.name_en,
         c.check_in, c.check_in + p_nights, c.day, c.collected_at,
         c.best_cents::integer, c.prev_cents::integer,
         round((c.prev_cents - c.best_cents)::numeric / c.prev_cents, 4),
         hi.prior_low::integer, hi.prior_days, hi.prior_avg,
         pr.slug, pr.name, pr.is_direct, r.offers,
         (r.near >= 2)
    from cand c
    join hist hi on hi.hotel_id = c.hotel_id and hi.check_in = c.check_in
    join reviewed r on r.hotel_id = c.hotel_id and r.check_in = c.check_in
    join public.hotels h on h.id = c.hotel_id
    join public.cities ci on ci.id = h.city_id
    join public.providers pr on pr.id = c.best_pid
   where c.best_cents < hi.prior_low
     and (c.best_cents >= c.prev_cents * 0.4 or r.near >= 2)
   order by (c.prev_cents - c.best_cents)::numeric / c.prev_cents desc, c.check_in;
$$;

revoke all on function public.compute_trip_drops(date, integer) from public, anon, authenticated;
grant execute on function public.compute_trip_drops(date, integer) to service_role;

-- The stored result, one set per Berlin day and trip length. Public facts, but read through
-- radar_trip_drops only: RLS on, no policies.
create table public.trip_drops (
  today date not null,
  nights smallint not null check (nights between 2 and 14),
  computed_at timestamptz not null default now(),
  hotel_id integer not null references public.hotels (id) on delete cascade,
  hotel_slug text not null,
  hotel_name text not null,
  city_slug text not null,
  city_name_de text not null,
  city_name_en text not null,
  night date not null,
  check_out date not null,
  seen_day date not null,
  seen_at timestamptz not null,
  now_cents integer not null,
  prev_cents integer not null,
  drop_pct numeric not null,
  prior_low_cents integer not null,
  prior_days integer not null,
  prior_avg_cents integer not null,
  provider_slug text not null,
  provider_name text not null,
  provider_direct boolean not null,
  offers integer not null,
  confirmed boolean not null,
  primary key (today, nights, hotel_id, night)
);
alter table public.trip_drops enable row level security;
revoke all on table public.trip_drops from anon, authenticated;

-- Recompute today's trips (Berlin day, like the website). Keeps a week of history for debugging.
create or replace function public.refresh_trip_drops(
  p_today date default (now() at time zone 'Europe/Berlin')::date
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  delete from public.trip_drops where today = p_today or today < p_today - 7;
  insert into public.trip_drops (
    today, nights, hotel_id, hotel_slug, hotel_name, city_slug, city_name_de, city_name_en,
    night, check_out, seen_day, seen_at, now_cents, prev_cents, drop_pct, prior_low_cents,
    prior_days, prior_avg_cents, provider_slug, provider_name, provider_direct, offers, confirmed
  )
  select p_today, k.nights, d.*
    from (values (5), (7)) as k (nights)
    cross join lateral public.compute_trip_drops(p_today, k.nights) d;
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.refresh_trip_drops(date) from public, anon, authenticated;
grant execute on function public.refresh_trip_drops(date) to service_role;

-- What the website reads: the newest stored set (today's, or yesterday's in the minutes after
-- midnight), trips that still lie ahead.
create or replace function public.radar_trip_drops(p_today date, p_nights integer)
returns table (
  hotel_id integer,
  hotel_slug text,
  hotel_name text,
  city_slug text,
  city_name_de text,
  city_name_en text,
  night date,
  check_out date,
  seen_day date,
  seen_at timestamptz,
  now_cents integer,
  prev_cents integer,
  drop_pct numeric,
  prior_low_cents integer,
  prior_days integer,
  prior_avg_cents integer,
  provider_slug text,
  provider_name text,
  provider_direct boolean,
  offers integer,
  confirmed boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select t.hotel_id, t.hotel_slug, t.hotel_name, t.city_slug, t.city_name_de, t.city_name_en,
         t.night, t.check_out, t.seen_day, t.seen_at, t.now_cents, t.prev_cents, t.drop_pct,
         t.prior_low_cents, t.prior_days, t.prior_avg_cents, t.provider_slug, t.provider_name,
         t.provider_direct, t.offers, t.confirmed
    from public.trip_drops t
   where t.nights = p_nights
     and t.night > p_today
     and t.today = (
       select max(x.today) from public.trip_drops x
        where x.nights = p_nights and x.today <= p_today and x.today >= p_today - 1
     )
   order by t.drop_pct desc, t.night;
$$;

revoke all on function public.radar_trip_drops(date, integer) from public;
grant execute on function public.radar_trip_drops(date, integer) to anon, authenticated, service_role;

-- Every 15 minutes: the night grid fills through the day.
create extension if not exists pg_cron;
select cron.schedule('refresh-trip-drops', '*/15 * * * *', 'select public.refresh_trip_drops()');

select public.refresh_trip_drops();
