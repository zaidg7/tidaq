import type { ReactNode } from 'react';
import { Photo } from '@/components/ui/Photo';
import { cityPhoto, cityPhotoAsHotelPhoto } from '@/lib/cityPhotos';

type Props = { eyebrow: string; title: string; text: string; children: ReactNode };

/**
 * Shared layout of the 404, error and "prices unavailable" pages (mockup B hero language): the
 * homepage's rooftop photo full-bleed under the white navbar, and bottom-left a pill, the title,
 * one sentence and the way out. Calm, branded, never a dead end.
 */
export function StatusPage({ eyebrow, title, text, children }: Props) {
  const photo = cityPhoto('home-hero');
  return (
    <section data-photo-hero className="relative -mt-16 flex-1 lg:-mt-[76px]">
      <Photo
        photo={photo ? { ...cityPhotoAsHotelPhoto(photo), focus: '50% 70%' } : null}
        alt=""
        sizes="100vw"
        priority
        className="h-[max(560px,78dvh)] bg-[#2a2620] md:h-[max(620px,80dvh)]"
      >
        <div aria-hidden="true" className="hero-scrim absolute inset-0" />
        <div className="absolute inset-x-0 bottom-12 md:bottom-20">
          <div className="mx-auto max-w-[1240px] px-[18px] text-white md:px-10">
            <p className="hero-rise mb-3 text-[14px] font-semibold text-white/85 md:text-[15px]">
              {eyebrow}
            </p>
            <h1 className="hero-rise max-w-[760px] text-[40px] leading-[1.04] font-[650] tracking-[-0.04em] md:text-[64px] md:leading-[1.02]">
              {title}
            </h1>
            <p className="hero-rise-2 mt-3 max-w-[560px] text-[17px] leading-[1.45] text-white/92 md:mt-4 md:text-[20px]">
              {text}
            </p>
            <div className="hero-rise-3 mt-7 flex flex-wrap items-center gap-3">{children}</div>
          </div>
        </div>
      </Photo>
    </section>
  );
}
