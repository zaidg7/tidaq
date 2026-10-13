import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import type { ReactNode } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import {
  ArrowUpRight,
  Bell,
  CalendarDays,
  Mail,
  MapPin,
  Menu,
  Search,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { addDays, computeStayStats, stayStates, verdictFacts, type Locale } from '@tidaq/core';
import { ToastDemo } from '@/components/dev/ToastDemo';
import { SearchCard } from '@/components/home/SearchCard';
import { searchCardProps } from '@/lib/searchCardProps';
import { CollectingState } from '@/components/stay/CollectingState';
import { VerdictBlock } from '@/components/stay/VerdictBlock';
import { PriceChart } from '@/components/chart/PriceChart';
import { Badge } from '@/components/ui/Badge';
import { Button, buttonClasses, IconButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { TextField } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Logo } from '@/components/ui/Logo';
import { Price } from '@/components/ui/Price';
import { ChartSkeleton, VerdictSkeleton } from '@/components/ui/Skeleton';
import { PriceDelta } from '@/components/ui/PriceDelta';
import { StateChip } from '@/components/ui/StateChip';
import { TrustScore } from '@/components/ui/TrustScore';
import { getFeaturedStay } from '@/lib/data/featured';
import { sampleSeries } from '@/lib/sampleStay';

// APP_ENV is read per request (connection() below): the page must never render on production.
export const dynamic = 'force-dynamic';

/** Sample catalog for the search card (CI has no database). */
const DEV_HOTELS = [
  { slug: 'hotel-adlon-kempinski-berlin', name: 'Hotel Adlon Kempinski', city: 'Berlin' },
  { slug: 'hotel-de-rome-berlin', name: 'Hotel de Rome', city: 'Berlin' },
  { slug: 'hotel-bayerischer-hof-muenchen', name: 'Hotel Bayerischer Hof', city: 'München' },
  { slug: 'baur-au-lac-zuerich', name: 'Baur au Lac', city: 'Zürich' },
  { slug: 'the-dolder-grand-zuerich', name: 'The Dolder Grand', city: 'Zürich' },
];

export const metadata: Metadata = { robots: { index: false, follow: false } };

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section id={title.toLowerCase()} className="flex flex-col gap-3 border-t border-line py-8">
      <h2 className="text-h3">{title}</h2>
      <div className="flex flex-wrap items-start gap-3">{children}</div>
    </section>
  );
}

/** Every UI component in every state (C-006). Developer page: hidden in production, not indexed. */
export default async function DevUiPage({ params }: { params: Promise<{ locale: Locale }> }) {
  // Opts out of prerendering: the layout's generateStaticParams would otherwise build this page
  // once at build time, where APP_ENV is not set.
  await connection();
  if (process.env.APP_ENV === 'production') notFound();
  const { locale } = await params;
  setRequestLocale(locale);
  const to = '2026-10-13';
  const from = addDays(to, -59);
  const series = sampleSeries(to);
  const avg = Math.round(series.slice(-30).reduce((s, p) => s + p.bestCents, 0) / 30);
  const live = await getFeaturedStay();
  const tt = await getTranslations('toast');
  const checkIn = addDays(to, 50);
  const stats = computeStayStats(series, to, checkIn);
  const fewDays = series.slice(-3);
  const fewStats = computeStayStats(fewDays, to, checkIn);
  const updatedAt = '2026-10-13T05:12:00Z';
  const devNow = new Date('2026-10-13T10:00:00Z');

  return (
    <div className="mx-auto w-full max-w-[1080px] px-5 py-10 md:px-7">
      <p className="text-eyebrow text-muted">Soft Modern · /dev/ui</p>
      <h1 className="text-display mt-2">Komponenten</h1>
      <p className="mt-3 max-w-[65ch] text-muted">
        Alle Bausteine aus docs/DESIGN.md mit Beispieldaten. Diese Seite gibt es nur außerhalb der
        Produktion.
      </p>

      <Section title="Logo">
        <Logo />
        <Logo size="lg" />
        <div className="rounded-card bg-fg px-4 py-3 text-surface">
          <Logo className="text-surface" onDark />
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG, nothing to optimise */}
        <img src="/icon.svg" alt="Favicon" width={44} height={44} className="rounded-cell" />
      </Section>

      <Section title="Typografie">
        <div className="flex w-full flex-col gap-3">
          <p className="text-display max-w-[16ch]">
            Ist dein Hotelpreis gerade <span className="text-accent">tief</span> oder hoch?
          </p>
          <p className="text-h2">Wie Tidaq funktioniert</p>
          <p className="text-title">Hotel Adlon Kempinski Berlin</p>
          <p className="text-h3">Preisverlauf der letzten 60 Tage</p>
          <p className="text-lead max-w-[30em] text-muted-ink">
            Wir prüfen jeden Tag die Preise deines Hotels bei vielen Buchungsseiten und zeigen dir,
            ob der Preis gerade günstig ist.
          </p>
          <p className="prose-de">
            Fließtext: Übernachtungspreise schwanken stark. Ein Zimmer kann am Dienstag 980 € kosten
            und am Freitag 1.240 €. Tidaq macht diese Schwankung sichtbar.
          </p>
          <p className="text-meta text-muted-ink">Meta: 1.–3. Dez. 2026 · 2 Nächte · 2 Gäste</p>
          <p className="text-eyebrow text-accent">Eyebrow · Live-Beispiel</p>
        </div>
      </Section>

      <Section title="Farben">
        {[
          ['bg', 'bg-bg'],
          ['surface', 'bg-surface'],
          ['surface-2', 'bg-surface-2'],
          ['field', 'bg-field'],
          ['line', 'bg-line'],
          ['line-strong', 'bg-line-strong'],
          ['fg', 'bg-fg'],
          ['muted', 'bg-muted'],
          ['accent', 'bg-accent'],
          ['accent-hover', 'bg-accent-hover'],
          ['accent-soft', 'bg-accent-soft'],
          ['good', 'bg-good'],
          ['good-soft', 'bg-good-soft'],
          ['bad', 'bg-bad'],
          ['bad-soft', 'bg-bad-soft'],
          ['warn', 'bg-warn'],
          ['warn-soft', 'bg-warn-soft'],
          ['neutral-soft', 'bg-neutral-soft'],
          ['gradient', 'bg-accent-gradient'],
          ['placeholder', 'bg-placeholder'],
        ].map(([name, cls]) => (
          <div key={name} className="flex w-[88px] flex-col gap-1">
            <div className={`h-12 rounded-cell border border-line ${cls}`} />
            <span className="text-meta text-muted-ink">{name}</span>
          </div>
        ))}
      </Section>

      <Section title="Icons">
        {[Search, MapPin, CalendarDays, Users, Bell, ShieldCheck, ArrowUpRight, Menu, X].map(
          (glyph, i) => (
            <span
              key={i}
              className="grid size-11 place-items-center rounded-cell border border-line bg-surface"
            >
              <Icon icon={glyph} />
            </span>
          ),
        )}
        <span className="text-meta flex items-center gap-1.5 self-center text-muted-ink">
          <Icon icon={ShieldCheck} size={16} /> 16 px mit Strichstärke 2
        </span>
      </Section>

      <Section title="Buttons">
        <div className="flex w-full flex-wrap items-center gap-3">
          <Button size="sm">Preise ansehen</Button>
          <Button>Preise ansehen</Button>
          <Button size="lg" leading={<Icon icon={Bell} size={18} />}>
            Preis beobachten
          </Button>
          <Button size="lg" loading>
            Preis beobachten
          </Button>
          <Button size="lg" disabled>
            Preis beobachten
          </Button>
        </div>
        <div className="flex w-full flex-wrap items-center gap-3">
          <Button variant="ghost" size="sm">
            Zum Angebot <Icon icon={ArrowUpRight} size={16} />
          </Button>
          <Button variant="ghost">
            Zum Angebot <Icon icon={ArrowUpRight} size={16} />
          </Button>
          <Button variant="subtle">So sortieren wir</Button>
          <a href="#buttons" className={buttonClasses({ variant: 'ghost' })}>
            Link als Button
          </a>
          <IconButton label="Suche öffnen">
            <Icon icon={Search} />
          </IconButton>
          <IconButton label="Menü öffnen" variant="ghost">
            <Icon icon={Menu} />
          </IconButton>
        </div>
        <div className="w-full max-w-[560px]">
          <Button block size="lg">
            Preise ansehen
          </Button>
        </div>
      </Section>

      <Section title="Felder">
        <div className="grid w-full max-w-[560px] gap-3">
          <TextField
            id="dev-hotel"
            label="Hotel oder Stadt"
            placeholder="z. B. Adlon Berlin"
            leading={<Icon icon={MapPin} size={18} />}
          />
          <div className="grid grid-cols-2 gap-3">
            <TextField
              id="dev-dates"
              label="Reisedaten"
              defaultValue="1.–3. Dez."
              leading={<Icon icon={CalendarDays} size={18} />}
            />
            <TextField
              id="dev-guests"
              label="Gäste"
              defaultValue="2 Gäste"
              leading={<Icon icon={Users} size={18} />}
            />
          </div>
          <TextField
            id="dev-email"
            label="E-Mail"
            type="email"
            placeholder="du@beispiel.de"
            leading={<Icon icon={Mail} size={18} />}
            hint="Wir schicken dir nur Preis-Alarme. Abmelden geht mit einem Klick."
          />
          <TextField
            id="dev-email-error"
            label="E-Mail"
            type="email"
            defaultValue="name@beispiel"
            leading={<Icon icon={Mail} size={18} />}
            error="Bitte prüf die E-Mail-Adresse, da fehlt etwas nach dem @."
          />
        </div>
      </Section>

      <Section title="Suche">
        <div className="w-full max-w-[560px]">
          <SearchCard
            hotels={DEV_HOTELS}
            today="2026-10-13"
            locale={locale}
            {...await searchCardProps(locale)}
          />
        </div>
      </Section>

      <Section title="Chips">
        <Chip pressed={false}>Nur kostenlos stornierbar</Chip>
        <Chip pressed>Nur kostenlos stornierbar</Chip>
        <Chip pressed={false}>Wochenende</Chip>
        <Chip pressed>Unter der Woche</Chip>
      </Section>

      <Section title="Badges">
        <Badge>Partnerlink</Badge>
        <Badge tone="accent">Offizielle Seite</Badge>
        <Badge tone="good">Günstigster</Badge>
        <Badge tone="bad">Aufschlag an der Kasse</Badge>
        <Badge tone="warn">Wenig Daten</Badge>
      </Section>

      <Section title="StateChip">
        <div className="flex w-full flex-wrap gap-2">
          {stayStates.map((s) => (
            <StateChip key={s} state={s} daysTracked={3} />
          ))}
        </div>
        <div className="flex w-full flex-wrap gap-2">
          {stayStates.map((s) => (
            <StateChip key={s} state={s} daysTracked={5} size="sm" />
          ))}
        </div>
      </Section>

      <Section title="Urteil">
        <Card variant="float" className="w-full" data-scrub-scope="">
          <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-8">
            <VerdictBlock
              stats={stats}
              series={series}
              today={to}
              nights={2}
              adults={2}
              updatedAt={updatedAt}
              now={devNow}
            />
            <PriceChart series={series} from={from} to={to} avgCents={stats.avg30Cents} />
          </div>
        </Card>
        <Card className="w-full md:w-[calc(50%-6px)]">
          <CollectingState
            daysTracked={fewStats.daysTracked}
            verdictOn={verdictFacts(fewDays, to, null).verdictOn}
          >
            <Button leading={<Icon icon={Bell} size={18} />}>Preis beobachten</Button>
          </CollectingState>
        </Card>
        <Card className="w-full md:w-[calc(50%-6px)]">
          <VerdictBlock
            stats={fewStats}
            series={fewDays}
            today={to}
            nights={3}
            adults={1}
            updatedAt="2026-10-12T05:10:00Z"
            now={devNow}
          />
        </Card>
        <Card className="w-full">
          <p className="text-h3">Lädt</p>
          <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-8">
            <VerdictSkeleton label={tt('loading')} />
            <ChartSkeleton />
          </div>
        </Card>
        <ToastDemo label="Toast zeigen" message={tt('watchSaved')} closeLabel={tt('close')} />
      </Section>

      <Section title="Preisverlauf">
        <Card variant="float" className="w-full">
          <p className="text-h3">60 Tage mit Lücke (Beispiel)</p>
          <PriceChart
            className="mt-4"
            series={series}
            from={from}
            to={to}
            avgCents={avg}
            providerByDay={Object.fromEntries(series.map((p) => [p.day, 'Booking.com']))}
          />
        </Card>
        {(
          [
            ['Erst 4 Tage', series.slice(-4)],
            ['Noch keine Daten', []],
            ['Seit 5 Tagen keine Daten', series.slice(0, -5)],
            [
              'Ausreißer (5.200 €)',
              series.map((p, i) => (i === 30 ? { ...p, bestCents: 520_000 } : p)),
            ],
          ] as const
        ).map(([title, s]) => (
          <Card key={title} className="w-full md:w-[calc(50%-6px)]">
            <p className="text-h3">{title}</p>
            <PriceChart className="mt-4" series={s} from={from} to={to} avgCents={avg} />
          </Card>
        ))}
        {live && (
          <Card variant="float" className="w-full">
            <p className="text-h3">Live: {live.hotel.name}</p>
            <PriceChart
              className="mt-4"
              series={live.series}
              from={addDays(live.series.at(-1)?.day ?? to, -59)}
              to={live.series.at(-1)?.day ?? to}
              avgCents={live.stats.avg30Cents}
            />
          </Card>
        )}
      </Section>

      <Section title="Preise und Abweichung">
        <div className="flex flex-col gap-2">
          <Price cents={118_400} size="xl" />
          <p className="text-meta text-muted-ink">gesamt · 592 € pro Nacht · 2 Nächte, 2 Gäste</p>
          <PriceDelta ratio={-0.05} className="mt-2" />
          <PriceDelta ratio={0.04} />
          <PriceDelta ratio={0.001} />
          <PriceDelta ratio={-0.12} since="1. Okt." />
        </div>
        <div className="flex flex-col gap-1">
          <Price cents={118_400} size="lg" />
          <Price cents={118_400} />
          <Price cents={118_400} size="sm" />
          <Price cents={4_250_000} size="lg" />
        </div>
      </Section>

      <Section title="Preistreue">
        <TrustScore score={96} tests={25} matches={24} />
        <TrustScore score={72} tests={18} matches={13} />
        <TrustScore score={41} tests={12} matches={5} />
        <TrustScore score={90} tests={3} matches={3} />
        <TrustScore score={null} tests={0} matches={0} />
      </Section>

      <Section title="Karten">
        <Card className="w-full max-w-[320px]">
          <p className="text-h3">Flache Karte</p>
          <p className="text-meta mt-1 text-muted-ink">1 px Rand, kein Schatten.</p>
        </Card>
        <Card variant="float" className="w-full max-w-[320px]">
          <p className="text-h3">Schwebende Karte</p>
          <p className="text-meta mt-1 text-muted-ink">
            Zweilagiger Schatten für Suche und Preis-Panel.
          </p>
        </Card>
        <Card variant="float" radius="search" className="w-full max-w-[320px]">
          <p className="text-h3">Suchkarte</p>
          <p className="text-meta mt-1 text-muted-ink">Radius 26 px.</p>
        </Card>
        <Card interactive padded={false} className="w-full max-w-[320px] overflow-hidden">
          <div className="bg-placeholder h-[130px]" />
          <div className="p-5 lg:p-6">
            <a href="#karten" className="text-h3 after:absolute after:inset-0">
              Platzhalter-Bild
            </a>
            <p className="text-meta mt-1 text-muted-ink">
              Die ganze Karte ist ein Link: Hover hebt sie an, Tab zeigt den Fokus.
            </p>
          </div>
        </Card>
      </Section>
    </div>
  );
}
