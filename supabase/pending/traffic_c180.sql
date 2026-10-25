-- C-180: where visitors come from. A visit from a social link carries `ref` (tiktok, instagram,
-- youtube, or a video tag like tt-1026a) from the radar to the drop page and on to /go, so every
-- logged outbound click can carry it (still no IP, no user agent, no id). outbound_click gets a
-- 6-argument version with p_ref; the 5-argument one stays as a wrapper so old callers keep working.
-- log_event accepts 'drop_view' ({"hotel": slug, "ref": ...}). traffic_stats(p_days) sums it up for
-- /admin/zahlen (service role only): per day, per source, per booking site, per hotel, per posted
-- video.

create or replace function public.outbound_click(
  p_provider text,
  p_hotel text,
  p_check_in date,
  p_check_out date,
  p_adults integer,
  p_ref text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- Keep in line with core STAY_LIMITS / ADULTS (C-021b, C-022a).
  c_max_nights constant integer := 30;
  c_max_days_ahead constant integer := 365;
  -- Abuse guard: beyond this many logged clicks per German day the redirect still works, it just
  -- isn't counted, so a bot can't fill the events table.
  c_daily_events constant integer := 5000;
  v_today date := (now() at time zone 'Europe/Berlin')::date;
  v_provider record;
  v_hotel record;
  v_page text;
begin
  if p_provider is null or p_hotel is null or p_check_in is null or p_check_out is null
     or p_adults is null
     or p_adults not between 1 and 4
     or p_check_out <= p_check_in
     or p_check_out - p_check_in > c_max_nights
     or p_check_in < v_today
     or p_check_out > v_today + c_max_days_ahead then
    return null;
  end if;

  select p.id, p.slug, p.is_direct, p.affiliate_template into v_provider
    from public.providers p
   where p.slug = p_provider and not p.pending;
  if not found then
    return null;
  end if;

  select h.id, h.slug, h.name, h.official_url, c.name_en as city into v_hotel
    from public.hotels h
    join public.cities c on c.id = h.city_id
   where h.slug = p_hotel;
  if not found then
    return null;
  end if;

  select pp.page_ref into v_page
    from public.hotel_provider_pages pp
   where pp.hotel_id = v_hotel.id and pp.provider_id = v_provider.id;

  if (select count(*) from public.events e
       where e.name = 'outbound_click'
         and e.at >= (v_today::timestamp at time zone 'Europe/Berlin')) < c_daily_events then
    insert into public.events (name, props)
    values ('outbound_click', jsonb_build_object(
      'provider', v_provider.slug,
      'hotel', v_hotel.slug,
      'check_in', p_check_in,
      'check_out', p_check_out,
      'adults', p_adults
    ) || case when p_ref ~ '^[a-z0-9-]{1,32}$' then jsonb_build_object('ref', p_ref) else '{}'::jsonb end);
  end if;

  return jsonb_build_object(
    'provider', jsonb_build_object(
      'slug', v_provider.slug,
      'is_direct', v_provider.is_direct,
      'affiliate_template', v_provider.affiliate_template
    ),
    'hotel', jsonb_build_object(
      'name', v_hotel.name,
      'city', v_hotel.city,
      'official_url', v_hotel.official_url,
      'page', v_page
    )
  );
end;
$$;

create or replace function public.outbound_click(
  p_provider text,
  p_hotel text,
  p_check_in date,
  p_check_out date,
  p_adults integer
)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select public.outbound_click(p_provider, p_hotel, p_check_in, p_check_out, p_adults, null::text);
$$;

revoke all on function public.outbound_click(text, text, date, date, integer, text) from public;
grant execute on function public.outbound_click(text, text, date, date, integer, text)
  to anon, authenticated, service_role;
revoke all on function public.outbound_click(text, text, date, date, integer) from public;
grant execute on function public.outbound_click(text, text, date, date, integer)
  to anon, authenticated, service_role;

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
  if p_name is null
     or p_name not in ('stay_view', 'hotel_view', 'city_view', 'drops_view', 'drop_view') then
    return;
  end if;
  if p_props is null or jsonb_typeof(p_props) <> 'object' or length(p_props::text) > 400 then
    return;
  end if;
  if (select count(*) from public.events e
       where e.name in ('stay_view', 'hotel_view', 'city_view', 'drops_view', 'drop_view')
         and e.at >= v_today_start) >= c_daily_events then
    return;
  end if;
  insert into public.events (name, props) values (p_name, p_props);
end;
$$;

revoke all on function public.log_event(text, jsonb) from public;
grant execute on function public.log_event(text, jsonb) to anon, authenticated, service_role;

-- Visits, clicks and posted videos of the last p_days German days, newest day first.
create or replace function public.traffic_stats(p_days integer default 14)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with e as (
    select ev.name,
           ev.props,
           (ev.at at time zone 'Europe/Berlin')::date as day,
           ev.at,
           coalesce(nullif(ev.props ->> 'ref', ''), 'none') as ref
      from public.events ev
     where ev.name in ('stay_view', 'hotel_view', 'city_view', 'drops_view', 'drop_view', 'outbound_click')
       and ev.at >= ((now() at time zone 'Europe/Berlin')::date - (greatest(p_days, 1) - 1))::timestamp
                    at time zone 'Europe/Berlin'
  ),
  days as (
    select e.day,
           count(*) filter (where e.name <> 'outbound_click') as views,
           count(*) filter (where e.name = 'drops_view') as radar,
           count(*) filter (where e.name = 'drop_view') as drop_pages,
           count(*) filter (where e.name = 'stay_view') as stays,
           count(*) filter (where e.name = 'hotel_view') as hotels,
           count(*) filter (where e.name = 'outbound_click') as clicks
      from e group by e.day
  ),
  by_provider as (
    select e.props ->> 'provider' as provider, count(*) as clicks
      from e where e.name = 'outbound_click' group by 1
  ),
  by_ref as (
    select e.ref,
           count(*) filter (where e.name in ('drops_view', 'drop_view')) as visits,
           count(*) filter (where e.name = 'outbound_click') as clicks
      from e where e.name in ('drops_view', 'drop_view', 'outbound_click') group by 1
  ),
  by_hotel as (
    select e.props ->> 'hotel' as slug,
           count(*) filter (where e.name = 'outbound_click') as clicks,
           count(*) filter (where e.name in ('stay_view', 'hotel_view', 'drop_view')) as views
      from e where e.props ? 'hotel' group by 1
  ),
  posted as (
    select pd.posted_on, pd.platform, h.slug, h.name, pd.drop_pct,
           (select count(*) from e where e.name in ('drop_view', 'stay_view', 'hotel_view')
                                     and e.props ->> 'hotel' = h.slug
                                     and e.day between pd.posted_on and pd.posted_on + 2) as views_3d,
           (select count(*) from e where e.name = 'outbound_click'
                                     and e.props ->> 'hotel' = h.slug
                                     and e.day between pd.posted_on and pd.posted_on + 2) as clicks_3d
      from public.posted_drops pd
      join public.hotels h on h.id = pd.hotel_id
     where pd.posted_on >= (now() at time zone 'Europe/Berlin')::date - (greatest(p_days, 1) - 1)
  )
  select jsonb_build_object(
    'days', coalesce((select jsonb_agg(to_jsonb(d) order by d.day desc) from days d), '[]'::jsonb),
    'providers', coalesce((select jsonb_agg(to_jsonb(p) order by p.clicks desc) from by_provider p), '[]'::jsonb),
    'refs', coalesce((select jsonb_agg(to_jsonb(r) order by r.visits + r.clicks desc) from by_ref r), '[]'::jsonb),
    'hotels', coalesce((select jsonb_agg(x order by (x ->> 'clicks')::int desc, (x ->> 'views')::int desc)
                          from (select jsonb_build_object('slug', b.slug, 'name', h.name, 'clicks', b.clicks, 'views', b.views) as x
                                  from by_hotel b left join public.hotels h on h.slug = b.slug
                                 order by b.clicks desc, b.views desc limit 15) t), '[]'::jsonb),
    'posted', coalesce((select jsonb_agg(to_jsonb(p) order by p.posted_on desc) from posted p), '[]'::jsonb)
  );
$$;

revoke all on function public.traffic_stats(integer) from public, anon, authenticated;
grant execute on function public.traffic_stats(integer) to service_role;
