-- C-080d: live proof numbers for the radar and counts of visits from social bio links.
-- radar_stats(p_today): what the latest night-grid day (today or yesterday) checked: nights,
-- hotels, cities and reviewed booking sites with a price. Public numbers, anon may call it.
-- log_event accepts 'drops_view' ({"ref": "tiktok"} and similar). Still no IP, no user agent, no id.
create or replace function public.radar_stats(p_today date)
returns table (day date, nights integer, hotels integer, cities integer, sites integer)
language sql
stable
security definer
set search_path = ''
as $$
  with d as (
    select max(nd.day) as day
      from public.night_daily nd
     where nd.adults = 2 and nd.day <= p_today and nd.day >= p_today - 1
  ),
  n as (
    select nd.hotel_id, nd.per_provider
      from public.night_daily nd, d
     where nd.adults = 2 and nd.day = d.day and nd.best_cents is not null
  )
  select d.day,
         (select count(*) from n)::integer,
         (select count(distinct n.hotel_id) from n)::integer,
         (select count(distinct h.city_id) from n join public.hotels h on h.id = n.hotel_id)::integer,
         (select count(distinct e.key)
            from n
            cross join lateral jsonb_object_keys(n.per_provider) as e(key)
            join public.providers p on p.id = e.key::integer and not p.pending)::integer
    from d
   where d.day is not null;
$$;

revoke all on function public.radar_stats(date) from public;
grant execute on function public.radar_stats(date) to anon, authenticated, service_role;

create or replace function public.log_event(p_name text, p_props jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c_daily_events constant integer := 20000;
  v_today_start timestamptz := ((now() at time zone 'Europe/Berlin')::date)::timestamp at time zone 'Europe/Berlin';
begin
  if p_name is null or p_name not in ('stay_view', 'hotel_view', 'city_view', 'drops_view') then
    return;
  end if;
  if p_props is null or jsonb_typeof(p_props) <> 'object' or length(p_props::text) > 400 then
    return;
  end if;
  if (select count(*) from public.events e
       where e.name in ('stay_view', 'hotel_view', 'city_view', 'drops_view')
         and e.at >= v_today_start) >= c_daily_events then
    return;
  end if;
  insert into public.events (name, props) values (p_name, p_props);
end;
$$;
