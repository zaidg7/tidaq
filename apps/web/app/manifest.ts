import type { MetadataRoute } from 'next';

/** Web app manifest (C-106): name, colours and the t-Monogramm icons (PREMIUM.md §5). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Tidaq · Preise für Fünf-Sterne-Hotels',
    short_name: 'Tidaq',
    start_url: '/',
    display: 'browser',
    background_color: '#FAF9F7',
    theme_color: '#FAF9F7',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
