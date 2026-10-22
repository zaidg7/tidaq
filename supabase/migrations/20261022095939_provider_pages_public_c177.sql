-- C-177: Trip.com and Agoda are only linked when we know the hotel's own page (a search by name
-- lands on an empty list there, Zaid 22 Oct). The website needs to know which hotels have one:
-- the pages are public facts (a hotel id on a booking site), so anon may read them.
grant select on public.hotel_provider_pages to anon, authenticated;
create policy "provider pages are public" on public.hotel_provider_pages
  for select to anon, authenticated using (true);

-- Every exact quote (C-148, Google Hotels) carries Trip.com's link with its hotel id: keep it,
-- so more hotels get a working Trip.com button with every quote. Never overwrites a known page.
create or replace function public.harvest_trip_pages()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.hotel_provider_pages (hotel_id, provider_id, page_ref)
  select distinct on (new.hotel_id) new.hotel_id, p.id, substring(o->>'url' from 'hotelid=([0-9]+)')
    from jsonb_array_elements(coalesce(new.offers, '[]'::jsonb)) o
    join public.providers p on p.slug = 'trip-com'
   where o->>'slug' = 'trip-com' and o->>'url' ~ 'hotelid=[0-9]+'
  on conflict (hotel_id, provider_id) do nothing;
  return new;
end;
$$;
revoke all on function public.harvest_trip_pages() from public, anon, authenticated;

create trigger drop_quotes_harvest_trip_pages
  after insert or update of offers on public.drop_quotes
  for each row execute function public.harvest_trip_pages();

-- The quotes we already have.
insert into public.hotel_provider_pages (hotel_id, provider_id, page_ref)
select distinct on (dq.hotel_id) dq.hotel_id, p.id, substring(o->>'url' from 'hotelid=([0-9]+)')
  from public.drop_quotes dq
  cross join lateral jsonb_array_elements(coalesce(dq.offers, '[]'::jsonb)) o
  join public.providers p on p.slug = 'trip-com'
 where o->>'slug' = 'trip-com' and o->>'url' ~ 'hotelid=[0-9]+'
 order by dq.hotel_id, dq.quoted_at desc
on conflict (hotel_id, provider_id) do nothing;
