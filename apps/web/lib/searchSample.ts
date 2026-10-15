import type { CatalogHotel } from '@/lib/data/catalog';

const c = (slug: string, de: string, en = de) => ({ slug, name: { de, en } });
const BERLIN = c('berlin', 'Berlin');
const MUENCHEN = c('muenchen', 'München', 'Munich');
const WIEN = c('wien', 'Wien', 'Vienna');
const ZUERICH = c('zuerich', 'Zürich', 'Zurich');
const PARIS = c('paris', 'Paris');
const LONDON = c('london', 'London');
const HAMBURG = c('hamburg', 'Hamburg');
const BARCELONA = c('barcelona', 'Barcelona');
const DUBAI = c('dubai', 'Dubai');

const h = (slug: string, name: string, city: CatalogHotel['city']): CatalogHotel => ({
  slug,
  name,
  city,
});

/**
 * Sample catalog for `/dev/search` (C-107): real slugs, so the thumbnails are the real photos;
 * Hamburg has no city photo and Dubai hotels no own photo, to show both fallbacks.
 */
export const SEARCH_SAMPLE: CatalogHotel[] = [
  h('hotel-adlon-kempinski-berlin', 'Hotel Adlon Kempinski', BERLIN),
  h('hotel-de-rome-berlin', 'Hotel de Rome', BERLIN),
  h('the-ritz-carlton-berlin', 'The Ritz-Carlton, Berlin', BERLIN),
  h('waldorf-astoria-berlin', 'Waldorf Astoria Berlin', BERLIN),
  h('hotel-bayerischer-hof-muenchen', 'Hotel Bayerischer Hof', MUENCHEN),
  h('mandarin-oriental-munich', 'Mandarin Oriental, Munich', MUENCHEN),
  h('rosewood-munich', 'Rosewood Munich', MUENCHEN),
  h('hotel-sacher-wien', 'Hotel Sacher Wien', WIEN),
  h('hotel-imperial-wien', 'Hotel Imperial', WIEN),
  h('palais-coburg-wien', 'Palais Coburg', WIEN),
  h('baur-au-lac-zuerich', 'Baur au Lac', ZUERICH),
  h('the-dolder-grand-zuerich', 'The Dolder Grand', ZUERICH),
  h('four-seasons-hotel-george-v-paris', 'Four Seasons Hotel George V', PARIS),
  h('le-bristol-paris', 'Le Bristol Paris', PARIS),
  h('claridges-london', "Claridge's", LONDON),
  h('the-savoy-london', 'The Savoy', LONDON),
  h('fairmont-hotel-vier-jahreszeiten-hamburg', 'Fairmont Hotel Vier Jahreszeiten', HAMBURG),
  h('the-fontenay-hamburg', 'The Fontenay', HAMBURG),
  h('hotel-arts-barcelona', 'Hotel Arts Barcelona', BARCELONA),
  h('burj-al-arab-dubai', 'Burj Al Arab Jumeirah', DUBAI),
  h('atlantis-the-royal-dubai', 'Atlantis The Royal', DUBAI),
];
