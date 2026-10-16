-- C-148b: the radar of quoted drops (D-52). A new name instead of replacing radar_trip_drops: the
-- return type changes, and dropping the old function hung through the migration tool on 16 Oct.
-- A drop is shown only with a fresh exact quote. Amounts come from the quote: now_cents is the
-- site's quoted stay total, quote_nightly_cents its nightly price as the site shows it (taxes and
-- fees included). drop_pct stays the site's own change from yesterday to the live check, measured
-- on Xotelo's base rates (same basis on both days); prev_cents is kept for sorting only and never
-- shown. The quote must agree with the live check: quoted total between 0,95x and 1,40x the
-- checked base rate (taxes and fees only add), otherwise one of the two is stale and the drop is
-- not shown. A re-quote in flight keeps the last offers (at most 6 hours old).
create or replace function public.radar_quoted_drops(p_today date, p_nights integer)
returns table (
  hotel_id integer, hotel_slug text, hotel_name text, city_slug text, city_name_de text,
  city_name_en text, night date, check_out date, seen_day date, seen_at timestamptz,
  now_cents integer, prev_cents integer, drop_pct numeric, prior_low_cents integer,
  prior_days integer, prior_avg_cents integer, provider_slug text, provider_name text,
  provider_direct boolean, offers integer, confirmed boolean,
  quote_nightly_cents integer, quote_url text, quoted_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select * from (
    select t.hotel_id, t.hotel_slug, t.hotel_name, t.city_slug, t.city_name_de, t.city_name_en,
           t.night, t.check_out,
           (q.quoted_at at time zone 'Europe/Berlin')::date as seen_day,
           q.quoted_at as seen_at,
           (o.offer ->> 'total_cents')::integer as now_cents,
           t.prev_cents,
           round(1 - c.cents::numeric / t.prev_cents, 4) as drop_pct,
           t.prior_low_cents, t.prior_days, t.prior_avg_cents, t.provider_slug, t.provider_name,
           t.provider_direct, t.offers, t.confirmed,
           (o.offer ->> 'nightly_cents')::integer as quote_nightly_cents,
           o.offer ->> 'url' as quote_url,
           q.quoted_at
      from public.trip_drops t
      join public.drop_checks c
        on c.hotel_id = t.hotel_id and c.night = t.night and c.check_out = t.check_out
       and c.provider_slug = t.provider_slug
      join public.drop_quotes q
        on q.hotel_id = t.hotel_id and q.night = t.night and q.check_out = t.check_out
      cross join lateral (
        select e as offer from jsonb_array_elements(q.offers) e
         where e ->> 'slug' = t.provider_slug
         order by (e ->> 'total_cents')::integer
         limit 1
      ) o
     where t.nights = p_nights
       and t.night > p_today
       and t.today = (
         select max(x.today) from public.trip_drops x
          where x.nights = p_nights and x.today <= p_today and x.today >= p_today - 1
       )
       and c.live and c.cents is not null
       and c.checked_at > now() - interval '60 minutes'
       and q.offers is not null and q.quoted_at > now() - interval '6 hours'
       and (o.offer ->> 'total_cents')::integer between round(c.cents * 0.95) and round(c.cents * 1.40)
  ) d
   where d.drop_pct >= 0.15
   order by d.drop_pct desc, d.night;
$$;
revoke all on function public.radar_quoted_drops(date, integer) from public;
grant execute on function public.radar_quoted_drops(date, integer) to anon, authenticated, service_role;
