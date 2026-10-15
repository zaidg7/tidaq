-- C-080k2: who gets today's Preissturz-Alarm email. Confirmed, subscribed addresses not mailed yet
-- today, with the city alarm on (drop_alerts; drop_city null = all cities) and/or followed hotels
-- (drop_hotel_alerts, C-080k1). One row per address with its hotel ids. Service role only.
create or replace function public.drop_alert_recipients(p_today date)
returns table (
  id uuid,
  email text,
  locale text,
  manage_token uuid,
  drop_alerts boolean,
  drop_city text,
  hotel_ids integer[]
)
language sql
stable
security definer
set search_path = ''
as $$
  select w.id, w.email, w.locale, w.manage_token, w.drop_alerts, w.drop_city,
         coalesce(array_agg(a.hotel_id order by a.hotel_id) filter (where a.hotel_id is not null),
                  '{}'::integer[])
    from public.watchers w
    left join public.drop_hotel_alerts a on a.watcher_id = w.id
   where w.confirmed_at is not null
     and w.unsubscribed_at is null
     and (w.drop_sent_on is null or w.drop_sent_on < p_today)
   group by w.id
  having w.drop_alerts or count(a.hotel_id) > 0
   order by w.id
   limit 5000;
$$;

revoke all on function public.drop_alert_recipients(date) from public, anon, authenticated;
grant execute on function public.drop_alert_recipients(date) to service_role;
