import type { ReactNode } from 'react';
import { Photo } from '@/components/ui/Photo';
import type { HotelPhoto } from '@/lib/hotelPhotos';

/**
 * A page that opens on its hotel's photo (mockup B drop page; also the hotel and stay pages): the
 * photo full-bleed under the white navbar (`data-photo-hero`), then the page's content on a sheet
 * that slides up over the photo's bottom edge with rounded top corners. `tag` (photo credit or
 * "Stadtbild") sits above the sheet's overlap.
 */
export function PhotoSheet({
  photo,
  alt,
  tag,
  children,
}: {
  photo: HotelPhoto | null;
  alt: string;
  tag?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <div data-photo-hero className="relative -mt-16 lg:-mt-[76px]">
        <Photo
          photo={photo}
          alt={alt}
          sizes="100vw"
          priority
          className="h-[400px] bg-[#2a2620] md:h-[480px] lg:h-[540px]"
        >
          <span
            aria-hidden="true"
            className="absolute inset-0 bg-[linear-gradient(180deg,rgba(14,12,18,0.45)_0%,rgba(14,12,18,0)_32%)]"
          />
          {/* Above the sheet's overlap (28 px phones, 48 px wider). */}
          {tag && (
            <span className="absolute right-3.5 bottom-10 z-10 inline-flex h-5 max-w-[calc(100%-28px)] items-center truncate rounded-tag bg-[rgba(21,19,28,0.55)] px-2 text-[10px] text-white md:right-10 md:bottom-16 md:text-[11px]">
              {tag}
            </span>
          )}
        </Photo>
      </div>
      <div className="photo-sheet relative -mt-7 bg-bg md:-mt-12">{children}</div>
    </>
  );
}
