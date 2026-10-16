-- C-157: a hotel's own factor needs 2+ measurements; one odd reading (another room type, a
-- member price) must not move its prices alone. Below that, its city's median counts.
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
      from pts group by pts.hotel_id having count(*) >= 2
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
