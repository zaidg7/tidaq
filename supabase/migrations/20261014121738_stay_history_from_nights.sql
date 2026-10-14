-- Stay history from the night grid (C-070b, D-42, PLAN §7.0).
--
-- For one hotel and stay (check-in → check-out, 2 adults, the only occupancy the night grid
-- collects), per collection day since p_from_day: the stay total on every platform that priced
-- EVERY night of the stay that day (a stay is booked on one site, so platforms are never mixed
-- across nights), and the cheapest reviewed platform. Days on which no reviewed platform priced
-- every night are left out.
--
-- Security definer so `per_provider` keeps pending platforms' ids (like stay_daily.per_provider;
-- their names stay hidden by the providers RLS), with an empty search_path. Reads only data that
-- is public anyway; anon may execute it.
create or replace function public.stay_history_from_nights(
  p_hotel_id integer,
  p_check_in date,
  p_check_out date,
  p_from_day date
)
returns table (day date, best_cents integer, best_provider_id integer, per_provider jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  with nights as (
    select nd.day, e.key::integer as provider_id, (e.value #>> '{}')::integer as cents
    from public.night_daily nd
    cross join lateral jsonb_each(nd.per_provider) as e
    where nd.hotel_id = p_hotel_id
      and nd.adults = 2
      and nd.night >= p_check_in
      and nd.night < p_check_out
      and nd.day >= p_from_day
      and p_check_out > p_check_in
      and p_check_out - p_check_in <= 30
  ),
  totals as (
    select n.day, n.provider_id, sum(n.cents)::integer as total
    from nights n
    group by n.day, n.provider_id
    having count(*) = (p_check_out - p_check_in)
  )
  select t.day,
         min(t.total) filter (where not pr.pending) as best_cents,
         (array_agg(t.provider_id order by t.total, t.provider_id)
            filter (where not pr.pending))[1] as best_provider_id,
         jsonb_object_agg(t.provider_id::text, t.total) as per_provider
  from totals t
  join public.providers pr on pr.id = t.provider_id
  group by t.day
  having count(*) filter (where not pr.pending) > 0
  order by t.day;
$$;

revoke all on function public.stay_history_from_nights(integer, date, date, date) from public;
grant execute on function public.stay_history_from_nights(integer, date, date, date)
  to anon, authenticated, service_role;
