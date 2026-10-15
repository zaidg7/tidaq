-- C-144: only verified Price Drops (Zaid, 15 Oct night: a Mandarin Oriental Amsterdam drop showed
-- 3.450 € from the morning grid while Trip.com asked 5.040 € that night; "the price drops need to
-- actually be real"). Two fixes:
-- 1. The radar shows a drop only when its live check (C-139) found it on its site within the last
--    hour. Unchecked drops are no longer shown with the grid price; the check queue asks new ones
--    first, so they appear within minutes.
-- 2. drop_check_jobs also accepts the drop set dated tomorrow in UTC: trip_drops is dated in German
--    time, the collector passes the UTC date, so between 00:00 and 02:00 German time the newest
--    set was skipped and its new drops went unchecked.
create or replace function public.drop_check_jobs(p_today date, p_stale_minutes integer, p_limit integer)
returns table (hotel_id integer, xotelo_key text, night date, check_out date, provider_slug text, now_cents integer)
language sql
stable
security definer
set search_path = ''
as $$
  with latest as (
    select max(x.today) as today from public.trip_drops x
     where x.today <= p_today + 1 and x.today >= p_today - 1
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
           (c.checked_at at time zone 'Europe/Berlin')::date as seen_day,
           c.checked_at as seen_at,
           c.cents as now_cents,
           t.prev_cents,
           round(1 - c.cents::numeric / t.prev_cents, 4) as drop_pct,
           t.prior_low_cents, t.prior_days, t.prior_avg_cents, t.provider_slug, t.provider_name,
           t.provider_direct, t.offers, t.confirmed
      from public.trip_drops t
      join public.drop_checks c
        on c.hotel_id = t.hotel_id and c.night = t.night and c.check_out = t.check_out
       and c.provider_slug = t.provider_slug
     where t.nights = p_nights
       and t.night > p_today
       and t.today = (
         select max(x.today) from public.trip_drops x
          where x.nights = p_nights and x.today <= p_today and x.today >= p_today - 1
       )
       and c.live
       and c.cents is not null
       and c.checked_at > now() - interval '60 minutes'
  ) d
   where d.drop_pct >= 0.15
   order by d.drop_pct desc, d.night;
$$;
