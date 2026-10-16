-- C-154: two nights runs at the same time (collect cron on even minutes, CRON_NIGHTS on odd
-- minutes), each on its own share of the hotels by id, so 400+ hotels × 270 nights get priced
-- every day without both runs asking Xotelo for the same night. Same rules as night_jobs.
create or replace function public.night_jobs_part(
  p_today date, p_window integer, p_limit integer, p_part integer, p_parts integer
)
returns table (hotel_id integer, xotelo_key text, night date)
language sql
stable
set search_path = ''
as $$
  select h.id, h.xotelo_key, n.night
  from public.hotels h
  cross join lateral (
    select (p_today + g)::date as night from generate_series(0, greatest(p_window, 0) - 1) as g
  ) n
  where h.active
    and h.xotelo_key is not null
    and h.id % greatest(p_parts, 1) = p_part
    and not exists (
      select 1 from public.night_daily nd
      where nd.hotel_id = h.id and nd.adults = 2 and nd.night = n.night and nd.day = p_today
    )
  order by n.night, h.id
  limit greatest(p_limit, 0);
$$;

revoke all on function public.night_jobs_part(date, integer, integer, integer, integer)
  from public, anon, authenticated;
grant execute on function public.night_jobs_part(date, integer, integer, integer, integer)
  to service_role;
