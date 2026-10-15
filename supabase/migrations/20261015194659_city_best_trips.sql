-- C-126: the cheapest upcoming stay of p_nights nights (any check-in day) of every active hotel in
-- a city, from the night grid, for the city pages ("Günstigste Woche", like the hotel page since
-- C-125). Same rules as city_best_weekends: each night's newest price from the hotel's latest two
-- collection days, every night on the same reviewed platform (RLS on providers hides pending ones
-- from anon), check-in after p_today, ties to the earlier date, then the lower provider id.
-- Hotels without such a stay still come back, with nulls.
create or replace function public.city_best_trips(p_city text, p_today date, p_nights integer)
returns table (hotel_id integer, check_in date, total_cents integer, provider_id integer)
language sql
stable
set search_path = ''
as $$
  with h as (
    select h.id
      from public.hotels h
      join public.cities c on c.id = h.city_id
     where c.slug = p_city and h.active
  ),
  latest as (
    select nd.hotel_id, max(nd.day) as day
      from public.night_daily nd
     where nd.hotel_id in (select id from h) and nd.adults = 2
     group by nd.hotel_id
  ),
  n as (
    select distinct on (nd.hotel_id, nd.night) nd.hotel_id, nd.night, nd.per_provider
      from public.night_daily nd
      join latest l on l.hotel_id = nd.hotel_id and nd.day >= l.day - 1
     where nd.adults = 2 and nd.night > p_today
     order by nd.hotel_id, nd.night, nd.day desc
  ),
  p as (
    select n.hotel_id, n.night, e.key::integer as provider_id, e.value::integer as cents
      from n
     cross join lateral jsonb_each_text(n.per_provider) e
     where e.key ~ '^\d+$' and e.value ~ '^\d+$' and e.value::bigint > 0
       and exists (select 1 from public.providers pr where pr.id = e.key::integer)
  ),
  t as (
    select p.hotel_id, p.night as check_in, p.provider_id,
           sum(p.cents) over w as total, count(*) over w as cnt, max(p.night) over w as last_night
      from p
    window w as (partition by p.hotel_id, p.provider_id order by p.night
                 rows between current row and p_nights - 1 following)
  ),
  best as (
    select distinct on (t.hotel_id) t.hotel_id, t.check_in, t.total::integer as total_cents,
           t.provider_id
      from t
     where t.cnt = p_nights and t.last_night = t.check_in + (p_nights - 1)
     order by t.hotel_id, t.total, t.check_in, t.provider_id
  )
  select h.id, best.check_in, best.total_cents, best.provider_id
    from h
    left join best on best.hotel_id = h.id;
$$;

revoke all on function public.city_best_trips(text, date, integer) from public;
grant execute on function public.city_best_trips(text, date, integer) to anon, authenticated, service_role;
