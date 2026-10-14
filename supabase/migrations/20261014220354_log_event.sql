-- C-029: anonymous page-view counts. The web app calls log_event with the anon key after the
-- response (bots skipped). Only known names, small object props (no visitor data: no IP, no
-- user agent, no id), and at most 20,000 views a German day, so a bot can't fill the table.
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
  if p_name is null or p_name not in ('stay_view', 'hotel_view', 'city_view') then
    return;
  end if;
  if p_props is null or jsonb_typeof(p_props) <> 'object' or length(p_props::text) > 400 then
    return;
  end if;
  if (select count(*) from public.events e
       where e.name in ('stay_view', 'hotel_view', 'city_view')
         and e.at >= v_today_start) >= c_daily_events then
    return;
  end if;
  insert into public.events (name, props) values (p_name, p_props);
end;
$$;

revoke all on function public.log_event(text, jsonb) from public;
grant execute on function public.log_event(text, jsonb) to anon, authenticated, service_role;

-- Counts per event name over the last p_days days, for the weekly summary (service role only).
create or replace function public.event_stats(p_days integer default 7)
returns table (name text, events bigint, first_day date, last_day date)
language sql
stable
set search_path = ''
as $$
  select e.name, count(*), min(e.at::date), max(e.at::date)
    from public.events e
   where e.at >= now() - make_interval(days => greatest(p_days, 1))
   group by e.name
   order by count(*) desc;
$$;

revoke all on function public.event_stats(integer) from public, anon, authenticated;
grant execute on function public.event_stats(integer) to service_role;
