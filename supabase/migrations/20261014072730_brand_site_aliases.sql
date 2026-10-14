-- Xotelo names some hotels' own websites by brand. "Bvlgari" (Bvlgari Hotel Paris) and the full
-- "Preferred Hotels & Resorts" came in as pending providers on 13/14 Oct: point their aliases at
-- hotel-direct so the next runs count them as the hotel's site. Past snapshots stay as they are.
insert into public.provider_aliases (alias, provider_id)
select a.alias, p.id
  from (values ('bvlgari'), ('preferred hotels & resorts')) as a (alias)
  cross join public.providers p
 where p.slug = 'hotel-direct'
on conflict (alias) do update set provider_id = excluded.provider_id;
