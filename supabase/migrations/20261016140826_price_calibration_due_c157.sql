-- C-157: cities due for a calibration, with one of their hotels so the paid task can be logged in
-- drop_quote_log (hotel_id is required there; the monthly budget counts every task). Replaces
-- calibration_jobs (unused; dropping functions hangs through the migration tool, see C-148b).
create function public.calibration_due(p_today date, p_limit integer)
returns table (city_id integer, city_en text, anchor_hotel_id integer, check_in date, check_out date)
language sql stable security definer set search_path = '' as $$
  select ci.id, ci.name_en,
         (select min(h.id) from public.hotels h where h.city_id = ci.id and h.active),
         p_today + 21, p_today + 23
    from public.cities ci
    left join lateral (
      select c.status, c.posted_at, c.finished_at from public.price_calibrations c
       where c.city_id = ci.id order by c.posted_at desc limit 1
    ) last on true
   where exists (select 1 from public.hotels h where h.city_id = ci.id and h.active)
     and (last.status is null
          or (last.status = 'done' and last.posted_at < now() - interval '7 days')
          or (last.status = 'posted' and last.posted_at < now() - interval '60 minutes')
          or (last.status = 'failed' and coalesce(last.finished_at, last.posted_at) < now() - interval '1 day'))
   order by last.posted_at nulls first, ci.id
   limit p_limit;
$$;
revoke all on function public.calibration_due(date, integer) from public, anon, authenticated;
grant execute on function public.calibration_due(date, integer) to service_role;

-- Calibration tasks posted since the start of p_today (UTC): their own daily cap.
create function public.calibration_posted_today(p_today date)
returns integer
language sql stable security definer set search_path = '' as $$
  select count(*)::integer from public.price_calibrations c where c.posted_at >= p_today::timestamptz;
$$;
revoke all on function public.calibration_posted_today(date) from public, anon, authenticated;
grant execute on function public.calibration_posted_today(date) to service_role;
