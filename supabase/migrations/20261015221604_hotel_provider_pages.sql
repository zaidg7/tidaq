-- C-133: partner links open the hotel's own page with the dates filled in. Searching Agoda or
-- Trip.com by name doesn't fill in hotel and dates (Zaid, 15 Oct; Booking.com's search does), so
-- we keep each hotel's page on those sites: Agoda's page path, Trip.com's hotel id. Found by web
-- search (search results only, never by opening those sites, hard rule 2). Hotels without an
-- entry keep the search link. Only outbound_click reads the table (RLS on, no policy).
create table public.hotel_provider_pages (
  hotel_id integer not null references public.hotels (id) on delete cascade,
  provider_id integer not null references public.providers (id) on delete cascade,
  page_ref text not null check (page_ref ~ '^([0-9]+|[a-z0-9_-]+/hotel/[a-z0-9-]+\.html)$'),
  primary key (hotel_id, provider_id)
);
alter table public.hotel_provider_pages enable row level security;
revoke all on public.hotel_provider_pages from anon, authenticated;

insert into public.hotel_provider_pages (hotel_id, provider_id, page_ref)
select h.id, p.id, v.page_ref
  from (values
    ('emirates-palace-mandarin-oriental-abu-dhabi', 'agoda', 'emirates-palace-hotel/hotel/abu-dhabi-ae.html'),
    ('emirates-palace-mandarin-oriental-abu-dhabi', 'trip-com', '757387'),
    ('four-seasons-hotel-abu-dhabi-at-al-maryah-island', 'agoda', 'four-seasons-hotel-abu-dhabi-at-al-maryah-island/hotel/abu-dhabi-ae.html'),
    ('four-seasons-hotel-abu-dhabi-at-al-maryah-island', 'trip-com', '5006795'),
    ('rosewood-abu-dhabi', 'agoda', 'rosewood-hotel-abu-dhabi/hotel/abu-dhabi-ae.html'),
    ('rosewood-abu-dhabi', 'trip-com', '981897'),
    ('the-abu-dhabi-edition', 'trip-com', '23101374'),
    ('the-st-regis-saadiyat-island-resort-abu-dhabi', 'agoda', 'the-st-regis-saadiyat-island-resort-abu-dhabi_10/hotel/abu-dhabi-ae.html'),
    ('the-st-regis-saadiyat-island-resort-abu-dhabi', 'trip-com', '2205169'),
    ('intercontinental-amstel-amsterdam', 'agoda', 'intercontinental-amstel-amsterdam/hotel/amsterdam-nl.html'),
    ('intercontinental-amstel-amsterdam', 'trip-com', '2156353'),
    ('mandarin-oriental-conservatorium-amsterdam', 'trip-com', '2148239'),
    ('waldorf-astoria-amsterdam', 'agoda', 'waldorf-astoria-amsterdam/hotel/amsterdam-nl.html'),
    ('waldorf-astoria-amsterdam', 'trip-com', '2198842'),
    ('capella-bangkok', 'trip-com', '35898426'),
    ('four-seasons-hotel-bangkok-at-chao-phraya-river', 'agoda', 'four-seasons-hotel-bangkok-at-chao-praya-river/hotel/bangkok-th.html'),
    ('four-seasons-hotel-bangkok-at-chao-phraya-river', 'trip-com', '48004058'),
    ('the-siam-bangkok', 'agoda', 'the-siam-hotel/hotel/bangkok-th.html'),
    ('the-siam-bangkok', 'trip-com', '703049'),
    ('hotel-arts-barcelona', 'agoda', 'hotel-arts-barcelona/hotel/barcelona-es.html'),
    ('hotel-arts-barcelona', 'trip-com', '2192934'),
    ('majestic-hotel-spa-barcelona', 'agoda', 'majestic-hotel-spa-barcelona/hotel/barcelona-es.html'),
    ('majestic-hotel-spa-barcelona', 'trip-com', '2134040'),
    ('mandarin-oriental-barcelona', 'trip-com', '2199128'),
    ('hotel-adlon-kempinski-berlin', 'agoda', 'hotel-adlon-kempinski/hotel/berlin-de.html'),
    ('hotel-adlon-kempinski-berlin', 'trip-com', '1587250'),
    ('the-ritz-carlton-berlin', 'agoda', 'the-ritz-carlton-berlin/hotel/berlin-de.html'),
    ('the-ritz-carlton-berlin', 'trip-com', '2133835'),
    ('waldorf-astoria-berlin', 'agoda', 'waldorf-astoria-berlin-hotel/hotel/berlin-de.html'),
    ('waldorf-astoria-berlin', 'trip-com', '1904040'),
    ('bvlgari-resort-dubai', 'agoda', 'bulgari-resort-dubai/hotel/dubai-ae.html'),
    ('bvlgari-resort-dubai', 'trip-com', '13752817'),
    ('four-seasons-resort-dubai-at-jumeirah-beach', 'agoda', 'four-seasons-resort-dubai-at-jumeirah-beach/hotel/dubai-ae.html'),
    ('four-seasons-resort-dubai-at-jumeirah-beach', 'trip-com', '1778281'),
    ('mandarin-oriental-jumeira-dubai', 'agoda', 'mandarin-oriental-jumeira-dubai/hotel/dubai-ae.html'),
    ('mandarin-oriental-jumeira-dubai', 'trip-com', '23884107'),
    ('sofitel-frankfurt-opera', 'trip-com', '7382708'),
    ('steigenberger-icon-frankfurter-hof-frankfurt', 'agoda', 'steigenberger-frankfurter-hof/hotel/frankfurt-am-main-de.html'),
    ('steigenberger-icon-frankfurter-hof-frankfurt', 'trip-com', '718372'),
    ('the-florentin-frankfurt', 'trip-com', '132822175'),
    ('fairmont-hotel-vier-jahreszeiten-hamburg', 'trip-com', '1477251'),
    ('hotel-atlantic-hamburg', 'agoda', 'atlantic-kempinski-hotel/hotel/hamburg-de.html'),
    ('hotel-atlantic-hamburg', 'trip-com', '1583339'),
    ('the-fontenay-hamburg', 'trip-com', '15858523'),
    ('mandarin-oriental-hong-kong', 'agoda', 'mandarin-oriental-hong-kong_10/hotel/hong-kong-hk.html'),
    ('mandarin-oriental-hong-kong', 'trip-com', '344946'),
    ('rosewood-hong-kong', 'agoda', 'rosewood-hong-kong/hotel/hong-kong-hk.html'),
    ('rosewood-hong-kong', 'trip-com', '25831219'),
    ('upper-house-hong-kong', 'agoda', 'the-upper-house/hotel/hong-kong-hk.html'),
    ('upper-house-hong-kong', 'trip-com', '436863'),
    ('four-seasons-hotel-istanbul-at-sultanahmet', 'trip-com', '2198755'),
    ('mandarin-oriental-bosphorus-istanbul', 'trip-com', '69211830'),
    ('the-peninsula-istanbul', 'trip-com', '112025256'),
    ('bairro-alto-hotel-lissabon', 'agoda', 'bairro-alto-hotel/hotel/lisbon-pt.html'),
    ('bairro-alto-hotel-lissabon', 'trip-com', '2564804'),
    ('four-seasons-hotel-ritz-lisbon', 'trip-com', '1579991'),
    ('the-ivens-lissabon', 'trip-com', '58419929'),
    ('claridges-london', 'agoda', 'claridge-s-hotel/hotel/london-gb.html'),
    ('claridges-london', 'trip-com', '2386986'),
    ('the-ritz-london', 'trip-com', '732250'),
    ('the-savoy-london', 'agoda', 'the-savoy-hotel/hotel/london-gb.html'),
    ('the-savoy-london', 'trip-com', '732248'),
    ('hotel-bel-air-los-angeles', 'agoda', 'hotel-bel-air/hotel/los-angeles-ca-us.html'),
    ('hotel-bel-air-los-angeles', 'trip-com', '2259101'),
    ('the-beverly-hills-hotel-los-angeles', 'trip-com', '2193653'),
    ('the-peninsula-beverly-hills-los-angeles', 'trip-com', '1000813'),
    ('four-seasons-hotel-madrid', 'agoda', 'four-seasons-hotel-madrid/hotel/madrid-es.html'),
    ('four-seasons-hotel-madrid', 'trip-com', '53260591'),
    ('mandarin-oriental-ritz-madrid', 'agoda', 'hotel-ritz-madrid/hotel/madrid-es.html'),
    ('mandarin-oriental-ritz-madrid', 'trip-com', '3682769'),
    ('santo-mauro-madrid', 'trip-com', '2171908'),
    ('cheval-blanc-randheli-malediven', 'agoda', 'cheval-blanc-randheli/hotel/maldives-islands-mv.html'),
    ('cheval-blanc-randheli-malediven', 'trip-com', '3689909'),
    ('the-ritz-carlton-maldives-fari-islands', 'agoda', 'the-ritz-carlton-maldives-fari-islands/hotel/male-city-and-airport-mv.html'),
    ('the-ritz-carlton-maldives-fari-islands', 'trip-com', '68343821'),
    ('waldorf-astoria-maldives-ithaafushi', 'trip-com', '27009071'),
    ('1-hotel-south-beach-miami', 'trip-com', '3164902'),
    ('faena-miami-beach', 'agoda', 'faena-hotel-miami-beach_8/hotel/miami-beach-fl-us.html'),
    ('faena-miami-beach', 'trip-com', '4591950'),
    ('the-setai-miami-beach', 'trip-com', '3041326'),
    ('bulgari-hotel-milano', 'agoda', 'bulgari-hotel-milano/hotel/milan-it.html'),
    ('bulgari-hotel-milano', 'trip-com', '2256623'),
    ('mandarin-oriental-milan', 'trip-com', '2950075'),
    ('park-hyatt-milano', 'trip-com', '2149991'),
    ('hotel-bayerischer-hof-muenchen', 'agoda', 'hotel-bayerischer-hof/hotel/munich-de.html'),
    ('hotel-bayerischer-hof-muenchen', 'trip-com', '2102483'),
    ('mandarin-oriental-munich', 'agoda', 'mandarin-oriental-munich_5/hotel/munich-de.html'),
    ('mandarin-oriental-munich', 'trip-com', '2199130'),
    ('rosewood-munich', 'trip-com', '109945715'),
    ('four-seasons-hotel-new-york', 'trip-com', '2174081'),
    ('lowell-hotel-new-york', 'trip-com', '2870267'),
    ('the-ritz-carlton-new-york-central-park', 'agoda', 'the-ritz-carlton-new-york-central-park_3/hotel/new-york-ny-us.html'),
    ('the-ritz-carlton-new-york-central-park', 'trip-com', '2140146'),
    ('four-seasons-hotel-george-v-paris', 'trip-com', '2143312'),
    ('le-bristol-paris', 'trip-com', '3061386'),
    ('shangri-la-paris', 'agoda', 'shangri-la-hotel-paris/hotel/paris-fr.html'),
    ('shangri-la-paris', 'trip-com', '730333'),
    ('hotel-de-russie-rom', 'trip-com', '2139070'),
    ('hotel-eden-rom', 'trip-com', '2069808'),
    ('hotel-hassler-roma', 'trip-com', '2158519'),
    ('bvlgari-hotel-shanghai', 'trip-com', '18026393'),
    ('the-peninsula-shanghai', 'agoda', 'the-peninsula-shanghai/hotel/shanghai-cn.html'),
    ('the-peninsula-shanghai', 'trip-com', '346393'),
    ('the-shanghai-edition', 'agoda', 'the-shanghai-edition/hotel/shanghai-cn.html'),
    ('the-shanghai-edition', 'trip-com', '17382203'),
    ('marina-bay-sands-singapur', 'agoda', 'marina-bay-sands/hotel/singapore-sg.html'),
    ('marina-bay-sands-singapur', 'trip-com', '687592'),
    ('raffles-sentosa-singapore', 'trip-com', '126250769'),
    ('raffles-singapore', 'trip-com', '687474'),
    ('crown-sydney', 'trip-com', '96122662'),
    ('park-hyatt-sydney', 'trip-com', '734386'),
    ('pullman-quay-grand-sydney-harbour', 'agoda', 'pullman-quay-grand-sydney-harbour/hotel/sydney-au.html'),
    ('pullman-quay-grand-sydney-harbour', 'trip-com', '2195134'),
    ('aman-tokyo', 'trip-com', '2479231'),
    ('four-seasons-hotel-tokyo-at-otemachi', 'agoda', 'four-seasons-hotel-tokyo-at-otemachi/hotel/tokyo-jp.html'),
    ('four-seasons-hotel-tokyo-at-otemachi', 'trip-com', '50988664'),
    ('park-hyatt-tokyo', 'trip-com', '993514'),
    ('hotel-sacher-wien', 'agoda', 'hotel-sacher/hotel/vienna-at.html'),
    ('hotel-sacher-wien', 'trip-com', '2170792'),
    ('palais-coburg-wien', 'trip-com', '1911050')
  ) as v (hotel_slug, provider_slug, page_ref)
  join public.hotels h on h.slug = v.hotel_slug
  join public.providers p on p.slug = v.provider_slug;

-- outbound_click (C-026) also returns the hotel's page on this provider, if we know it.
create or replace function public.outbound_click(
  p_provider text,
  p_hotel text,
  p_check_in date,
  p_check_out date,
  p_adults integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- Keep in line with core STAY_LIMITS / ADULTS (C-021b, C-022a).
  c_max_nights constant integer := 30;
  c_max_days_ahead constant integer := 365;
  -- Abuse guard: beyond this many logged clicks per German day the redirect still works, it just
  -- isn't counted, so a bot can't fill the events table.
  c_daily_events constant integer := 5000;
  v_today date := (now() at time zone 'Europe/Berlin')::date;
  v_provider record;
  v_hotel record;
  v_page text;
begin
  if p_provider is null or p_hotel is null or p_check_in is null or p_check_out is null
     or p_adults is null
     or p_adults not between 1 and 4
     or p_check_out <= p_check_in
     or p_check_out - p_check_in > c_max_nights
     or p_check_in < v_today
     or p_check_out > v_today + c_max_days_ahead then
    return null;
  end if;

  select p.id, p.slug, p.is_direct, p.affiliate_template into v_provider
    from public.providers p
   where p.slug = p_provider and not p.pending;
  if not found then
    return null;
  end if;

  select h.id, h.slug, h.name, h.official_url, c.name_en as city into v_hotel
    from public.hotels h
    join public.cities c on c.id = h.city_id
   where h.slug = p_hotel;
  if not found then
    return null;
  end if;

  select pp.page_ref into v_page
    from public.hotel_provider_pages pp
   where pp.hotel_id = v_hotel.id and pp.provider_id = v_provider.id;

  if (select count(*) from public.events e
       where e.name = 'outbound_click'
         and e.at >= (v_today::timestamp at time zone 'Europe/Berlin')) < c_daily_events then
    insert into public.events (name, props)
    values ('outbound_click', jsonb_build_object(
      'provider', v_provider.slug,
      'hotel', v_hotel.slug,
      'check_in', p_check_in,
      'check_out', p_check_out,
      'adults', p_adults
    ));
  end if;

  return jsonb_build_object(
    'provider', jsonb_build_object(
      'slug', v_provider.slug,
      'is_direct', v_provider.is_direct,
      'affiliate_template', v_provider.affiliate_template
    ),
    'hotel', jsonb_build_object(
      'name', v_hotel.name,
      'city', v_hotel.city,
      'official_url', v_hotel.official_url,
      'page', v_page
    )
  );
end;
$$;
