-- C-153: a lookup that failed (DataForSEO error, not "no results") is retried after a day, not
-- an hour, so a hotel Google can't answer for doesn't cost a task every hour.
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
          or (k.status = 'posted' and k.posted_at < now() - interval '60 minutes')
          or (k.status = 'failed' and k.finished_at < now() - interval '1 day')
          or (k.status = 'not_found' and k.finished_at < now() - interval '14 days'))
   order by live.drop_pct desc
   limit p_limit;
$$;
