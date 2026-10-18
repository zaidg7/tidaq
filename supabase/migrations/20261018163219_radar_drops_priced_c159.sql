-- C-159 (D-53): Price Drops all day. A drop with a fresh exact quote (C-148) shows it, marked
-- exact. Every other live-checked drop shows the checked price plus the hotel's measured taxes and
-- fees (C-157, `hotel_price_factors`), marked as such, but only when it is solid without a quote:
-- confirmed by a second site within 10 % (`confirmed`), at most 50 % down (bigger ones need an
-- exact quote) and with a measured tax factor. Live check within the last hour as before (C-144).
-- A new name instead of replacing radar_quoted_drops (dropping functions hangs, C-148b).
create or replace function public.radar_drops_priced(p_today date, p_nights integer)
returns table (
  hotel_id integer, hotel_slug text, hotel_name text, city_slug text, city_name_de text,
  city_name_en text, night date, check_out date, seen_day date, seen_at timestamptz,
  now_cents integer, prev_cents integer, drop_pct numeric, prior_low_cents integer,
  prior_days integer, prior_avg_cents integer, provider_slug text, provider_name text,
  provider_direct boolean, offers integer, confirmed boolean,
  quote_nightly_cents integer, quote_url text, quoted_at timestamptz, exact boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with live as (
    select t.*, c.cents as check_cents, c.checked_at
      from public.trip_drops t
      join public.drop_checks c
        on c.hotel_id = t.hotel_id and c.night = t.night and c.check_out = t.check_out
       and c.provider_slug = t.provider_slug
     where t.nights = p_nights
       and t.night > p_today
       and t.today = (
         select max(x.today) from public.trip_drops x
          where x.nights = p_nights and x.today <= p_today and x.today >= p_today - 1
       )
       and c.live and c.cents is not null
       and c.checked_at > now() - interval '60 minutes'
  ),
  quoted as (
    select l.hotel_id, l.night, l.check_out,
           (o.offer ->> 'total_cents')::integer as total,
           (o.offer ->> 'nightly_cents')::integer as nightly,
           o.offer ->> 'url' as url,
           q.quoted_at
      from live l
      join public.drop_quotes q
        on q.hotel_id = l.hotel_id and q.night = l.night and q.check_out = l.check_out
      cross join lateral (
        select e as offer from jsonb_array_elements(q.offers) e
         where e ->> 'slug' = l.provider_slug
         order by (e ->> 'total_cents')::integer
         limit 1
      ) o
     where q.offers is not null and q.quoted_at > now() - interval '6 hours'
       and (o.offer ->> 'total_cents')::integer
           between round(l.check_cents * 0.95) and round(l.check_cents * 1.40)
  ),
  factors as (select f.hotel_id, f.factor from public.hotel_price_factors() f)
  select * from (
    select l.hotel_id, l.hotel_slug, l.hotel_name, l.city_slug, l.city_name_de, l.city_name_en,
           l.night, l.check_out,
           (coalesce(q.quoted_at, l.checked_at) at time zone 'Europe/Berlin')::date as seen_day,
           coalesce(q.quoted_at, l.checked_at) as seen_at,
           coalesce(q.total, round(l.check_cents * f.factor)::integer) as now_cents,
           l.prev_cents,
           round(1 - l.check_cents::numeric / l.prev_cents, 4) as drop_pct,
           l.prior_low_cents, l.prior_days, l.prior_avg_cents, l.provider_slug, l.provider_name,
           l.provider_direct, l.offers, l.confirmed,
           coalesce(q.nightly, round(l.check_cents * f.factor / p_nights)::integer) as quote_nightly_cents,
           q.url as quote_url,
           q.quoted_at,
           q.total is not null as exact
      from live l
      left join quoted q on q.hotel_id = l.hotel_id and q.night = l.night and q.check_out = l.check_out
      left join factors f on f.hotel_id = l.hotel_id
     where q.total is not null
        or (l.confirmed and f.factor is not null
            and 1 - l.check_cents::numeric / l.prev_cents <= 0.50)
  ) d
   where d.drop_pct >= 0.15
   order by d.drop_pct desc, d.night;
$$;
revoke all on function public.radar_drops_priced(date, integer) from public;
grant execute on function public.radar_drops_priced(date, integer) to anon, authenticated, service_role;
