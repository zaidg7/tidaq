-- C-031b: today's offers for the stay of one watch, for the alert email's "best trusted
-- provider" (core `rankOffers`). Same source as `alert_inputs`' series: the real stay check of
-- p_today, else the night sums of p_today (2 adults). Reviewed providers only, with their
-- checkout-test record. Service role only; called just for watches with an alert due.
create or replace function public.alert_offers(p_watch_id uuid, p_today date)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with w as (
    select ts.id as stay_id, ts.hotel_id, ts.check_in, ts.check_out, ts.adults
      from public.watches wa
      join public.tracked_stays ts on ts.id = wa.stay_id
     where wa.id = p_watch_id
  ),
  pp as (
    select coalesce(
      (select sd.per_provider from public.stay_daily sd, w
        where sd.stay_id = w.stay_id and sd.day = p_today),
      (select n.per_provider
         from w
         cross join lateral public.stay_history_from_nights(w.hotel_id, w.check_in, w.check_out, p_today) n
        where w.adults = 2 and n.day = p_today)
    ) as per_provider
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'slug', p.slug,
           'name', p.name,
           'is_direct', p.is_direct,
           'partner', p.affiliate_template is not null,
           'cents', (e.value #>> '{}')::integer,
           'score', s.score,
           'tests', coalesce(s.tests, 0),
           'matches', coalesce(s.matches, 0),
           'avg_markup_pct', s.avg_markup_pct
         ) order by (e.value #>> '{}')::integer, p.id), '[]'::jsonb)
    from pp
    cross join lateral jsonb_each(pp.per_provider) e
    join public.providers p on p.id = e.key::integer and not p.pending
    left join public.provider_scores s on s.provider_id = p.id
   where (e.value #>> '{}')::integer > 0;
$$;

revoke all on function public.alert_offers(uuid, date) from public, anon, authenticated;
grant execute on function public.alert_offers(uuid, date) to service_role;
