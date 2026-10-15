'use client';

import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { IconButton } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';

/**
 * A row of cards that moves one card per arrow click (C-131). Desktop shows three cards with
 * round arrow buttons on the photo's left and right edge; phones swipe (1.25 cards visible, no
 * arrows). It is a plain scrolling list with snap points, so trackpads, keyboards (Tab into a
 * card scrolls it into view) and screen readers get every card. An arrow is hidden at its end.
 */
export function Carousel({
  label,
  prevLabel,
  nextLabel,
  children,
  className,
}: {
  /** Names the list for screen readers ("Hotels in Deutschland"). */
  label: string;
  prevLabel: string;
  nextLabel: string;
  children: ReactNode;
  className?: string;
}) {
  const track = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setEdges({ start: el.scrollLeft <= 2, end: el.scrollLeft >= max - 2 });
  }, []);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure]);

  const move = (dir: 1 | -1) => {
    const el = track.current;
    const first = el?.firstElementChild as HTMLElement | null;
    if (!el || !first) return;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({ left: dir * (first.offsetWidth + gap), behavior: reduce ? 'auto' : 'smooth' });
  };

  // Vertically centred on the 4:3 photo of a third-wide card: (width − 2 gaps) / 3 × 3/8.
  const arrow =
    'absolute top-[calc((100cqw-48px)*0.125)] z-[2] -translate-y-1/2 border border-line bg-surface shadow-2 hover:bg-surface-2';

  return (
    <div className={cn('relative @container', className)}>
      <ul
        ref={track}
        aria-label={label}
        onScroll={measure}
        className="-mx-[18px] flex snap-x snap-mandatory scroll-px-[18px] gap-3 overflow-x-auto px-[18px] pb-2 [scrollbar-width:none] md:mx-0 md:scroll-px-0 md:gap-6 md:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {Children.map(children, (child) => (
          <li className="w-[78%] shrink-0 snap-start md:w-[calc((100%-48px)/3)]">{child}</li>
        ))}
      </ul>
      {/* Phones swipe: no arrows (a wrapper, since `cn` doesn't merge the button's display). */}
      <div className="hidden md:block">
        {!edges.start && (
          <IconButton
            label={prevLabel}
            onClick={() => move(-1)}
            className={cn(arrow, '-left-[22px]')}
          >
            <Icon icon={ChevronLeft} size={20} />
          </IconButton>
        )}
        {!edges.end && (
          <IconButton
            label={nextLabel}
            onClick={() => move(1)}
            className={cn(arrow, '-right-[22px]')}
          >
            <Icon icon={ChevronRight} size={20} />
          </IconButton>
        )}
      </div>
    </div>
  );
}
