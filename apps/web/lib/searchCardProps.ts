import 'server-only';
import { getTranslations } from 'next-intl/server';
import { cityIn, cityPath, localizedPath, type Locale } from '@tidaq/core';
import type { SearchHotel } from '@/components/home/SearchCard';
import type { CatalogHotel } from '@/lib/data/catalog';

/**
 * The translated strings and guest options for `SearchCard` (a client component without
 * next-intl hooks, to keep the browser bundle small). Shared by the homepage and /dev/ui.
 */
export async function searchCardProps(locale: Locale) {
  const ts = await getTranslations({ locale, namespace: 'search' });
  return {
    guestOptions: [1, 2, 3, 4].map((n) => ts('adults', { n })),
    labels: {
      label: ts('label'),
      hotel: ts('hotel'),
      combobox: {
        placeholder: ts('hotelSearchPlaceholder'),
        noMatch: ts('noMatch'),
        resultsOne: ts('resultsOne'),
        resultsOther: ts('resultsOther', { n: '{n}' }),
        clear: ts('clear'),
        listLabel: ts('listLabel'),
      },
      picker: {
        title: ts('picker.title'),
        close: ts('picker.close'),
        prevMonth: ts('picker.prevMonth'),
        nextMonth: ts('picker.nextMonth'),
        chooseIn: ts('picker.chooseIn'),
        chooseOut: ts('picker.chooseOut'),
        done: ts('picker.done'),
        clear: ts('picker.clear'),
        today: ts('picker.today'),
        checkIn: ts('checkIn'),
        checkOut: ts('checkOut'),
        nightsOne: ts('nightsOne'),
        nightsOther: ts('nightsOther', { n: '{n}' }),
      },
      checkIn: ts('checkIn'),
      checkOut: ts('checkOut'),
      datePlaceholder: ts('datePlaceholder'),
      guests: ts('guests'),
      submit: ts('submit'),
      note: ts('note'),
      nightsOne: ts('nightsOne'),
      nightsOther: ts('nightsOther', { n: '{n}' }),
      hotelMissing: ts('hotelMissing'),
      datesMissing: ts('datesMissing'),
      order: ts('order'),
      tooLong: ts('tooLong'),
      past: ts('past'),
    },
  };
}

/**
 * The search card's hotel list in the page language, each with its city page link and the
 * "Alle Hotels in …" label for the combobox's city option (C-024b).
 */
export async function searchHotels(
  hotels: readonly CatalogHotel[],
  locale: Locale,
): Promise<SearchHotel[]> {
  const ts = await getTranslations({ locale, namespace: 'search' });
  return hotels.map((h) => {
    const city = h.city.name[locale];
    return {
      slug: h.slug,
      name: h.name,
      city,
      cityHref: localizedPath(cityPath(h.city.slug), locale),
      cityAll: ts('cityAll', { where: cityIn(h.city.slug, city, locale) }),
    };
  });
}
