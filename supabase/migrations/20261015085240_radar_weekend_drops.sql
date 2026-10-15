-- C-080f: weekend drops. Friday-to-Sunday stays (2 nights, 2 adults) whose total on one booking
-- site fell sharply since the day before, to a new low. A stay is booked on one site, so a
-- weekend's price on a site exists only when that site priced both nights on the same check day
-- (like stay_history_from_nights). Same rules as radar_drops: at least 15 % and 50 € less than
-- the check of the day before, below every check of the 14 days before, and a fall below 40 %
-- needs a second reviewed site within 10 %. Same columns as radar_drops plus check_out; night is
-- the check-in (Friday). Public data, anon may call it.
create or replace function public.radar_weekend_drops(p_today date)
returns table (
  hotel_id integer,
  hotel_slug text,
  hotel_name text,
  city_slug text,
  city_name_de text,
  city_name_en text,
  night date,
  check_out date,
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
  with nd as (
    select n.hotel_id, n.night, n.day, n.per_provider, n.collected_at
      from public.night_daily n
      join public.hotels h on h.id = n.hotel_id and h.active
     where n.adults = 2 and n.day >= p_today - 15 and n.day <= p_today
       and n.night > p_today and extract(isodow from n.night) in (5, 6)
  ),
  pp as (
    select n.hotel_id, n.day, n.collected_at,
           case when extract(isodow from n.night) = 5 then n.night else n.night - 1 end as fri,
           e.key::integer as pid, (e.value #>> '{}')::integer as cents
      from nd n
      cross join lateral jsonb_each(n.per_provider) as e
  ),
  tot as (
    select pp.hotel_id, pp.day, pp.fri, pp.pid, sum(pp.cents)::integer as total,
           max(pp.collected_at) as collected_at
      from pp
      join public.providers pr on pr.id = pp.pid and not pr.pending
     where pp.fri > p_today
     group by pp.hotel_id, pp.day, pp.fri, pp.pid
    having count(*) = 2
  ),
  best as (
    select t.hotel_id, t.day, t.fri,
           min(t.total) as best_cents,
           (array_agg(t.pid order by t.total, t.pid))[1] as best_pid,
           max(t.collected_at) as collected_at
      from tot t
     group by t.hotel_id, t.day, t.fri
  ),
  latest as (
    select distinct on (b.hotel_id, b.fri) b.*
      from best b
     where b.day >= p_today - 1
     order by b.hotel_id, b.fri, b.day desc
  ),
  cand as (
    select l.*, p.best_cents as prev_cents
      from latest l
      join best p on p.hotel_id = l.hotel_id and p.fri = l.fri and p.day = l.day - 1
     where l.best_cents <= p.best_cents * 0.85
       and p.best_cents - l.best_cents >= 5000
  ),
  hist as (
    select c.hotel_id, c.fri, min(o.best_cents) as prior_low, count(*)::integer as prior_days,
           round(avg(o.best_cents))::integer as prior_avg
      from cand c
      join best o on o.hotel_id = c.hotel_id and o.fri = c.fri
       and o.day < c.day and o.day >= c.day - 14
     group by c.hotel_id, c.fri
  ),
  reviewed as (
    select c.hotel_id, c.fri,
           count(*)::integer as offers,
           count(*) filter (where t.total <= c.best_cents * 1.10)::integer as near
      from cand c
      join tot t on t.hotel_id = c.hotel_id and t.fri = c.fri and t.day = c.day
     group by c.hotel_id, c.fri
  )
  select c.hotel_id, h.slug, h.name, ci.slug, ci.name_de, ci.name_en,
         c.fri, c.fri + 2, c.day, c.collected_at,
         c.best_cents, c.prev_cents,
         round((c.prev_cents - c.best_cents)::numeric / c.prev_cents, 4),
         hi.prior_low, hi.prior_days, hi.prior_avg,
         pr.slug, pr.name, pr.is_direct, r.offers,
         (r.near >= 2)
    from cand c
    join hist hi on hi.hotel_id = c.hotel_id and hi.fri = c.fri
    join reviewed r on r.hotel_id = c.hotel_id and r.fri = c.fri
    join public.hotels h on h.id = c.hotel_id
    join public.cities ci on ci.id = h.city_id
    join public.providers pr on pr.id = c.best_pid
   where c.best_cents < hi.prior_low
     and (c.best_cents >= c.prev_cents * 0.4 or r.near >= 2)
   order by (c.prev_cents - c.best_cents)::numeric / c.prev_cents desc, c.fri;
$$;

revoke all on function public.radar_weekend_drops(date) from public;
grant execute on function public.radar_weekend_drops(date) to anon, authenticated, service_role;
