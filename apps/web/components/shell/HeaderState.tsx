'use client';

import { useEffect } from 'react';

/** Scroll distance after which the navbar turns frosted (and ink on photo pages). */
const SCROLLED_AT = 24;

/**
 * Sets `data-scrolled` on the navbar once the page has scrolled (globals.css `.site-header`).
 * One passive listener, written only when the state flips. Renders nothing.
 */
export function HeaderState() {
  useEffect(() => {
    const header = document.querySelector<HTMLElement>('.site-header');
    if (!header) return;
    let scrolled: boolean | null = null;
    const update = () => {
      const next = window.scrollY > SCROLLED_AT;
      if (next === scrolled) return;
      scrolled = next;
      header.toggleAttribute('data-scrolled', next);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);
  return null;
}
