'use client';

import { useEffect, useRef } from 'react';

/**
 * The Turnstile widget (C-030c), rendered explicitly so it survives React re-rendering the form.
 * Managed mode: usually invisible; only suspicious visitors see a checkbox. It adds the hidden
 * `cf-turnstile-response` field to the surrounding form. Renders nothing without a site key
 * (local, CI), and the server skips the check there too.
 */
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let loading: Promise<TurnstileApi> | null = null;
function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  loading ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SCRIPT;
    s.async = true;
    s.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('no api')));
    s.onerror = () => {
      loading = null;
      reject(new Error('turnstile script failed'));
    };
    document.head.appendChild(s);
  });
  return loading;
}

export function Turnstile({ locale }: { locale: string }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!SITE_KEY || !box.current) return;
    const el = box.current;
    let id: string | null = null;
    let gone = false;
    loadTurnstile()
      .then((api) => {
        if (gone) return;
        id = api.render(el, {
          sitekey: SITE_KEY,
          appearance: 'interaction-only',
          size: 'flexible',
          language: locale,
          'refresh-expired': 'auto',
        });
      })
      .catch(() => {
        // Blocked or offline: the server lets the form through when it can't verify.
      });
    return () => {
      gone = true;
      if (id && window.turnstile) window.turnstile.remove(id);
    };
  }, [locale]);
  if (!SITE_KEY) return null;
  return <div ref={box} className="empty:hidden" />;
}
