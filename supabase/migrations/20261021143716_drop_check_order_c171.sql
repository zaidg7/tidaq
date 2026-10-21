-- C-171: after the radar came back (C-169) the live checks spent every slot on the biggest drops
-- of 4 hotels, mostly Riviera Maya, which has no measured tax factor and so can never be shown
-- without an exact quote. Live checks now go to drops that can be shown first (confirmed by a
-- second site, at most 50 % down, hotel with a tax factor), one per hotel before a second one.
create or replace function public.drop_check_jobs(p_today date, p_stale_minutes integer, p_limit integer)
returns table (hotel_id integer, xotelo_key text, night date, check_out date, provider_slug text, now_cents integer)
language sql
stable
security definer
set search_path = ''
as $$
  with latest as (
    select max(x.today) as today from public.trip_drops x
     where x.today <= p_today + 1 and x.today >= p_today - 1
  ),
  factors as (select f.hotel_id from public.hotel_price_factors() f),
  trips as (
    select distinct on (t.hotel_id, t.night, t.check_out)
           t.hotel_id, h.xotelo_key, t.night, t.check_out, t.provider_slug, t.now_cents, t.drop_pct,
           (t.confirmed and t.drop_pct <= 0.50
            and exists (select 1 from factors f where f.hotel_id = t.hotel_id)) as showable
      from public.trip_drops t
      join latest l on t.today = l.today
      join public.hotels h on h.id = t.hotel_id
     where t.night > p_today and h.xotelo_key is not null
     order by t.hotel_id, t.night, t.check_out, t.drop_pct desc
  ),
  ranked as (
    select tr.*, row_number() over (partition by tr.hotel_id order by tr.drop_pct desc) as rn
      from trips tr
  )
  select r.hotel_id, r.xotelo_key, r.night, r.check_out, r.provider_slug, r.now_cents
    from ranked r
    left join public.drop_checks c
      on c.hotel_id = r.hotel_id and c.night = r.night and c.check_out = r.check_out
   where c.checked_at is null
      or c.checked_at < now() - make_interval(mins => p_stale_minutes)
   order by c.checked_at nulls first, r.showable desc, r.rn, r.drop_pct desc
   limit p_limit;
$$;
