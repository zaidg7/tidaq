-- Night-sum accuracy (C-070c, D-42): how close the summed single nights come to the real price
-- of the same stay on the same platform, measured daily on every 2-adult stay we check for real.
-- The stay page shows history from summed nights (C-070b); this keeps that method honest.

create table public.night_accuracy (
  -- Collection day (UTC) compared, like stay_daily.day and night_daily.day.
  day date primary key,
  -- (stay, reviewed platform) pairs with a real price and every night priced on that platform.
  pairs integer not null check (pairs >= 0),
  -- Pairs whose night sum is within 0.5 %, 3 %, 10 % of the real price.
  within_05 integer not null check (within_05 >= 0),
  within_3 integer not null check (within_3 >= 0),
  within_10 integer not null check (within_10 >= 0),
  -- Median of |night sum − real| / real, in percent. Null without pairs.
  median_gap_pct numeric(6, 2),
  -- Stays with both a real best price and a best night sum; what the chart shows.
  stays integer not null check (stays >= 0),
  stays_within_3 integer not null check (stays_within_3 >= 0),
  -- Up to 5 hotels with the lowest share within 3 % (at least 4 pairs):
  -- [{ hotel_id, slug, name, pairs, within_3 }].
  worst jsonb not null default '[]',
  computed_at timestamptz not null default now()
);

-- Aggregates only; the methodology page (C-034) shows the 30-day share.
alter table public.night_accuracy enable row level security;
create policy "public read" on public.night_accuracy for select to anon, authenticated using (true);
grant select on public.night_accuracy to anon, authenticated;

-- Computes and stores one day (replacing an earlier result for it). The collector's daily check
-- calls it for yesterday, when both the real checks and the night grid are complete.
create or replace function public.night_accuracy_record(p_day date)
returns public.night_accuracy
language plpgsql
set search_path = ''
as $$
declare
  v_row public.night_accuracy;
begin
  with
  stays as (
    select ts.id as stay_id, ts.hotel_id, ts.check_in, ts.check_out,
           sd.per_provider, sd.best_cents
    from public.tracked_stays ts
    join public.stay_daily sd on sd.stay_id = ts.id and sd.day = p_day
    where ts.adults = 2
      and ts.check_out - ts.check_in between 1 and 30
  ),
  -- Night sums per stay and reviewed platform that priced every night of the stay that day.
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
  ),
  pairs as (
    select s.hotel_id,
           abs(n.cents - (e.value #>> '{}')::integer)::numeric
             / (e.value #>> '{}')::integer as gap
    from stays s
    cross join lateral jsonb_each(s.per_provider) as e
    join sums n on n.stay_id = s.stay_id and n.provider_id::text = e.key
    where e.key ~ '^[0-9]+$'
      and (e.value #>> '{}')::integer > 0
  ),
  best as (
    select abs(min(n.cents) - s.best_cents)::numeric / s.best_cents as gap
    from stays s
    join sums n on n.stay_id = s.stay_id
    where s.best_cents > 0
    group by s.stay_id, s.best_cents
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
    computed_at
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
    computed_at = excluded.computed_at
  returning * into v_row;
  return v_row;
end;
$$;

revoke all on function public.night_accuracy_record(date) from public, anon, authenticated;
grant execute on function public.night_accuracy_record(date) to service_role;
