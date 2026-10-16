-- C-157: a calibration that matched none of the city's hotels is tried again after a day, not a
-- week (an empty answer teaches nothing).
create or replace function public.calibration_due(p_today date, p_limit integer)
returns table (city_id integer, city_en text, anchor_hotel_id integer, check_in date, check_out date)
language sql stable security definer set search_path = '' as $$
  select ci.id, ci.name_en,
         (select min(h.id) from public.hotels h where h.city_id = ci.id and h.active),
         p_today + 21, p_today + 23
    from public.cities ci
    left join lateral (
      select c.status, c.posted_at, c.finished_at,
             exists (select 1 from public.price_calibration_points p where p.calibration_id = c.id) as has_points
        from public.price_calibrations c
       where c.city_id = ci.id order by c.posted_at desc limit 1
    ) last on true
   where exists (select 1 from public.hotels h where h.city_id = ci.id and h.active)
     and (last.status is null
          or (last.status = 'done' and last.has_points and last.posted_at < now() - interval '7 days')
          or (last.status = 'done' and not last.has_points and last.posted_at < now() - interval '1 day')
          or (last.status = 'posted' and last.posted_at < now() - interval '60 minutes')
          or (last.status = 'failed' and coalesce(last.finished_at, last.posted_at) < now() - interval '1 day'))
   order by last.posted_at nulls first, ci.id
   limit p_limit;
$$;
