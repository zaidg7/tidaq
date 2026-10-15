-- C-080d: radar_drops = price_drops (C-080a) plus prior_avg_cents, the average cheapest price of
-- that night over the checks of the 14 days before the drop (same window as prior_low): the
-- "usual price" anchor on the radar. A new name because changing price_drops' return type needs a
-- DROP; price_drops stays until it can be removed (see docs/TASKS.md C-080d notes).
create or replace function public.radar_drops(p_today date)
returns table (
  hotel_id integer,
  hotel_slug text,
  hotel_name text,
  city_slug text,
  city_name_de text,
  city_name_en text,
  night date,
  seen_day date,
  seen_at timestamptz,
  now_cents integer,
  prev_cents integer,
  drop_pct numeric,
  prior_low_cents integer,
  prior_days integer,
  prior_avg_cents integer,
  provider_slug text,
  provider_name text,
  provider_direct boolean,
  offers integer,
  confirmed boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with latest as (
    select distinct on (nd.hotel_id, nd.night)
           nd.hotel_id, nd.night, nd.day, nd.best_cents, nd.best_provider_id, nd.per_provider,
           nd.collected_at
      from public.night_daily nd
      join public.hotels h on h.id = nd.hotel_id and h.active
     where nd.adults = 2 and nd.day >= p_today - 1 and nd.day <= p_today
       and nd.night > p_today and nd.best_cents is not null
     order by nd.hotel_id, nd.night, nd.day desc
  ),
  cand as (
    select l.*, p.best_cents as prev_cents
      from latest l
      join public.night_daily p
        on p.hotel_id = l.hotel_id and p.adults = 2 and p.night = l.night and p.day = l.day - 1
     where p.best_cents is not null
       and l.best_cents <= p.best_cents * 0.85
       and p.best_cents - l.best_cents >= 5000
  ),
  hist as (
    select c.hotel_id, c.night, min(o.best_cents) as prior_low, count(*)::integer as prior_days,
           round(avg(o.best_cents))::integer as prior_avg
      from cand c
      join public.night_daily o
        on o.hotel_id = c.hotel_id and o.adults = 2 and o.night = c.night
       and o.day < c.day and o.day >= c.day - 14 and o.best_cents is not null
     group by c.hotel_id, c.night
  ),
  reviewed as (
    select c.hotel_id, c.night,
           count(*)::integer as offers,
           count(*) filter (where e.value::int <= c.best_cents * 1.10)::integer as near
      from cand c
      cross join lateral jsonb_each_text(c.per_provider) e
      join public.providers pr on pr.id = e.key::int and not pr.pending
     group by c.hotel_id, c.night
  )
  select c.hotel_id, h.slug, h.name, ci.slug, ci.name_de, ci.name_en,
         c.night, c.day, c.collected_at,
         c.best_cents, c.prev_cents,
         round((c.prev_cents - c.best_cents)::numeric / c.prev_cents, 4),
         hi.prior_low, hi.prior_days, hi.prior_avg,
         pr.slug, pr.name, pr.is_direct, r.offers,
         (r.near >= 2)
    from cand c
    join hist hi using (hotel_id, night)
    join reviewed r using (hotel_id, night)
    join public.hotels h on h.id = c.hotel_id
    join public.cities ci on ci.id = h.city_id
    join public.providers pr on pr.id = c.best_provider_id
   where c.best_cents < hi.prior_low
     and (c.best_cents >= c.prev_cents * 0.4 or r.near >= 2)
   order by (c.prev_cents - c.best_cents)::numeric / c.prev_cents desc, c.night;
$$;

revoke all on function public.radar_drops(date) from public;
grant execute on function public.radar_drops(date) to anon, authenticated, service_role;

