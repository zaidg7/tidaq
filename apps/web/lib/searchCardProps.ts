import 'server-only';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@tidaq/core';

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
