-- C-125: the weekly recap shows trips (5 and 7 nights) like the radar, read from the stored
-- trip_drops instead of recomputing single nights and weekends. A drop seen on one day is stored
-- under that day and the next (the radar keeps it until the next check), so each drop event
-- counts once: per hotel, stay and day seen, the newest row. trip_drops now keeps 15 days, enough
-- for the recap's longest window (14 days).
create or replace function public.radar_week(p_today date, p_days integer default 7)
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
  select distinct on (t.hotel_id, t.night, t.check_out, t.seen_day)
         t.hotel_id, t.hotel_slug, t.hotel_name, t.city_slug, t.city_name_de, t.city_name_en,
         t.night, t.check_out, t.seen_day, t.seen_at, t.now_cents, t.prev_cents, t.drop_pct,
         t.prior_low_cents, t.prior_days, t.prior_avg_cents, t.provider_slug, t.provider_name,
         t.provider_direct, t.offers, t.confirmed
    from public.trip_drops t
   where t.today <= p_today
     and t.seen_day > p_today - least(greatest(p_days, 1), 14)
     and t.seen_day <= p_today
   order by t.hotel_id, t.night, t.check_out, t.seen_day, t.today desc;
$$;

revoke all on function public.radar_week(date, integer) from public;
grant execute on function public.radar_week(date, integer) to anon, authenticated, service_role;

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
  delete from public.trip_drops where today = p_today or today < p_today - 15;
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
