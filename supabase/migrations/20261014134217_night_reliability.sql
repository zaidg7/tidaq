-- Night-sum reliability per hotel (C-070d). C-070c found hotels where the sum of single nights
-- is 15–25 % off the real price of the same stay every day (minimum stays, multi-night rates).
-- Their history must not come from summed nights; the stay page then shows real checks only.

-- One row per (day, hotel): the C-070c comparison split by hotel.
create table public.night_accuracy_hotel (
  day date not null,
  hotel_id integer not null references public.hotels (id),
  pairs integer not null check (pairs > 0),
  within_3 integer not null check (within_3 >= 0),
  -- Median of (night sum − real) / real in percent: + means single nights cost more.
  median_signed_gap_pct numeric(6, 2) not null,
  primary key (day, hotel_id)
);
create index night_accuracy_hotel_hotel_id_idx on public.night_accuracy_hotel (hotel_id);

alter table public.night_accuracy_hotel enable row level security;
create policy "public read" on public.night_accuracy_hotel
  for select to anon, authenticated using (true);
grant select on public.night_accuracy_hotel to anon, authenticated;

-- The day's share among hotels whose night history is shown: what the alarm watches.
alter table public.night_accuracy
  add column pairs_shown integer not null default 0 check (pairs_shown >= 0),
  add column within_3_shown integer not null default 0 check (within_3_shown >= 0);

-- Every (stay, reviewed platform) pair of a day: the real total and the sum of its nights
-- collected the same day (C-070c method, shared by the overall and per-hotel numbers).
create or replace function public.night_accuracy_pairs(p_day date)
returns table (stay_id bigint, hotel_id integer, provider_id integer, real_cents integer,
               nights_cents integer)
language sql
stable
set search_path = ''
as $$
  with
  stays as (
    select ts.id as stay_id, ts.hotel_id, ts.check_in, ts.check_out, sd.per_provider
    from public.tracked_stays ts
    join public.stay_daily sd on sd.stay_id = ts.id and sd.day = p_day
    where ts.adults = 2
      and ts.check_out - ts.check_in between 1 and 30
  ),
  sums as (
    select s.stay_id, e.key::integer as provider_id, sum((e.value #>> '{}')::integer) as cents
    from stays s
    join public.night_daily nd
      on nd.hotel_id = s.hotel_id and nd.adults = 2 and nd.day = p_day
     and nd.night >= s.check_in and nd.night < s.check_out
    cross join lateral jsonb_each(nd.per_provider) as e
    join public.providers pr on pr.id = e.key::integer and not pr.pending
    group by s.stay_id, s.check_in, s.check_out, e.key
    having count(*) = s.check_out - s.check_in
  )
  select s.stay_id, s.hotel_id, n.provider_id, (e.value #>> '{}')::integer, n.cents::integer
  from stays s
  cross join lateral jsonb_each(s.per_provider) as e
  join sums n on n.stay_id = s.stay_id and n.provider_id::text = e.key
  where e.key ~ '^[0-9]+$'
    and (e.value #>> '{}')::integer > 0;
$$;

-- Per hotel over the 7 days up to p_day: unreliable with at least 10 pairs and either fewer than
-- 60 % within 3 % or a median signed gap beyond ±5 % (a steady bias). Hotels without data
-- don't appear: their night history is shown (most hotels match exactly).
create or replace function public.night_reliability(p_day date, p_hotel_id integer default null)
returns table (hotel_id integer, pairs integer, within_3 integer, gap_pct numeric,
               reliable boolean)
language sql
stable
set search_path = ''
as $$
  select h.hotel_id,
         sum(h.pairs)::integer,
         sum(h.within_3)::integer,
         round(percentile_cont(0.5) within group (order by h.median_signed_gap_pct)::numeric, 2),
         not (
           sum(h.pairs) >= 10
           and (
             sum(h.within_3)::numeric / sum(h.pairs) < 0.6
             or abs(percentile_cont(0.5) within group (order by h.median_signed_gap_pct)) > 5
           )
         )
  from public.night_accuracy_hotel h
  where h.day > p_day - 7
    and h.day <= p_day
    and (p_hotel_id is null or h.hotel_id = p_hotel_id)
  group by h.hotel_id;
$$;

-- C-070c's function, now on night_accuracy_pairs, with per-hotel rows and the shown share.
create or replace function public.night_accuracy_record(p_day date)
returns public.night_accuracy
language plpgsql
set search_path = ''
as $$
declare
  v_row public.night_accuracy;
begin
  insert into public.night_accuracy_hotel as nh (
    day, hotel_id, pairs, within_3, median_signed_gap_pct
  )
  select p_day, p.hotel_id, count(*),
         count(*) filter (where abs(p.nights_cents - p.real_cents) <= p.real_cents * 0.03),
         round((percentile_cont(0.5) within group (
           order by (p.nights_cents - p.real_cents)::numeric / p.real_cents) * 100)::numeric, 2)
  from public.night_accuracy_pairs(p_day) p
  group by p.hotel_id
  on conflict (day, hotel_id) do update set
    pairs = excluded.pairs,
    within_3 = excluded.within_3,
    median_signed_gap_pct = excluded.median_signed_gap_pct;

  with
  pairs as (
    select p.stay_id, p.hotel_id, p.nights_cents,
           abs(p.nights_cents - p.real_cents)::numeric / p.real_cents as gap
    from public.night_accuracy_pairs(p_day) p
  ),
  hidden as (
    select r.hotel_id from public.night_reliability(p_day) r where not r.reliable
  ),
  best as (
    select abs(min(n.cents) - sd.best_cents)::numeric / sd.best_cents as gap
    from (
      -- every reviewed platform's night sum, not only those with a real price
      select s.id as stay_id, e.key::integer as provider_id,
             sum((e.value #>> '{}')::integer) as cents
      from public.tracked_stays s
      join public.stay_daily sd2 on sd2.stay_id = s.id and sd2.day = p_day
      join public.night_daily nd
        on nd.hotel_id = s.hotel_id and nd.adults = 2 and nd.day = p_day
       and nd.night >= s.check_in and nd.night < s.check_out
      cross join lateral jsonb_each(nd.per_provider) as e
      join public.providers pr on pr.id = e.key::integer and not pr.pending
      where s.adults = 2 and s.check_out - s.check_in between 1 and 30
      group by s.id, s.check_in, s.check_out, e.key
      having count(*) = s.check_out - s.check_in
    ) n
    join public.stay_daily sd on sd.stay_id = n.stay_id and sd.day = p_day
    where sd.best_cents > 0
    group by n.stay_id, sd.best_cents
  ),
  hotels as (
    select p.hotel_id, count(*)::integer as pairs,
           count(*) filter (where p.gap <= 0.03)::integer as within_3
    from pairs p
    group by p.hotel_id
    having count(*) >= 4
  ),
  worst as (
    select coalesce(jsonb_agg(jsonb_build_object(
             'hotel_id', h.id, 'slug', h.slug, 'name', h.name,
             'pairs', x.pairs, 'within_3', x.within_3)
             order by x.within_3::numeric / x.pairs, x.pairs desc), '[]'::jsonb) as list
    from (
      select * from hotels
      order by within_3::numeric / pairs, pairs desc, hotel_id
      limit 5
    ) x
    join public.hotels h on h.id = x.hotel_id
    where x.within_3 < x.pairs
  )
  insert into public.night_accuracy as na (
    day, pairs, within_05, within_3, within_10, median_gap_pct, stays, stays_within_3, worst,
    pairs_shown, within_3_shown, computed_at
  )
  select p_day,
         (select count(*) from pairs),
         (select count(*) from pairs where gap <= 0.005),
         (select count(*) from pairs where gap <= 0.03),
         (select count(*) from pairs where gap <= 0.10),
         (select round((percentile_cont(0.5) within group (order by gap) * 100)::numeric, 2)
            from pairs),
         (select count(*) from best),
         (select count(*) from best where gap <= 0.03),
         (select list from worst),
         (select count(*) from pairs where hotel_id not in (select hotel_id from hidden)),
         (select count(*) from pairs
            where gap <= 0.03 and hotel_id not in (select hotel_id from hidden)),
         now()
  on conflict (day) do update set
    pairs = excluded.pairs,
    within_05 = excluded.within_05,
    within_3 = excluded.within_3,
    within_10 = excluded.within_10,
    median_gap_pct = excluded.median_gap_pct,
    stays = excluded.stays,
    stays_within_3 = excluded.stays_within_3,
    worst = excluded.worst,
    pairs_shown = excluded.pairs_shown,
    within_3_shown = excluded.within_3_shown,
    computed_at = excluded.computed_at
  returning * into v_row;
  return v_row;
end;
$$;

revoke all on function public.night_accuracy_pairs(date) from public, anon, authenticated;
grant execute on function public.night_accuracy_pairs(date) to service_role;
-- Reads only public tables; the stay page asks it for one hotel.
revoke all on function public.night_reliability(date, integer) from public;
grant execute on function public.night_reliability(date, integer)
  to anon, authenticated, service_role;
