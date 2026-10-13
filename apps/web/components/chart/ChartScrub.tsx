'use client';

import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';

export type ScrubPoint = {
  /** Position as fractions of the chart box (shared with the server SVG). */
  x: number;
  y: number;
  date: string;
  price: string;
  provider: string | null;
};

type Props = { points: ScrubPoint[]; label: string; lastIndex: number };

/**
 * The tooltip hugs the point: above it, or below it near the top edge; it shifts left or right
 * near the sides so it never leaves the chart.
 */
function tooltipStyle(p: ScrubPoint) {
  const x = p.x > 0.75 ? '-100%' : p.x < 0.25 ? '0%' : '-50%';
  const y = p.y < 0.35 ? '16px' : 'calc(-100% - 16px)';
  return { left: `${p.x * 100}%`, top: `${p.y * 100}%`, transform: `translate(${x}, ${y})` };
}

/**
 * Interaction layer over the server-rendered chart (CRAFT.md §3 Price chart): pointer and touch
 * scrub (vertical page scroll stays free via `touch-action: pan-y`), ←/→ by day, Home/End, a dark
 * tooltip and a live readout. It only positions in percent, so it fits both SVG sizes.
 */
export function ChartScrub({ points, label, lastIndex }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const [keyboard, setKeyboard] = useState(false);

  const nearest = (clientX: number) => {
    const rect = box.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return null;
    const fx = (clientX - rect.left) / rect.width;
    let best = 0;
    for (let i = 1; i < points.length; i++) {
      if (Math.abs((points[i]?.x ?? 0) - fx) < Math.abs((points[best]?.x ?? 0) - fx)) best = i;
    }
    return best;
  };

  const onPointer = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' || e.buttons > 0 || e.type === 'pointerdown') {
      setKeyboard(false);
      setActive(nearest(e.clientX));
    }
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const current = active ?? lastIndex;
    const next =
      e.key === 'ArrowLeft'
        ? Math.max(0, current - 1)
        : e.key === 'ArrowRight'
          ? Math.min(lastIndex, current + 1)
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? lastIndex
              : null;
    if (next === null) return;
    e.preventDefault();
    setKeyboard(true);
    setActive(next);
  };

  const point = active === null ? null : points[active];
  const readout = point
    ? `${point.date}: ${point.price}${point.provider ? `, ${point.provider}` : ''}`
    : '';

  return (
    <div
      ref={box}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={lastIndex}
      aria-valuenow={active ?? lastIndex}
      aria-valuetext={readout || undefined}
      className="absolute inset-0 cursor-crosshair touch-pan-y rounded-cell focus-visible:outline-offset-4"
      onPointerMove={onPointer}
      onPointerDown={onPointer}
      onPointerLeave={() => !keyboard && setActive(null)}
      onPointerUp={(e) => e.pointerType !== 'mouse' && setActive(null)}
      onPointerCancel={() => setActive(null)}
      onKeyDown={onKey}
      onBlur={() => setActive(null)}
    >
      {point && (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-[8%] bottom-[14%] w-px bg-line-strong"
            style={{ left: `${point.x * 100}%` }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-surface bg-accent shadow-float"
            style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute z-10 flex flex-col gap-0.5 rounded-[12px] bg-fg px-3 py-2.5 whitespace-nowrap text-white shadow-hover"
            style={tooltipStyle(point)}
          >
            <span className="text-[12px] font-semibold text-[#c9bef5]">{point.date}</span>
            <span className="text-[15px] leading-tight font-extrabold tabular-nums">
              {point.price}
            </span>
            {point.provider && <span className="text-[12px] text-white/80">{point.provider}</span>}
          </div>
        </>
      )}
      <span className="sr-only" aria-live="polite">
        {keyboard ? readout : ''}
      </span>
    </div>
  );
}
