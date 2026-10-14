-- Requested stays (C-022c1): a visitor asks us to track dates we don't track yet.
--
-- 1. Posting runs record the daily task cap they ran with, so the database knows the collector's
--    capacity without a second copy of DAILY_TASK_CAP.
-- 2. Run kind `request`: the collect cron (every 10 min) queues requested stays without a price yet.
-- 3. `request_stay()`: the only way the public site creates stays. Anon may call it; it validates
--    the stay and only adds one while the collector has room and the day's request limit isn't
--    reached, so requests never push the fixed grid out of the daily cap.

alter table public.collector_runs
  add column daily_cap integer check (daily_cap >= 0);

alter table public.collector_runs drop constraint collector_runs_kind_check;
alter table public.collector_runs
  add constraint collector_runs_kind_check
    check (kind in ('morning', 'evening', 'collect', 'manual', 'request'));

create index tracked_stays_origin_created_idx on public.tracked_stays (created_at) where origin = 'watch';

-- Returns one of:
--   'tracked'  the stay is already tracked (nothing changed)
--   'created'  the stay is now tracked (new or re-activated)
--   'full'     no room today: collector capacity or the daily request limit is used up
--   'invalid'  unknown or inactive hotel, or dates/guests outside the limits
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
  -- New requests per German calendar day (abuse guard on top of the capacity check).
  c_daily_requests constant integer := 30;
  -- Used until the first production posting run has recorded its cap.
  c_default_cap constant integer := 400;
  v_today date := (now() at time zone 'Europe/Berlin')::date;
  v_hotel_id integer;
  v_stay_id bigint;
  v_stay_active boolean;
  v_cap integer;
  v_active integer;
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

  select cr.daily_cap into v_cap
    from public.collector_runs cr
   where cr.env = 'production'
     and cr.daily_cap is not null
   order by cr.started_at desc
   limit 1;
  v_cap := coalesce(v_cap, c_default_cap);

  select count(*) into v_active
    from public.tracked_stays ts
    join public.hotels h on h.id = ts.hotel_id
   where ts.active
     and h.active
     and ts.check_in >= v_today;

  select count(*) into v_requested_today
    from public.tracked_stays ts
   where ts.origin = 'watch'
     and ts.created_at >= (v_today::timestamp at time zone 'Europe/Berlin');

  if v_active >= v_cap or v_requested_today >= c_daily_requests then
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

revoke all on function public.request_stay(text, date, date, integer) from public;
grant execute on function public.request_stay(text, date, date, integer) to anon, authenticated, service_role;
