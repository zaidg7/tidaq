import 'server-only';
import { dropCaption, dropPath, formatPrice, formatWeekdayDayMonth, topCaption } from '@tidaq/core';
import type { KitItem } from '@/components/admin/CreatorKit';
import { dropFacts } from '@/components/drops/DropPage';
import type { CoverText } from '@/components/drops/storyImage';
import type { HotelDropsWithPhoto } from '@/lib/data/drops';
import { hotelPhoto } from '@/lib/hotelPhotos';

/** Drops in the creator kit list. */
export const KIT_SIZE = 10;

/**
 * The creator kit's data (C-080c): today's biggest drops (one per hotel, its top night) with
 * their story texts and captions, plus the top-5 cover and caption. German only, like /admin.
 */
export async function creatorKit(drops: HotelDropsWithPhoto[], now: Date) {
  const list = drops.slice(0, KIT_SIZE);
  const items: KitItem[] = await Promise.all(
    list.map(async (g) => {
      const d = g.top;
      const f = await dropFacts(g, d, 'de', now);
      return {
        key: `${g.hotel.slug}-${d.night}`,
        hotel: g.hotel.name,
        place: `${g.city.name.de} · ${formatWeekdayDayMonth(d.night, 'de')}`,
        pct: f.pct,
        prices: `${formatPrice(d.nowCents, 'de')} statt ${formatPrice(d.prevCents, 'de')}`,
        photo: g.image?.src ?? null,
        thumb: hotelPhoto(g.hotel.slug)?.[160].src ?? null,
        story: f.story,
        caption: dropCaption(g, d),
        path: dropPath(g.hotel.slug, d.night),
        fileName: `tidaq-${g.hotel.slug}-${d.night}`,
      };
    }),
  );
  const first = items[0];
  const firstDrop = list[0]?.top;
  if (!first || !firstDrop) return { items, top: null };
  const cover: CoverText = {
    eyebrow: 'Preisstürze seit gestern',
    title: `Top ${Math.min(5, items.length)} in Luxushotels`,
    rows: items.slice(0, 5).map((i) => ({ pct: i.pct, hotel: i.hotel, place: i.place })),
    asOf: first.story.asOf,
    url: first.story.url,
  };
  return {
    items,
    top: { caption: topCaption(list), cover, date: firstDrop.seenDay },
  };
}
