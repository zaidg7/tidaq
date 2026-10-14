import { NextResponse, type NextRequest } from 'next/server';
import {
  clientIp,
  createRateLimiter,
  isLocale,
  localizedPath,
  outboundUrl,
  stayPath,
  z,
} from '@tidaq/core';
import { hasSupabase, rpc } from '@/lib/data/supabase';

// Every click is logged and the target depends on the database: never cached.
export const dynamic = 'force-dynamic';

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const target = z
  .object({
    provider: z.object({
      slug: z.string(),
      is_direct: z.boolean(),
      affiliate_template: z.string().nullable(),
    }),
    hotel: z.object({ name: z.string(), city: z.string(), official_url: z.string().nullable() }),
  })
  .nullable();

const HEADERS = { 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow' };

function notFound(lang: string) {
  const text =
    lang === 'en'
      ? 'This link is not valid. Go back to Tidaq and pick a booking site again.'
      : 'Dieser Link ist nicht gültig. Geh zurück zu Tidaq und wähl die Buchungsseite neu.';
  return new NextResponse(text, {
    status: 404,
    headers: { ...HEADERS, 'content-type': 'text/plain; charset=utf-8' },
  });
}

/**
 * 30 outbound clicks a minute per IP and Worker isolate (C-041b): far above what a person does,
 * low enough that a bot can't flood the click counter or the database.
 */
const limiter = createRateLimiter({ max: 30, windowMs: 60_000 });

function tooMany(lang: string) {
  const text =
    lang === 'en'
      ? 'Too many requests in a short time. Please wait a minute and try again.'
      : 'Zu viele Aufrufe in kurzer Zeit. Warte bitte eine Minute und versuch es dann noch einmal.';
  return new NextResponse(text, {
    status: 429,
    headers: { ...HEADERS, 'content-type': 'text/plain; charset=utf-8', 'retry-after': '60' },
  });
}

function unavailable(lang: string) {
  const text =
    lang === 'en'
      ? 'We could not open the booking site just now. Please try again in a moment.'
      : 'Die Buchungsseite ließ sich gerade nicht öffnen. Versuch es gleich noch einmal.';
  return new NextResponse(text, {
    status: 503,
    headers: { ...HEADERS, 'content-type': 'text/plain; charset=utf-8', 'retry-after': '30' },
  });
}

/**
 * Outbound redirect (C-026, PLAN §6): `/go/<provider>/<hotel>?in=…&out=…&adults=…&lang=…`.
 * The database checks the stay and logs one `outbound_click` (no IP, no user agent), then we
 * send the visitor to the provider's search for this hotel and these dates (302). Links to it
 * carry `rel="sponsored nofollow noopener"`.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string; hotel: string }> },
) {
  const { provider, hotel } = await params;
  const q = request.nextUrl.searchParams;
  const lang = q.get('lang') ?? 'de';
  const locale = isLocale(lang) ? lang : 'de';
  const checkIn = q.get('in') ?? '';
  const checkOut = q.get('out') ?? '';
  const adults = Number(q.get('adults') ?? '2');
  if (
    !SLUG.test(provider) ||
    !SLUG.test(hotel) ||
    !DATE.test(checkIn) ||
    !DATE.test(checkOut) ||
    !Number.isInteger(adults)
  ) {
    return notFound(locale);
  }
  const ip = clientIp(request.headers);
  if (ip && limiter.limited(ip)) return tooMany(locale);
  if (!hasSupabase()) return unavailable(locale);

  try {
    const found = await rpc(
      'outbound_click',
      {
        p_provider: provider,
        p_hotel: hotel,
        p_check_in: checkIn,
        p_check_out: checkOut,
        p_adults: adults,
      },
      target,
    );
    const url =
      found &&
      outboundUrl(
        {
          slug: found.provider.slug,
          isDirect: found.provider.is_direct,
          affiliateTemplate: found.provider.affiliate_template,
        },
        { name: found.hotel.name, city: found.hotel.city, officialUrl: found.hotel.official_url },
        { checkIn, checkOut, adults },
        locale,
      );
    // A past stay, a provider we no longer link or a hotel without a website: the stay page
    // explains what's possible instead of a dead end.
    if (!url) {
      const back = localizedPath(stayPath(hotel, checkIn, checkOut, adults), locale);
      return NextResponse.redirect(new URL(back, request.nextUrl.origin), {
        status: 302,
        headers: HEADERS,
      });
    }
    return NextResponse.redirect(url, { status: 302, headers: HEADERS });
  } catch (error) {
    console.error(
      JSON.stringify({ msg: 'outbound failed', provider, hotel, error: String(error) }),
    );
    const text =
      locale === 'en'
        ? 'We could not open the booking site just now. Please try again in a moment.'
        : 'Die Buchungsseite ließ sich gerade nicht öffnen. Versuch es gleich noch einmal.';
    return new NextResponse(text, {
      status: 503,
      headers: { ...HEADERS, 'content-type': 'text/plain; charset=utf-8', 'retry-after': '30' },
    });
  }
}
