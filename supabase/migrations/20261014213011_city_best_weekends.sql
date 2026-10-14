-- C-024: the cheapest upcoming weekend (Fri → Sun) of every active hotel in a city, from the
-- night grid, for the city pages. Same rules as the hotel page (core `cheapestStays`): each
-- night's newest price from the hotel's latest two collection days, both nights on the same
-- reviewed platform (RLS on providers hides pending ones from anon), check-in after p_today,
-- ties to the earlier date, then the lower provider id. Hotels without such a weekend still
-- come back, with nulls.
create or replace function public.city_best_weekends(p_city text, p_today date)
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
     where nd.adults = 2 and nd.night > p_today and nd.night < p_today + 120
     order by nd.hotel_id, nd.night, nd.day desc
  ),
  p as (
    select n.hotel_id, n.night, e.key::integer as provider_id, e.value::integer as cents
      from n
     cross join lateral jsonb_each_text(n.per_provider) e
     where e.key ~ '^\d+$' and e.value ~ '^\d+$' and e.value::bigint > 0
       and exists (select 1 from public.providers pr where pr.id = e.key::integer)
  ),
  w as (
    select fri.hotel_id, fri.night as check_in, fri.provider_id,
           (fri.cents + sat.cents)::integer as total_cents
      from p fri
      join p sat on sat.hotel_id = fri.hotel_id and sat.provider_id = fri.provider_id
                and sat.night = fri.night + 1
     where extract(isodow from fri.night) = 5
  ),
  best as (
    select distinct on (w.hotel_id) w.hotel_id, w.check_in, w.total_cents, w.provider_id
      from w
     order by w.hotel_id, w.total_cents, w.check_in, w.provider_id
  )
  select h.id, best.check_in, best.total_cents, best.provider_id
    from h
    left join best on best.hotel_id = h.id;
$$;

grant execute on function public.city_best_weekends(text, date) to anon, authenticated, service_role;
