import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import type { ReactNode } from 'react';
import { setRequestLocale } from 'next-intl/server';
import { stayStates, type Locale } from '@tidaq/core';
import { Badge } from '@/components/ui/Badge';
import { Button, buttonClasses } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { TextField } from '@/components/ui/Field';
import { Logo } from '@/components/ui/Logo';
import { Price } from '@/components/ui/Price';
import { PriceDelta } from '@/components/ui/PriceDelta';
import { StateChip } from '@/components/ui/StateChip';
import { TrustScore } from '@/components/ui/TrustScore';

// APP_ENV is read per request (connection() below): the page must never render on production.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = { robots: { index: false, follow: false } };

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-t border-line py-8">
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

  return (
    <main className="mx-auto max-w-[1080px] px-[18px] py-10 md:px-7">
      <p className="text-eyebrow text-muted">Soft Modern · /dev/ui</p>
      <h1 className="text-display mt-2">Komponenten</h1>
      <p className="mt-3 max-w-[65ch] text-muted">
        Alle Bausteine aus docs/DESIGN.md mit Beispieldaten. Diese Seite gibt es nur außerhalb der
        Produktion.
      </p>

      <Section title="Logo">
        <Logo />
        <Logo size="lg" />
      </Section>

      <Section title="Typografie">
        <div className="flex w-full flex-col gap-3">
          <p className="text-display">Siehst du einen Tiefpunkt?</p>
          <p className="text-h2">Wie Tidaq funktioniert</p>
          <p className="text-h3">Hotel Adlon Kempinski</p>
          <p className="text-price-xl">1.184 €</p>
          <p className="max-w-[65ch]">
            Fließtext: Wir prüfen jeden Tag die Preise deines Hotels bei vielen Buchungsseiten und
            zeigen dir, ob der Preis gerade günstig ist.
          </p>
          <p className="text-meta text-muted">Meta: 1.–3. Dez. 2026 · 2 Gäste</p>
          <p className="text-eyebrow text-muted">Eyebrow</p>
        </div>
      </Section>

      <Section title="Farben">
        {[
          ['bg', 'bg-bg'],
          ['surface', 'bg-surface'],
          ['field', 'bg-field'],
          ['line', 'bg-line'],
          ['fg', 'bg-fg'],
          ['muted', 'bg-muted'],
          ['accent', 'bg-accent'],
          ['accent-soft', 'bg-accent-soft'],
          ['good', 'bg-good'],
          ['bad', 'bg-bad'],
          ['warn', 'bg-warn'],
          ['placeholder', 'bg-placeholder'],
        ].map(([name, cls]) => (
          <div key={name} className="flex w-24 flex-col gap-1">
            <div className={`h-12 rounded-badge border border-line ${cls}`} />
            <span className="text-meta text-muted">{name}</span>
          </div>
        ))}
      </Section>

      <Section title="Buttons">
        <Button>Preis verfolgen</Button>
        <Button size="lg">Preis verfolgen</Button>
        <Button variant="ghost">Zum Angebot</Button>
        <Button variant="ghost" size="lg">
          Zum Angebot
        </Button>
        <Button disabled>Deaktiviert</Button>
        <a href="#buttons" className={buttonClasses({ variant: 'ghost' })}>
          Link als Button
        </a>
        <div className="w-full max-w-[560px]">
          <Button block size="lg">
            Preis verfolgen (volle Breite)
          </Button>
        </div>
      </Section>

      <Section title="Felder">
        <div className="grid w-full max-w-[560px] gap-3">
          <TextField id="dev-hotel" label="Hotel oder Stadt" placeholder="z. B. Adlon Berlin" />
          <div className="grid grid-cols-2 gap-3">
            <TextField id="dev-dates" label="Daten" defaultValue="1.–3. Dez. 2026" />
            <TextField id="dev-guests" label="Gäste" defaultValue="2 Erwachsene" />
          </div>
          <TextField
            id="dev-email"
            label="E-Mail"
            type="email"
            defaultValue="name@beispiel"
            hint="Wir schicken dir nur Preis-Alarme."
          />
          <TextField
            id="dev-email-error"
            label="E-Mail"
            type="email"
            defaultValue="name@beispiel"
            error="Bitte prüf die E-Mail-Adresse, da fehlt etwas nach dem @."
          />
        </div>
      </Section>

      <Section title="Chips">
        <Chip pressed={false}>Nur kostenlos stornierbar</Chip>
        <Chip pressed>Nur kostenlos stornierbar</Chip>
        <Chip pressed={false}>Wochenende</Chip>
      </Section>

      <Section title="Badges">
        <Badge>Neutral</Badge>
        <Badge tone="accent">Offizielle Seite</Badge>
        <Badge tone="good">Getestet</Badge>
        <Badge tone="bad">Aufschlag</Badge>
        <Badge tone="warn">Wenig Daten</Badge>
      </Section>

      <Section title="StateChip">
        {stayStates.map((s) => (
          <StateChip key={s} state={s} daysTracked={3} />
        ))}
      </Section>

      <Section title="Preise und Abweichung">
        <div className="flex flex-col gap-2">
          <Price cents={118_400} size="xl" />
          <PriceDelta ratio={-0.05} />
          <PriceDelta ratio={0.04} />
          <PriceDelta ratio={0.001} />
        </div>
        <div className="flex flex-col gap-1">
          <Price cents={118_400} size="lg" />
          <Price cents={118_400} />
          <Price cents={118_400} size="sm" />
        </div>
      </Section>

      <Section title="TrustScore">
        <TrustScore score={96} tests={25} matches={24} />
        <TrustScore score={72} tests={18} matches={13} />
        <TrustScore score={41} tests={12} matches={5} />
        <TrustScore score={90} tests={3} matches={3} />
        <TrustScore score={null} tests={0} matches={0} />
      </Section>

      <Section title="Karten">
        <Card className="w-full max-w-[320px]">
          <p className="text-h3">Flache Karte</p>
          <p className="text-meta mt-1 text-muted">1 px Rand, kein Schatten.</p>
        </Card>
        <Card variant="float" className="w-full max-w-[320px]">
          <p className="text-h3">Schwebende Karte</p>
          <p className="text-meta mt-1 text-muted">Schatten nur für Suche und Preis-Panel.</p>
        </Card>
        <Card variant="float" radius="search" className="w-full max-w-[320px]">
          <p className="text-h3">Suchkarte</p>
          <p className="text-meta mt-1 text-muted">Radius 26 px.</p>
        </Card>
        <div className="w-full max-w-[320px] overflow-hidden rounded-card border border-line bg-surface">
          <div className="bg-placeholder h-[130px]" />
          <div className="p-4">
            <p className="text-h3">Platzhalter-Bild</p>
            <p className="text-meta text-muted">Wenn ein Hotel kein lizenziertes Foto hat.</p>
          </div>
        </div>
      </Section>
    </main>
  );
}
