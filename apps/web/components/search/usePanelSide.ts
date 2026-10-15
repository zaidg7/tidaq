'use client';

import { useLayoutEffect, useRef, useState } from 'react';

/** Room the sticky navbar takes at the top of the viewport (76 px on desktop, 64 on phones). */
const NAV = 80;
const GAP = 12;

/**
 * Which side of the search bar a panel opens on (C-130). Below when it fits, else above when
 * there is more room there, so a bar low in the hero never pushes its calendar under the fold
 * (no scrolling to see the choice). Inside `[data-panels="up"]` (the hero bar) every panel opens
 * above whenever it fits there, so they all open the same way. Measured before paint each time
 * the panel opens, then fixed while it stays open: a panel that jumps sides while you type is
 * worse than one that's cut off.
 */
export function usePanelSide<T extends HTMLElement>(open: boolean) {
  const ref = useRef<T>(null);
  const [up, setUp] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!open || !el) return;
    const anchor = (el.offsetParent ?? el.parentElement)?.getBoundingClientRect();
    if (!anchor) return;
    const height = el.offsetHeight;
    const below = window.innerHeight - anchor.bottom - GAP;
    const above = anchor.top - GAP - NAV;
    const preferUp = el.closest('[data-panels="up"]') !== null;
    setUp(preferUp ? height <= above || above > below : height > below && above > below);
  }, [open]);
  return { ref, up };
}
