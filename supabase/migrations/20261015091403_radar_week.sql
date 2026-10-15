-- C-080h: the week's sudden drops for the weekly recap (/preissturz/woche): every drop the radar
-- showed in the last p_days days (nights from radar_drops, weekends from radar_weekend_drops),
-- once per drop event (a drop seen on one day is also on the next day's radar). Same columns as
-- radar_weekend_drops; single nights get check_out = night + 1. Recomputed from night_daily, so
-- nothing new is stored. Public data, anon may call it. About 20 ms per day.
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
  with d as (
    select g::date as day
      from generate_series(p_today - (least(greatest(p_days, 1), 14) - 1), p_today, interval '1 day') g
  ),
  all_rows as (
    select r.hotel_id, r.hotel_slug, r.hotel_name, r.city_slug, r.city_name_de, r.city_name_en,
           r.night, r.night + 1 as check_out, r.seen_day, r.seen_at, r.now_cents, r.prev_cents,
           r.drop_pct, r.prior_low_cents, r.prior_days, r.prior_avg_cents, r.provider_slug,
           r.provider_name, r.provider_direct, r.offers, r.confirmed
      from d cross join lateral public.radar_drops(d.day) r
    union all
    select w.hotel_id, w.hotel_slug, w.hotel_name, w.city_slug, w.city_name_de, w.city_name_en,
           w.night, w.check_out, w.seen_day, w.seen_at, w.now_cents, w.prev_cents,
           w.drop_pct, w.prior_low_cents, w.prior_days, w.prior_avg_cents, w.provider_slug,
           w.provider_name, w.provider_direct, w.offers, w.confirmed
      from d cross join lateral public.radar_weekend_drops(d.day) w
  )
  select distinct on (a.hotel_id, a.night, a.check_out, a.seen_day) a.*
    from all_rows a
   order by a.hotel_id, a.night, a.check_out, a.seen_day, a.seen_at desc;
$$;

revoke all on function public.radar_week(date, integer) from public;
grant execute on function public.radar_week(date, integer) to anon, authenticated, service_role;
