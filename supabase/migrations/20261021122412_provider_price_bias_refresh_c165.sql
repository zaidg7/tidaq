-- C-165: fills provider_price_bias from exact quotes (drop_quotes) and the live check closest in
-- time (drop_checks, within 6 hours). Run by hand only; see the note in the previous migration.
create or replace function public.refresh_provider_price_bias()
returns void
language sql
security definer
set search_path = ''
as $fn$
  with f as (select hf.hotel_id, hf.factor from public.hotel_price_factors() hf),
  q as (
    select dq.hotel_id, dq.night, dq.check_out, dq.quoted_at, o ->> 'slug' as slug,
           (o ->> 'total_cents')::numeric as exact
      from public.drop_quotes dq
      cross join lateral jsonb_array_elements(
        case when jsonb_typeof(dq.offers) = 'array' then dq.offers else '[]'::jsonb end
      ) o
     where dq.quoted_at > now() - interval '14 days'
       and (o ->> 'total_cents') is not null
  ),
  r as (
    select q.slug, q.exact / (c.cents * f.factor) as ratio
      from q
      join f on f.hotel_id = q.hotel_id
      join lateral (
        select dc.cents, dc.checked_at
          from public.drop_checks dc
         where dc.hotel_id = q.hotel_id and dc.night = q.night and dc.check_out = q.check_out
           and dc.provider_slug = q.slug and dc.cents > 0
         order by abs(extract(epoch from dc.checked_at - q.quoted_at))
         limit 1
      ) c on true
     where abs(extract(epoch from c.checked_at - q.quoted_at)) < 6 * 3600
  ),
  fresh as (
    select p.id as provider_id,
           least(1.40, greatest(0.85, round((percentile_cont(0.5) within group (order by r.ratio))::numeric, 4))) as bias,
           count(*)::integer as samples
      from r
      join public.providers p on p.slug = r.slug
     where r.ratio between 0.7 and 1.6
     group by p.id
    having count(*) >= 8
  ),
  gone as (
    delete from public.provider_price_bias b
     where not exists (select 1 from fresh x where x.provider_id = b.provider_id)
  )
  insert into public.provider_price_bias (provider_id, bias, samples, updated_at)
  select x.provider_id, x.bias, x.samples, now() from fresh x
  on conflict (provider_id) do update
    set bias = excluded.bias, samples = excluded.samples, updated_at = excluded.updated_at;
$fn$;
revoke all on function public.refresh_provider_price_bias() from public, anon, authenticated;
grant execute on function public.refresh_provider_price_bias() to service_role;
