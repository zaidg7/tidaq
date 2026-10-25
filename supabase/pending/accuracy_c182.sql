-- C-182: how far our calculated prices (checked base rate x hotel tax factor) are from the exact
-- price a site shows (drop_quotes), per site and day, for /admin/genauigkeit (service role only).
-- Pairs: an exact quote and the live check of the same stay on the same site within 6 hours, like
-- refresh_provider_price_bias (C-165).
-- stay_quote: the fresh exact quote (24 h) of one stay, so the stay page can show the exact price
-- instead of the calculated one. Public numbers (anon), no links.
create or replace function public.accuracy_stats(p_days integer default 14)
returns table (day date, provider text, pairs integer, median_ratio numeric, median_abs_pct numeric,
               within_5 integer, within_10 integer)
language sql
stable
security definer
set search_path = ''
as $fn$
  with f as (select hf.hotel_id, hf.factor from public.hotel_price_factors() hf),
  q as (
    select dq.hotel_id, dq.night, dq.check_out, dq.quoted_at, o ->> 'slug' as slug,
           (o ->> 'total_cents')::numeric as exact
      from public.drop_quotes dq
      cross join lateral jsonb_array_elements(
        case when jsonb_typeof(dq.offers) = 'array' then dq.offers else '[]'::jsonb end
      ) o
     where dq.quoted_at > now() - make_interval(days => greatest(p_days, 1))
       and (o ->> 'total_cents') is not null
  ),
  r as (
    select (q.quoted_at at time zone 'Europe/Berlin')::date as day, q.slug,
           q.exact / (c.cents * f.factor) as ratio
      from q
      join f on f.hotel_id = q.hotel_id
      join lateral (
        select dc.cents, dc.checked_at
          from public.drop_checks dc
         where dc.hotel_id = q.hotel_id and dc.night = q.night and dc.check_out = q.check_out
           and dc.provider_slug = q.slug and dc.cents > 0
         order by abs(extract(epoch from dc.checked_at - q.quoted_at))
         limit 1
      ) c on true
     where abs(extract(epoch from c.checked_at - q.quoted_at)) < 6 * 3600
       and q.exact > 0
  )
  select r.day, r.slug,
         count(*)::integer,
         round((percentile_cont(0.5) within group (order by r.ratio))::numeric, 4),
         round((percentile_cont(0.5) within group (order by abs(r.ratio - 1)))::numeric * 100, 1),
         (count(*) filter (where abs(r.ratio - 1) <= 0.05))::integer,
         (count(*) filter (where abs(r.ratio - 1) <= 0.10))::integer
    from r
   group by r.day, r.slug
   order by r.day desc, count(*) desc;
$fn$;
revoke all on function public.accuracy_stats(integer) from public, anon, authenticated;
grant execute on function public.accuracy_stats(integer) to service_role;

create or replace function public.stay_quote(p_hotel_id integer, p_check_in date, p_check_out date)
returns table (quoted_at timestamptz, provider text, total_cents integer)
language sql
stable
security definer
set search_path = ''
as $fn$
  select dq.quoted_at, o ->> 'slug', (o ->> 'total_cents')::integer
    from public.drop_quotes dq
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(dq.offers) = 'array' then dq.offers else '[]'::jsonb end
    ) o
   where dq.hotel_id = p_hotel_id and dq.night = p_check_in and dq.check_out = p_check_out
     and dq.status = 'done'
     and dq.quoted_at > now() - interval '24 hours'
     and (o ->> 'total_cents') ~ '^[0-9]+$'
     and (o ->> 'total_cents')::integer > 0;
$fn$;
revoke all on function public.stay_quote(integer, date, date) from public;
grant execute on function public.stay_quote(integer, date, date) to anon, authenticated, service_role;
