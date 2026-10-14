-- C-070d: the first rule (under 60 % within 3 %) hid 11 of 35 hotels on a day whose stays and
-- nights were collected 7 hours apart; most had a median gap of 0 %, so the misses were noise.
-- Hide a hotel for a steady bias (|median| > 5 %) or when under 40 % match.
-- Per hotel over the 7 days up to p_day: unreliable with at least 10 pairs and either a median
-- signed gap beyond ±5 % (a steady bias: the chart's euros would be wrong) or fewer than 40 %
-- within 3 % (too noisy to read). Hotels without data don't appear: their night history is
-- shown (most hotels match exactly).
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
             sum(h.within_3)::numeric / sum(h.pairs) < 0.4
             or abs(percentile_cont(0.5) within group (order by h.median_signed_gap_pct)) > 5
           )
         )
  from public.night_accuracy_hotel h
  where h.day > p_day - 7
    and h.day <= p_day
    and (p_hotel_id is null or h.hotel_id = p_hotel_id)
  group by h.hotel_id;
$$;
