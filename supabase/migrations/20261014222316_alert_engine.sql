-- C-031: inputs for the daily price alerts and recording a sent alert. Service role only.
-- alert_inputs: active watches of confirmed, subscribed addresses with check-in after p_today,
-- each with its last 60 days: real stay checks (stay_daily) when there are any, otherwise the
-- night sums (2 adults, hotels whose single nights are reliable, C-070d), else an empty series.
create or replace function public.alert_inputs(p_today date)
returns table (
  watch_id uuid, email text, locale text, manage_token uuid,
  hotel_slug text, hotel_name text, check_in date, check_out date, adults integer,
  target_cents integer, last_alert_cents integer, last_alert_at timestamptz, series jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  with unreliable as (
    select r.hotel_id from public.night_reliability(p_today) r where not r.reliable
  )
  select wa.id, w.email, w.locale, w.manage_token,
         h.slug, h.name, ts.check_in, ts.check_out, ts.adults::integer,
         wa.target_cents, wa.last_alert_cents, wa.last_alert_at,
         coalesce(
           (select jsonb_agg(jsonb_build_object('day', sd.day, 'cents', sd.best_cents)
                             order by sd.day)
              from public.stay_daily sd
             where sd.stay_id = ts.id and sd.day > p_today - 60
            having count(*) > 0),
           case when ts.adults = 2 and h.id not in (select hotel_id from unreliable) then
             (select jsonb_agg(jsonb_build_object('day', n.day, 'cents', n.best_cents)
                               order by n.day)
                from public.stay_history_from_nights(h.id, ts.check_in, ts.check_out, p_today - 59) n
               where n.best_cents is not null)
           end,
           '[]'::jsonb
         )
    from public.watches wa
    join public.watchers w on w.id = wa.watcher_id
    join public.tracked_stays ts on ts.id = wa.stay_id
    join public.hotels h on h.id = ts.hotel_id
   where wa.active
     and w.confirmed_at is not null
     and w.unsubscribed_at is null
     and h.active
     and ts.check_in > p_today;
$$;

create or replace function public.alert_record(
  p_watch_id uuid,
  p_kind text,
  p_price_cents integer,
  p_resend_id text
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.alerts_sent (watch_id, kind, price_cents, resend_id)
  values (p_watch_id, p_kind, p_price_cents, p_resend_id);
  update public.watches
     set last_alert_cents = p_price_cents, last_alert_at = now()
   where id = p_watch_id;
$$;

revoke all on function public.alert_inputs(date) from public, anon, authenticated;
revoke all on function public.alert_record(uuid, text, integer, text) from public, anon, authenticated;
grant execute on function public.alert_inputs(date) to service_role;
grant execute on function public.alert_record(uuid, text, integer, text) to service_role;
