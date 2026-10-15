-- C-132a: request_stay compared all active tracked stays with the daily task cap. Since the stay
-- grid grew past the cap (725 stays, cap 400) it answered 'full' to every visitor, so dates a
-- visitor opened never got the real check D-42 promises. The collector's budget guard is the
-- real limit: scheduled runs now keep REQUEST_RESERVE (30) tasks of the daily cap free for
-- requests, and the request run posts inside the cap like before. Here only the per-day limit of
-- new requests stays (abuse guard), same as REQUEST_RESERVE.
create or replace function public.request_stay(
  p_hotel_slug text,
  p_check_in date,
  p_check_out date,
  p_adults integer
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- Keep in line with core STAY_LIMITS / ADULTS (C-021b, C-022a).
  c_max_nights constant integer := 30;
  c_max_days_ahead constant integer := 365;
  -- New requests per German calendar day; keep in line with core REQUEST_RESERVE.
  c_daily_requests constant integer := 30;
  v_today date := (now() at time zone 'Europe/Berlin')::date;
  v_hotel_id integer;
  v_stay_id bigint;
  v_stay_active boolean;
  v_requested_today integer;
begin
  if p_hotel_slug is null or p_check_in is null or p_check_out is null or p_adults is null
     or p_adults not between 1 and 4
     or p_check_out <= p_check_in
     or p_check_out - p_check_in > c_max_nights
     or p_check_in < v_today
     or p_check_out > v_today + c_max_days_ahead then
    return 'invalid';
  end if;

  select h.id into v_hotel_id
    from public.hotels h
   where h.slug = p_hotel_slug
     and h.active
     and (h.xotelo_key is not null or h.dfs_hotel_identifier is not null);
  if v_hotel_id is null then
    return 'invalid';
  end if;

  -- One request at a time, so two visitors can't both take the last free slot.
  perform pg_advisory_xact_lock(hashtext('public.request_stay'));

  select ts.id, ts.active into v_stay_id, v_stay_active
    from public.tracked_stays ts
   where ts.hotel_id = v_hotel_id
     and ts.check_in = p_check_in
     and ts.check_out = p_check_out
     and ts.adults = p_adults;
  if v_stay_active then
    return 'tracked';
  end if;

  select count(*) into v_requested_today
    from public.tracked_stays ts
   where ts.origin = 'watch'
     and ts.created_at >= (v_today::timestamp at time zone 'Europe/Berlin');

  if v_requested_today >= c_daily_requests then
    return 'full';
  end if;

  if v_stay_id is not null then
    -- A stay we tracked before (e.g. deactivated): track it again.
    update public.tracked_stays set active = true where id = v_stay_id;
  else
    insert into public.tracked_stays (hotel_id, check_in, check_out, adults, origin)
    values (v_hotel_id, p_check_in, p_check_out, p_adults, 'watch');
  end if;
  return 'created';
end;
$$;
