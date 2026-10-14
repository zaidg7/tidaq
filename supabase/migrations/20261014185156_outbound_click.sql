-- C-026: outbound links. `/go/<provider>/<hotel>?in&out&adults` calls this with the anon key: it
-- checks the stay, logs one `outbound_click` event (provider, hotel, stay; no IP, no user agent,
-- no user id) and returns what the web app needs to build the provider link. Only reviewed
-- providers (not pending) can be linked. Returns null for anything invalid or unknown.

create or replace function public.outbound_click(
  p_provider text,
  p_hotel text,
  p_check_in date,
  p_check_out date,
  p_adults integer
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

  select p.slug, p.is_direct, p.affiliate_template into v_provider
    from public.providers p
   where p.slug = p_provider and not p.pending;
  if not found then
    return null;
  end if;

  select h.slug, h.name, h.official_url, c.name_en as city into v_hotel
    from public.hotels h
    join public.cities c on c.id = h.city_id
   where h.slug = p_hotel;
  if not found then
    return null;
  end if;

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
    ));
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
      'official_url', v_hotel.official_url
    )
  );
end;
$$;

revoke all on function public.outbound_click(text, text, date, date, integer) from public;
grant execute on function public.outbound_click(text, text, date, date, integer)
  to anon, authenticated, service_role;
