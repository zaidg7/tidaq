-- C-034: public facts for the provider pages (/anbieter/[slug]) and the live numbers on
-- /methodik. Aggregates only: no notes, screenshots, testers or single tests leave the database
-- (trust_tests itself stays private). Reviewed providers only (pending ones are never public).
create or replace function public.provider_facts()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with prov as (
    select p.id, p.slug, p.name, p.is_direct
      from public.providers p
     where not p.pending
  ),
  latest as (
    -- Each active hotel's newest night-grid day of the last week (hotels run in batches); the
    -- grid then uses that day and the one before, like the hotel and city pages.
    select nd.hotel_id, max(nd.day) as day
      from public.night_daily nd
      join public.hotels h on h.id = nd.hotel_id and h.active
     where nd.adults = 2 and nd.day > current_date - 7
     group by nd.hotel_id
  ),
  nights as (
    select distinct on (nd.hotel_id, nd.night) nd.hotel_id, nd.night, nd.per_provider
      from public.night_daily nd
      join latest l on l.hotel_id = nd.hotel_id and nd.day >= l.day - 1
     where nd.adults = 2 and nd.night >= l.day
     order by nd.hotel_id, nd.night, nd.day desc
  ),
  priced as (
    -- One row per (hotel, night, reviewed provider) with a price.
    select n.hotel_id, n.night, p.id as provider_id, e.value::int as cents
      from nights n
      cross join lateral jsonb_each_text(n.per_provider) e
      join prov p on p.id = e.key::int
     where e.value::int > 0
  ),
  night_min as (
    select hotel_id, night, min(cents) as min_cents, count(*) as offers
      from priced
     group by hotel_id, night
  ),
  grid as (
    -- Per provider: hotels and nights priced; among nights with at least one other offer, how
    -- often it was the cheapest (ties count) and the median gap above the cheapest otherwise.
    select pr.provider_id,
           count(distinct pr.hotel_id) as hotels,
           count(*) as nights,
           count(*) filter (where m.offers > 1) as compared,
           count(*) filter (where m.offers > 1 and pr.cents = m.min_cents) as cheapest,
           percentile_cont(0.5) within group (order by (pr.cents - m.min_cents)::numeric / m.min_cents)
             filter (where m.offers > 1 and pr.cents > m.min_cents) as median_gap
      from priced pr
      join night_min m using (hotel_id, night)
     group by pr.provider_id
  ),
  tests as (
    select t.provider_id,
           count(*) as n,
           count(*) filter (where t.outcome = 'higher') as higher,
           count(*) filter (where t.outcome = 'lower') as lower,
           count(*) filter (where t.outcome = 'unavailable') as unavailable,
           min(t.tested_at at time zone 'Europe/Berlin')::date as first_test,
           max(t.tested_at at time zone 'Europe/Berlin')::date as last_test
      from public.trust_tests t
     group by t.provider_id
  ),
  extras as (
    select x.provider_id, jsonb_object_agg(x.extra, x.n) as counts
      from (
        select t.provider_id, e.extra, count(*) as n
          from public.trust_tests t
          cross join lateral unnest(t.extras) as e(extra)
         group by t.provider_id, e.extra
      ) x
     group by x.provider_id
  ),
  accuracy as (
    select count(*) as days,
           min(a.day) as since,
           coalesce(sum(a.pairs), 0) as pairs,
           coalesce(sum(a.within_3), 0) as within_3,
           coalesce(sum(a.stays), 0) as stays,
           coalesce(sum(a.stays_within_3), 0) as stays_within_3,
           percentile_cont(0.5) within group (order by a.median_gap_pct) as median_gap_pct
      from public.night_accuracy a
     where a.day > current_date - 30
  )
  select jsonb_build_object(
    'day', (select max(day) from latest),
    'hotels', (select count(*) from public.hotels where active),
    'cities', (select count(distinct city_id) from public.hotels where active),
    'nights', (select count(*) from night_min),
    'providers', coalesce((
      select jsonb_agg(jsonb_build_object(
               'slug', p.slug,
               'name', p.name,
               'is_direct', p.is_direct,
               'hotels', coalesce(g.hotels, 0),
               'nights', coalesce(g.nights, 0),
               'compared', coalesce(g.compared, 0),
               'cheapest', coalesce(g.cheapest, 0),
               'median_gap_pct', round(g.median_gap::numeric * 100, 1),
               'tests', coalesce(t.n, 0),
               'matches', coalesce(s.matches, 0),
               'higher', coalesce(t.higher, 0),
               'lower', coalesce(t.lower, 0),
               'unavailable', coalesce(t.unavailable, 0),
               'avg_markup_pct', s.avg_markup_pct,
               'score', s.score,
               'extras', coalesce(x.counts, '{}'::jsonb),
               'first_test', t.first_test,
               'last_test', t.last_test
             ) order by coalesce(g.nights, 0) desc, p.id)
        from prov p
        left join grid g on g.provider_id = p.id
        left join tests t on t.provider_id = p.id
        left join public.provider_scores s on s.provider_id = p.id
        left join extras x on x.provider_id = p.id
    ), '[]'::jsonb),
    'accuracy', (select to_jsonb(a) from accuracy a),
    'tests', jsonb_build_object(
      'n', (select coalesce(sum(n), 0) from tests),
      'providers', (select count(*) from tests),
      'last', (select max(last_test) from tests)
    )
  );
$$;

revoke all on function public.provider_facts() from public;
grant execute on function public.provider_facts() to anon, authenticated, service_role;
