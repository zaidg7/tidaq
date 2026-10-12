-- Seed data: the 12 launch cities (D-04) and the core booking providers with aliases.
-- Idempotent: re-running changes nothing. Provider aliases are refined in C-010/C-014
-- once the real DataForSEO source names are known.

insert into public.cities (slug, name_de, name_en, country_code) values
  ('berlin', 'Berlin', 'Berlin', 'DE'),
  ('muenchen', 'München', 'Munich', 'DE'),
  ('hamburg', 'Hamburg', 'Hamburg', 'DE'),
  ('frankfurt', 'Frankfurt am Main', 'Frankfurt', 'DE'),
  ('wien', 'Wien', 'Vienna', 'AT'),
  ('zuerich', 'Zürich', 'Zurich', 'CH'),
  ('paris', 'Paris', 'Paris', 'FR'),
  ('london', 'London', 'London', 'GB'),
  ('mailand', 'Mailand', 'Milan', 'IT'),
  ('rom', 'Rom', 'Rome', 'IT'),
  ('barcelona', 'Barcelona', 'Barcelona', 'ES'),
  ('amsterdam', 'Amsterdam', 'Amsterdam', 'NL')
on conflict (slug) do nothing;

insert into public.providers (slug, name, domain, is_direct) values
  ('booking-com', 'Booking.com', 'booking.com', false),
  ('expedia', 'Expedia', 'expedia.de', false),
  ('hotels-com', 'Hotels.com', 'hotels.com', false),
  ('trip-com', 'Trip.com', 'trip.com', false),
  ('agoda', 'Agoda', 'agoda.com', false),
  ('hrs', 'HRS', 'hrs.de', false),
  ('check24', 'CHECK24', 'check24.de', false),
  ('hotel-direct', 'Hotel direkt', null, true)
on conflict (slug) do nothing;

insert into public.provider_aliases (alias, provider_id)
select a.alias, p.id
from (values
  ('booking.com', 'booking-com'),
  ('booking', 'booking-com'),
  ('expedia', 'expedia'),
  ('expedia.de', 'expedia'),
  ('expedia.com', 'expedia'),
  ('hotels.com', 'hotels-com'),
  ('trip.com', 'trip-com'),
  ('agoda', 'agoda'),
  ('agoda.com', 'agoda'),
  ('hrs', 'hrs'),
  ('hrs.de', 'hrs'),
  ('hrs.com', 'hrs'),
  ('check24', 'check24'),
  ('check24.de', 'check24'),
  ('official site', 'hotel-direct'),
  ('offizielle website', 'hotel-direct'),
  ('hotel website', 'hotel-direct')
) as a (alias, provider_slug)
join public.providers p on p.slug = a.provider_slug
on conflict (alias) do nothing;
