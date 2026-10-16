-- C-157: taxes on every shown price. Xotelo's rates are base rates; Google Hotels searched from
-- Germany shows final prices (taxes and fees included, docs/research/exact-prices.md). Once a week
-- per city the collector runs one Hotel Searches task (location Germany, ~18 hotels with their
-- nightly price) and stores, per matched hotel, Google's price against our base rate for the same
-- nights. Pages multiply base rates by the hotel's factor (`hotel_price_factors`).
create table public.price_calibrations (
  id bigserial primary key,
  city_id integer not null references public.cities (id) on delete cascade,
  task_id text not null unique,
  check_in date not null,
  check_out date not null,
  posted_at timestamptz not null default now(),
  status text not null default 'posted' check (status in ('posted', 'done', 'failed')),
  finished_at timestamptz
);
create index price_calibrations_city_idx on public.price_calibrations (city_id, posted_at desc);

create table public.price_calibration_points (
  calibration_id bigint not null references public.price_calibrations (id) on delete cascade,
  hotel_id integer not null references public.hotels (id) on delete cascade,
  google_night_cents integer not null check (google_night_cents > 0),
  base_night_cents integer not null check (base_night_cents > 0),
  ratio numeric(6, 4) not null,
  measured_at timestamptz not null default now(),
  primary key (calibration_id, hotel_id)
);
create index price_calibration_points_hotel_idx
  on public.price_calibration_points (hotel_id, measured_at desc);

alter table public.price_calibrations enable row level security;
alter table public.price_calibration_points enable row level security;
revoke all on public.price_calibrations from anon, authenticated;
revoke all on public.price_calibration_points from anon, authenticated;

-- Cities due for a calibration: none in the last 7 days (a stuck one after an hour, a failed one
-- after a day), least recently calibrated first. The stay: 3 weeks ahead, 2 nights.
create or replace function public.calibration_jobs(p_today date, p_limit integer)
returns table (city_id integer, city_en text, check_in date, check_out date)
language sql stable security definer set search_path = '' as $$
  select ci.id, ci.name_en, p_today + 21, p_today + 23
    from public.cities ci
    left join lateral (
      select c.status, c.posted_at, c.finished_at from public.price_calibrations c
       where c.city_id = ci.id order by c.posted_at desc limit 1
    ) last on true
   where exists (select 1 from public.hotels h where h.city_id = ci.id and h.active)
     and (last.status is null
          or (last.status = 'done' and last.posted_at < now() - interval '7 days')
          or (last.status = 'posted' and last.posted_at < now() - interval '60 minutes')
          or (last.status = 'failed' and coalesce(last.finished_at, last.posted_at) < now() - interval '1 day'))
   order by last.posted_at nulls first, ci.id
   limit p_limit;
$$;

create or replace function public.calibration_pending(p_limit integer)
returns table (id bigint, task_id text, city_id integer, check_in date, check_out date, posted_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select c.id, c.task_id, c.city_id, c.check_in, c.check_out, c.posted_at
    from public.price_calibrations c
   where c.status = 'posted'
   order by c.posted_at
   limit p_limit;
$$;

-- A city's active hotels with our base rate for the stay: the mean nightly cheapest price from
-- the latest collected day, only when every night is priced.
create or replace function public.calibration_hotels(p_city integer, p_check_in date, p_check_out date)
returns table (hotel_id integer, name text, lat double precision, lng double precision,
               dfs_hotel_identifier text, base_night_cents integer)
language sql stable security definer set search_path = '' as $$
  with latest as (
    select max(d.day) as day from public.night_daily d
      join public.hotels h on h.id = d.hotel_id
     where h.city_id = p_city and d.adults = 2 and d.night = p_check_in
  )
  select h.id, h.name, h.lat, h.lng, h.dfs_hotel_identifier,
         round(avg(d.best_cents))::integer
    from public.hotels h
    join public.night_daily d on d.hotel_id = h.id and d.adults = 2
    join latest l on d.day = l.day
   where h.city_id = p_city and h.active and h.lat is not null and h.lng is not null
     and d.night >= p_check_in and d.night < p_check_out and d.best_cents is not null
   group by h.id
  having count(*) = (p_check_out - p_check_in);
$$;

-- What to multiply a hotel's base rate by to get the final price (taxes and fees): the median of
-- its own measurements in the last 60 days, else its city's (3+ points), else its country's (3+).
-- Never below 1 (Google found a site cheaper than ours: no taxes to add) or above 1.5.
create or replace function public.hotel_price_factors()
returns table (hotel_id integer, factor numeric, source text)
language sql stable security definer set search_path = '' as $$
  with pts as (
    select p.hotel_id, h.city_id, ci.country_code, p.ratio
      from public.price_calibration_points p
      join public.hotels h on h.id = p.hotel_id
      join public.cities ci on ci.id = h.city_id
     where p.measured_at > now() - interval '60 days'
  ),
  by_hotel as (
    select pts.hotel_id, percentile_cont(0.5) within group (order by pts.ratio) as r
      from pts group by pts.hotel_id
  ),
  by_city as (
    select pts.city_id, percentile_cont(0.5) within group (order by pts.ratio) as r
      from pts group by pts.city_id having count(*) >= 3
  ),
  by_country as (
    select pts.country_code, percentile_cont(0.5) within group (order by pts.ratio) as r
      from pts group by pts.country_code having count(*) >= 3
  )
  select h.id,
         round(greatest(1, least(1.5, coalesce(bh.r, bc.r, bk.r)))::numeric, 3),
         case when bh.r is not null then 'hotel' when bc.r is not null then 'city' else 'country' end
    from public.hotels h
    join public.cities ci on ci.id = h.city_id
    left join by_hotel bh on bh.hotel_id = h.id
    left join by_city bc on bc.city_id = h.city_id
    left join by_country bk on bk.country_code = ci.country_code
   where h.active and coalesce(bh.r, bc.r, bk.r) is not null;
$$;

revoke all on function public.calibration_jobs(date, integer) from public, anon, authenticated;
grant execute on function public.calibration_jobs(date, integer) to service_role;
revoke all on function public.calibration_pending(integer) from public, anon, authenticated;
grant execute on function public.calibration_pending(integer) to service_role;
revoke all on function public.calibration_hotels(integer, date, date) from public, anon, authenticated;
grant execute on function public.calibration_hotels(integer, date, date) to service_role;
revoke all on function public.hotel_price_factors() from public;
grant execute on function public.hotel_price_factors() to anon, authenticated, service_role;
