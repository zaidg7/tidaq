import Script from 'next/script';

/**
 * Cloudflare Web Analytics (B-015, C-082): cookieless visit counts (D-15, privacy page §5). The
 * token is public by design: Cloudflare puts it in every page's HTML. Pages are prerendered for
 * staging and production alike, so the beacon is added in the browser and only on tidaq.com:
 * staging, previews and local runs never send anything.
 */
const TOKEN = 'ad5007c30918407c8c5070f331f56123';
const HOSTS = ['tidaq.com', 'www.tidaq.com'];

export const BEACON_SRC = 'https://static.cloudflareinsights.com/beacon.min.js';

export function WebAnalytics() {
  const code = `if(${JSON.stringify(HOSTS)}.indexOf(location.hostname)>-1){var s=document.createElement('script');s.defer=true;s.src=${JSON.stringify(BEACON_SRC)};s.setAttribute('data-cf-beacon',${JSON.stringify(JSON.stringify({ token: TOKEN }))});document.head.appendChild(s)}`;
  return (
    <Script id="cf-web-analytics" strategy="afterInteractive">
      {code}
    </Script>
  );
}
