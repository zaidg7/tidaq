-- C-153: Google Hotels ids on demand. 275 of 444 hotels have no `dfs_hotel_identifier`, so their
-- Price Drops can't get an exact quote (C-148). The collector looks a hotel up (DataForSEO Hotel
-- Searches in the hotel's own country, $0.0008, inside the quote budget guard) only when it has a
-- live-checked drop, matches the result by name and distance, and stores the id. One row per hotel
-- records the attempt so a hotel Google doesn't know is not paid for again for 14 days.
create table public.hotel_dfs_lookups (
  hotel_id integer primary key references public.hotels (id) on delete cascade,
  task_id text,
  posted_at timestamptz,
  status text not null default 'posted' check (status in ('posted', 'found', 'not_found', 'failed')),
  finished_at timestamptz,
  -- The first few search results (title, id, distance), for checking a miss by hand.
  candidates jsonb
);
alter table public.hotel_dfs_lookups enable row level security;
revoke all on public.hotel_dfs_lookups from anon, authenticated;
create index hotel_dfs_lookups_task_idx on public.hotel_dfs_lookups (task_id);

-- Hotels without a Google id that have a live-checked drop now (same trips as drop_quote_jobs),
-- not looked up yet, or a lookup that failed or never came back an hour ago, or not found 14 days
-- ago. Biggest drop first.
create or replace function public.dfs_lookup_jobs(p_today date, p_limit integer)
returns table (hotel_id integer, name text, city_en text, country_code text, lat double precision,
               lng double precision)
language sql
stable
security definer
set search_path = ''
as $$
  with latest as (
    select max(x.today) as today from public.trip_drops x
     where x.today <= p_today + 1 and x.today >= p_today - 1
  ),
  live as (
    select t.hotel_id, max(t.drop_pct) as drop_pct
      from public.trip_drops t
      join latest l on t.today = l.today
      join public.drop_checks c
        on c.hotel_id = t.hotel_id and c.night = t.night and c.check_out = t.check_out
       and c.provider_slug = t.provider_slug
     where t.night > p_today
       and c.live and c.checked_at > now() - interval '60 minutes'
     group by t.hotel_id
  )
  select h.id, h.name, ci.name_en, ci.country_code::text, h.lat, h.lng
    from live
    join public.hotels h on h.id = live.hotel_id
    join public.cities ci on ci.id = h.city_id
    left join public.hotel_dfs_lookups k on k.hotel_id = h.id
   where h.active
     and h.dfs_hotel_identifier is null
     and h.lat is not null and h.lng is not null
     and (k.hotel_id is null
          or (k.status in ('posted', 'failed') and k.posted_at < now() - interval '60 minutes')
          or (k.status = 'not_found' and k.finished_at < now() - interval '14 days'))
   order by live.drop_pct desc
   limit p_limit;
$$;
revoke all on function public.dfs_lookup_jobs(date, integer) from public, anon, authenticated;
grant execute on function public.dfs_lookup_jobs(date, integer) to service_role;

-- Lookups posted at least a minute ago and not collected yet, with what the match needs.
create or replace function public.dfs_lookup_pending(p_limit integer)
returns table (task_id text, hotel_id integer, name text, lat double precision,
               lng double precision, posted_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select k.task_id, h.id, h.name, h.lat, h.lng, k.posted_at
    from public.hotel_dfs_lookups k
    join public.hotels h on h.id = k.hotel_id
   where k.status = 'posted' and k.task_id is not null
     and k.posted_at < now() - interval '1 minute'
     and k.posted_at > now() - interval '60 minutes'
   order by k.posted_at
   limit p_limit;
$$;
revoke all on function public.dfs_lookup_pending(integer) from public, anon, authenticated;
grant execute on function public.dfs_lookup_pending(integer) to service_role;
