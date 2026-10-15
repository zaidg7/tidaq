import 'server-only';
import {
  dropCaption,
  dropDates,
  dropKey,
  dropPath,
  formatPrice,
  topCaption,
  type Platform,
} from '@tidaq/core';
import type { KitItem } from '@/components/admin/CreatorKit';
import { dropFacts } from '@/components/drops/DropPage';
import type { CoverText } from '@/components/drops/storyImage';
import type { HotelDropsWithPhoto } from '@/lib/data/drops';
import { hotelPhoto } from '@/lib/hotelPhotos';
import { markKey } from './posted';

/** Drops in the creator kit list. */
export const KIT_SIZE = 10;

/**
 * The creator kit's data (C-080c): today's biggest drops (one per hotel, its top night) with
 * their story texts and captions, plus the top-5 cover and caption. German only, like /admin.
 */
export async function creatorKit(
  drops: HotelDropsWithPhoto[],
  now: Date,
  /** Today's radar, or the week's recap (C-080h). */
  period: 'day' | 'week' = 'day',
  /** "Gepostet" marks of the last week (C-080j), keyed by `markKey`. */
  marks: ReadonlyMap<string, Platform[]> = new Map(),
) {
  const list = drops.slice(0, KIT_SIZE);
  const items: KitItem[] = await Promise.all(
    list.map(async (g) => {
      const d = g.top;
      const f = await dropFacts(g, d, 'de', now);
      return {
        key: `${g.hotel.slug}-${dropKey(d)}`,
        hotel: g.hotel.name,
        place: `${g.city.name.de} · ${d.nights > 1 ? 'Wochenende ' : ''}${dropDates(d, 'de')}`,
        pct: f.pct,
        prices: `${formatPrice(d.nowCents, 'de')} statt ${formatPrice(d.prevCents, 'de')}`,
        photo: g.image?.src ?? null,
        thumb: hotelPhoto(g.hotel.slug)?.[160].src ?? null,
        story: f.story,
        caption: dropCaption(g, d),
        path: dropPath(g.hotel.slug, d),
        fileName: `tidaq-${g.hotel.slug}-${dropKey(d)}`,
        mark: {
          slug: g.hotel.slug,
          key: dropKey(d),
          period,
          posted: marks.get(markKey(g.hotel.id, d)) ?? [],
        },
      };
    }),
  );
  const first = items[0];
  const firstDrop = list[0]?.top;
  if (!first || !firstDrop) return { items, top: null };
  const cover: CoverText = {
    eyebrow: period === 'week' ? 'Preisstürze der Woche' : 'Preisstürze seit gestern',
    title: `Top ${Math.min(5, items.length)} in Luxushotels`,
    rows: items.slice(0, 5).map((i) => ({ pct: i.pct, hotel: i.hotel, place: i.place })),
    asOf: first.story.asOf,
    url: first.story.url,
  };
  return {
    items,
    top: {
      caption: topCaption(list, period),
      cover,
      date: firstDrop.seenDay,
      heading: period === 'week' ? 'Top 5 der Woche' : 'Top 5 des Tages',
      filePrefix: period === 'week' ? 'tidaq-woche' : 'tidaq-top5',
    },
  };
}
