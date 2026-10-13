'use client';

import { useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';

/** One calendar day of the chart; `price` is null on days without data. */
export type ScrubDay = {
  /** Position as fractions of the plot box (shared with the server SVG). */
  x: number;
  y: number | null;
  date: string;
  cents: number | null;
  price: string | null;
  provider: string | null;
};

type Props = {
  days: ScrubDay[];
  /** The day shown at rest (the latest price). */
  restIndex: number;
  labels: { slider: string; noPrice: string; today: string | null };
};

/** Fired on the chart while scrubbing (detail = the day) and on release (detail = null). */
export const CHART_SCRUB_EVENT = 'tidaq:chartscrub';
export type ChartScrubDetail = { date: string; cents: number | null } | null;

/** Horizontal travel before a touch counts as scrubbing (vertical scroll stays free). */
const TOUCH_THRESHOLD = 8;

/**
 * Interaction layer over the server-rendered chart (CRAFT.md §3 Price chart). Steps by calendar
 * day, so gaps stay visible ("kein Preis"). Mouse: hover. Touch: scrub after 8 px of horizontal
 * travel, snaps back on release. Keyboard: ←/→ day, PageUp/PageDown week, Home/End, Esc.
 * The readout chip sits in the reserved row above the plot, so it never covers the data.
 */
export function ChartScrub({ days, restIndex, labels }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const chip = useRef<HTMLDivElement>(null);
  const touch = useRef<{ x: number; y: number; scrubbing: boolean } | null>(null);
  const [active, setActive] = useState<number | null>(null);
  const [focused, setFocused] = useState(false);
  const [touchScrub, setTouchScrub] = useState(false);
  const [chipLeft, setChipLeft] = useState(0);

  const describe = (i: number) => {
    const d = days[i];
    if (!d) return '';
    if (!d.price) return `${d.date}: ${labels.noPrice}`;
    const today = i === restIndex && labels.today ? `, ${labels.today}` : '';
    return `${d.date}: ${d.price}${d.provider ? `, ${d.provider}` : ''}${today}`;
  };

  const select = (i: number | null) => {
    setActive(i);
    const d = i === null ? null : days[i];
    const detail: ChartScrubDetail = d ? { date: d.date, cents: d.cents } : null;
    box.current?.dispatchEvent(new CustomEvent(CHART_SCRUB_EVENT, { bubbles: true, detail }));
  };

  const dayAt = (clientX: number) => {
    const rect = box.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || days.length === 0) return null;
    const fx = (clientX - rect.left) / rect.width;
    let best = 0;
    for (let i = 1; i < days.length; i++) {
      if (Math.abs((days[i]?.x ?? 0) - fx) < Math.abs((days[best]?.x ?? 0) - fx)) best = i;
    }
    return best;
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse') return;
    touch.current = { x: e.clientX, y: e.clientY, scrubbing: false };
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse') {
      select(dayAt(e.clientX));
      return;
    }
    const t = touch.current;
    if (!t) return;
    if (!t.scrubbing) {
      const dx = Math.abs(e.clientX - t.x);
      const dy = Math.abs(e.clientY - t.y);
      if (dx < TOUCH_THRESHOLD || dx <= dy) return;
      t.scrubbing = true;
      setTouchScrub(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    select(dayAt(e.clientX));
  };

  const endTouch = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse') return;
    touch.current = null;
    setTouchScrub(false);
    select(null);
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const last = days.length - 1;
    const current = active ?? restIndex;
    const moves: Record<string, number> = {
      ArrowLeft: current - 1,
      ArrowRight: current + 1,
      PageUp: current - 7,
      PageDown: current + 7,
      Home: 0,
      End: last,
    };
    if (e.key === 'Escape') {
      if (active !== null) {
        e.preventDefault();
        select(null);
      }
      return;
    }
    const next = moves[e.key];
    if (next === undefined) return;
    e.preventDefault();
    select(Math.max(0, Math.min(last, next)));
  };

  const day = active === null ? null : days[active];

  // Keep the chip inside the chart: centre it on the crosshair, then clamp to the edges.
  useLayoutEffect(() => {
    const w = box.current?.offsetWidth ?? 0;
    const c = chip.current?.offsetWidth ?? 0;
    if (!day) return;
    setChipLeft(Math.max(0, Math.min(w - c, day.x * w - c / 2)));
  }, [day]);

  const shown = active ?? restIndex;
  const valuetext = describe(shown);

  return (
    <>
      <div
        ref={box}
        role="slider"
        tabIndex={0}
        aria-label={labels.slider}
        aria-valuemin={0}
        aria-valuemax={days.length - 1}
        aria-valuenow={shown}
        aria-valuetext={valuetext}
        className="absolute inset-0 cursor-crosshair touch-pan-y rounded-cell focus-visible:outline-offset-4"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endTouch}
        onPointerCancel={endTouch}
        onPointerLeave={(e) => e.pointerType === 'mouse' && !focused && select(null)}
        onKeyDown={onKey}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          select(null);
        }}
      >
        {day && (
          <>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute top-[8%] bottom-[14%] w-px bg-line-strong"
              style={{ left: `${day.x * 100}%` }}
            />
            {day.y !== null && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-surface bg-accent ring-1 ring-accent"
                style={{ left: `${day.x * 100}%`, top: `${day.y * 100}%` }}
              />
            )}
            <div
              ref={chip}
              aria-hidden="true"
              className="pointer-events-none absolute -top-9 flex h-8 items-center gap-2 rounded-full bg-ink-surface px-3 text-[12.5px] whitespace-nowrap text-white shadow-[0_4px_12px_-4px_rgba(34,28,59,0.28)]"
              style={{ left: chipLeft }}
            >
              <span className="font-semibold text-ink-muted">{day.date}</span>
              {day.price ? (
                <span className="text-[14px] font-extrabold tabular-nums">{day.price}</span>
              ) : (
                <span className="font-semibold">{labels.noPrice}</span>
              )}
              {day.provider && day.price && <span className="text-white/80">{day.provider}</span>}
            </div>
          </>
        )}
      </div>
      {/* Outside the slider (its children are presentational). Speaks touch scrubbing only;
          keyboard users hear aria-valuetext. */}
      <span className="sr-only" aria-live="polite">
        {day && touchScrub ? describe(active as number) : ''}
      </span>
    </>
  );
}
