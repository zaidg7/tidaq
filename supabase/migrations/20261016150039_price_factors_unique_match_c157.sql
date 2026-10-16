-- C-157: one Google result paired with several of our hotels (a shared word like the city's
-- name) is ambiguous: such points don't count. The collector no longer stores them (C-157f).
create or replace function public.hotel_price_factors()
returns table (hotel_id integer, factor numeric, source text)
language sql stable security definer set search_path = '' as $$
  with pts as (
    select p.hotel_id, h.city_id, ci.country_code, p.ratio
      from public.price_calibration_points p
      join public.hotels h on h.id = p.hotel_id
      join public.cities ci on ci.id = h.city_id
     where p.measured_at > now() - interval '60 days'
       and not exists (
         select 1 from public.price_calibration_points q
          where q.calibration_id = p.calibration_id and q.hotel_id <> p.hotel_id
            and q.google_night_cents = p.google_night_cents)
  ),
  by_hotel as (
    select pts.hotel_id, count(*) as n, percentile_cont(0.5) within group (order by pts.ratio) as r
      from pts group by pts.hotel_id
  ),
  by_city as (
    select pts.city_id, percentile_cont(0.5) within group (order by pts.ratio) as r
      from pts group by pts.city_id having count(*) >= 3
  ),
  by_country as (
    select pts.country_code, percentile_cont(0.5) within group (order by pts.ratio) as r
      from pts group by pts.country_code having count(*) >= 3
  ),
  pick as (
    select h.id,
           case when bh.n >= 2 or (bh.n = 1 and (bc.r is null or abs(bh.r - bc.r) <= 0.15))
                then bh.r end as own,
           bc.r as city, bk.r as country
      from public.hotels h
      join public.cities ci on ci.id = h.city_id
      left join by_hotel bh on bh.hotel_id = h.id
      left join by_city bc on bc.city_id = h.city_id
      left join by_country bk on bk.country_code = ci.country_code
     where h.active
  )
  select pick.id,
         round(greatest(1, least(1.5, coalesce(own, city, country)))::numeric, 3),
         case when own is not null then 'hotel' when city is not null then 'city' else 'country' end
    from pick
   where coalesce(own, city, country) is not null;
$$;
