import { Fragment, type ReactNode } from 'react';
import { CircleCheck, CircleX, Play, TriangleAlert } from 'lucide-react';
import {
  formatDayMonth,
  formatWeekdayDayMonth,
  healthVerdict,
  NIGHT_ACCURACY,
  NIGHT_GRID,
  type HealthCheck,
  type HealthLevel,
} from '@tidaq/core';
import {
  activateHotelAction,
  approveProviderAction,
  deactivateHotelAction,
  runStagingAction,
} from '@/app/admin/actions';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import type { AdminAccuracyDay, AdminHealth } from '@/lib/admin/db';
import { cn } from '@/lib/cn';

/**
 * Data health and budget (C-016). Built for a phone: the verdict on top answers "is the data
 * okay?" in one look, the tiles give the four numbers, the lists below are the to-dos.
 * Admin copy is German only.
 */

const usd = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const int = new Intl.NumberFormat('de-DE');
const pct = new Intl.NumberFormat('de-DE', { style: 'percent', maximumFractionDigits: 0 });
const gapPct = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 });
const time = new Intl.DateTimeFormat('de-DE', {
  timeZone: 'Europe/Berlin',
  hour: '2-digit',
  minute: '2-digit',
});
const berlinDay = (iso: string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(new Date(iso));

const LEVEL: Record<HealthLevel, { title: string; icon: typeof CircleCheck; tone: string }> = {
  ok: { title: 'Alles in Ordnung', icon: CircleCheck, tone: 'bg-good-soft text-good-ink' },
  warn: { title: 'Schau mal hin', icon: TriangleAlert, tone: 'bg-warn-soft text-warn-ink' },
  bad: { title: 'Da stimmt was nicht', icon: CircleX, tone: 'bg-bad-soft text-bad-ink' },
};

function checkText({ key, values: v }: HealthCheck): string {
  const when = v.today ? 'von heute' : 'von gestern';
  switch (key) {
    case 'noRuns':
      return 'Noch kein Lauf in Produktion.';
    case 'runLate':
      return `Seit ${v.hours} Stunden kein Lauf. Der Zeitplan läuft vermutlich nicht.`;
    case 'coverageLow':
    case 'coveragePartial':
      return `Nur ${int.format(v.have ?? 0)} von ${int.format(v.total ?? 0)} Aufenthalten haben Preise ${when}.`;
    case 'errors':
      return `${int.format(v.count ?? 0)} Fehler heute. Details unten bei den Läufen.`;
    case 'skipped':
      return `${int.format(v.count ?? 0)} Aufenthalte übersprungen: Budget-Grenze erreicht.`;
    case 'budgetOver':
      return `Monatsbudget aufgebraucht: ${usd.format(v.spent ?? 0)} von ${usd.format(v.budget ?? 0)}.`;
    case 'budgetHigh':
      return `Über 80 % vom Monatsbudget: ${usd.format(v.spent ?? 0)} von ${usd.format(v.budget ?? 0)}.`;
    case 'staleHotels':
      return v.count === 1
        ? '1 Hotel ohne Preise seit 3 Tagen.'
        : `${int.format(v.count ?? 0)} Hotels ohne Preise seit 3 Tagen.`;
  }
}

const FLASH: Record<string, { ok: boolean; text: string }> = {
  'ok:provider': { ok: true, text: 'Seite freigegeben. Bestpreise sind neu berechnet.' },
  'ok:hotelOff': {
    ok: true,
    text: 'Hotel deaktiviert. Ab dem nächsten Lauf wird es übersprungen.',
  },
  'ok:hotelOn': { ok: true, text: 'Hotel wieder aktiv. Der nächste Morgenlauf holt Preise.' },
  'ok:run': { ok: true, text: 'Staging-Lauf gestartet. Ergebnisse kommen in etwa 10 Minuten.' },
  'fail:provider': { ok: false, text: 'Freigabe hat nicht geklappt. Versuch es noch mal.' },
  'fail:hotelOff': { ok: false, text: 'Deaktivieren hat nicht geklappt. Versuch es noch mal.' },
  'fail:hotelOn': { ok: false, text: 'Aktivieren hat nicht geklappt. Versuch es noch mal.' },
  'fail:run': { ok: false, text: 'Der Staging-Lauf ließ sich nicht starten. Details im Log.' },
};

type Props = {
  health: AdminHealth;
  monthlyBudgetUsd: number;
  now: Date;
  /** `ok:…` / `fail:…` after a button. */
  flash?: string;
};

export function Dashboard({ health, monthlyBudgetUsd, now, flash }: Props) {
  const today = health.days.find((d) => d.day === health.today) ?? null;
  const verdict = healthVerdict({
    now,
    lastRunAt: health.last_run_at,
    today: today
      ? { errors: today.errors, skipped: today.skipped, budgetReason: today.budget_reason }
      : null,
    coverage: {
      stays: health.coverage.stays,
      withToday: health.coverage.with_today,
      withYesterday: health.coverage.with_yesterday,
    },
    monthCostUsd: health.month_cost_usd,
    monthlyBudgetUsd,
    staleHotels: health.stale_hotels.length,
  });
  const level = LEVEL[verdict.level];
  const { stays, with_today: withToday } = health.coverage;
  const share = stays > 0 ? withToday / stays : 0;
  const budgetShare = monthlyBudgetUsd > 0 ? health.month_cost_usd / monthlyBudgetUsd : 0;
  const month = new Intl.DateTimeFormat('de-DE', { month: 'long' }).format(
    new Date(`${health.today}T12:00:00Z`),
  );
  const notice = flash ? FLASH[flash] : undefined;

  return (
    <div className="flex flex-col gap-6">
      {notice && (
        <p
          role="status"
          className={cn(
            'rounded-cell px-4 py-3 text-[14px] font-semibold',
            notice.ok ? 'bg-good-soft text-good-ink' : 'bg-bad-soft text-bad-ink',
          )}
        >
          {notice.text}
        </p>
      )}

      <Card variant="float" className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className={cn('grid size-11 shrink-0 place-items-center rounded-full', level.tone)}>
            <Icon icon={level.icon} size={24} />
          </span>
          <div className="min-w-0">
            <h2 id="health-title" className="text-h3">
              {level.title}
            </h2>
            <p className="text-meta text-muted-ink">
              Stand {time.format(new Date(health.generated_at))} Uhr
            </p>
          </div>
        </div>
        {verdict.checks.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {verdict.checks.map((c) => (
              <li key={c.key} className="flex items-start gap-2 text-[15px]">
                <Icon
                  icon={c.level === 'bad' ? CircleX : TriangleAlert}
                  size={16}
                  className={cn('mt-[3px]', c.level === 'bad' ? 'text-bad-ink' : 'text-warn-ink')}
                  label={c.level === 'bad' ? 'Problem' : 'Hinweis'}
                />
                <span>{checkText(c)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-ink">Preise sind da, keine Fehler, Budget im Rahmen.</p>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Preise heute" value={`${int.format(withToday)} / ${int.format(stays)}`}>
          {stays > 0 ? `${Math.round(share * 100)} % der Aufenthalte` : 'Keine Aufenthalte'}
        </Tile>
        <Tile label={`Kosten ${month}`} value={usd.format(health.month_cost_usd)}>
          <span className="flex flex-col gap-1.5">
            <span>von {usd.format(monthlyBudgetUsd)}</span>
            <Meter share={budgetShare} label={`${Math.round(budgetShare * 100)} % vom Budget`} />
          </span>
        </Tile>
        <Tile
          label="Letzter Lauf"
          value={health.last_run_at ? time.format(new Date(health.last_run_at)) : '–'}
        >
          {health.last_run_at
            ? berlinDay(health.last_run_at) === health.today
              ? 'heute'
              : formatWeekdayDayMonth(berlinDay(health.last_run_at), 'de')
            : 'noch keiner'}
        </Tile>
        <Tile label="Seiten prüfen" value={int.format(health.pending_total)}>
          neue Buchungsseiten
        </Tile>
      </div>

      <Section title="Läufe der letzten 14 Tage" hint="Nur Produktion. Tage in deutscher Zeit.">
        {health.days.length === 0 ? (
          <Empty>Noch keine Läufe.</Empty>
        ) : (
          <div className="-mx-5 overflow-x-auto px-5 lg:-mx-6 lg:px-6">
            <table className="w-full text-left text-[14px] tabular-nums">
              <thead className="text-meta whitespace-nowrap text-muted-ink">
                <tr className="border-b border-line">
                  <th scope="col" className="py-2 pr-3 font-semibold">
                    Tag
                  </th>
                  <th scope="col" className="py-2 pr-3 text-right font-semibold">
                    Aufträge
                  </th>
                  <th scope="col" className="py-2 pr-3 text-right font-semibold">
                    Preise
                  </th>
                  <th scope="col" className="py-2 pr-3 text-right font-semibold max-sm:hidden">
                    Kosten
                  </th>
                  <th scope="col" className="py-2 text-right font-semibold">
                    Fehler
                  </th>
                </tr>
              </thead>
              <tbody>
                {health.days.map((d) => (
                  <Fragment key={d.day}>
                    <tr
                      className={cn(
                        'border-t border-line align-top',
                        d.first_error && '[&>*]:pb-1',
                      )}
                    >
                      <th scope="row" className="py-2.5 pr-3 font-semibold whitespace-nowrap">
                        {formatWeekdayDayMonth(d.day, 'de')}
                      </th>
                      <td className="py-2.5 pr-3 text-right whitespace-nowrap">
                        {int.format(d.posted)}
                        {d.skipped > 0 && (
                          <span className="block text-[12.5px] text-warn-ink">
                            {int.format(d.skipped)} übersprungen
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 text-right">{int.format(d.collected)}</td>
                      <td className="py-2.5 pr-3 text-right whitespace-nowrap max-sm:hidden">
                        {usd.format(d.cost_usd)}
                      </td>
                      <td
                        className={cn(
                          'py-2.5 text-right',
                          d.errors > 0 ? 'font-bold text-bad-ink' : 'text-muted-ink',
                        )}
                      >
                        {int.format(d.errors)}
                      </td>
                    </tr>
                    {d.first_error && (
                      <tr className="border-t-0">
                        <td colSpan={5} className="pb-2.5 text-[12.5px] break-words text-muted-ink">
                          Letzter Fehler: {d.first_error}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <NightsSection
        nights={health.nights}
        accuracy={health.accuracy}
        hidden={health.night_hidden}
      />

      <Section
        title="Hotels ohne Preise seit 3 Tagen"
        hint="Oft falsche Hotel-ID bei DataForSEO. Deaktivieren spart Budget, bis es geklärt ist."
      >
        {health.stale_hotels.length === 0 ? (
          <Empty>Alle aktiven Hotels haben frische Preise.</Empty>
        ) : (
          <Rows>
            {health.stale_hotels.map((h) => (
              <Row
                key={h.id}
                title={h.name}
                meta={
                  h.last_day
                    ? `Letzte Preise ${formatDayMonth(h.last_day, 'de')}`
                    : 'Noch nie Preise'
                }
              >
                <form action={deactivateHotelAction}>
                  <input type="hidden" name="id" value={h.id} />
                  <Button type="submit" variant="subtle" size="sm">
                    Deaktivieren
                  </Button>
                </form>
              </Row>
            ))}
          </Rows>
        )}
      </Section>

      <Section
        title="Neue Buchungsseiten"
        hint="Google zeigt diese Seiten, wir zählen sie aber erst nach deiner Freigabe für den Bestpreis. Gib nur Seiten frei, die du kennst und für seriös hältst."
      >
        {health.pending_providers.length === 0 ? (
          <Empty>Nichts zu prüfen.</Empty>
        ) : (
          <>
            <Rows>
              {health.pending_providers.map((p) => (
                <Row
                  key={p.id}
                  title={p.name}
                  meta={`${p.domain ?? p.slug} · ${int.format(p.offers)} Angebote in 14 Tagen`}
                >
                  <form action={approveProviderAction}>
                    <input type="hidden" name="id" value={p.id} />
                    <Button type="submit" variant="subtle" size="sm">
                      Freigeben
                    </Button>
                  </form>
                </Row>
              ))}
            </Rows>
            {health.pending_total > health.pending_providers.length && (
              <p className="text-meta mt-3 text-muted-ink">
                Und {int.format(health.pending_total - health.pending_providers.length)} weitere mit
                weniger Angeboten.
              </p>
            )}
          </>
        )}
      </Section>

      {health.inactive_hotels.length > 0 && (
        <Section title="Inaktive Hotels" hint="Werden nicht abgefragt und nicht angezeigt.">
          <Rows>
            {health.inactive_hotels.map((h) => (
              <Row key={h.id} title={h.name} meta={h.slug}>
                <form action={activateHotelAction}>
                  <input type="hidden" name="id" value={h.id} />
                  <Button type="submit" variant="subtle" size="sm">
                    Aktivieren
                  </Button>
                </form>
              </Row>
            ))}
          </Rows>
        </Section>
      )}

      <Section
        title="Werkzeuge"
        hint="Startet einen Lauf auf Staging: höchstens 50 Aufträge, der Budget-Schutz gilt."
      >
        <form action={runStagingAction}>
          <Button type="submit" variant="ghost" leading={<Icon icon={Play} size={16} />}>
            Staging-Lauf starten
          </Button>
        </form>
      </Section>
    </div>
  );
}

/**
 * Night grid (C-070a) and how close summed nights come to real stay prices (C-070c). The
 * night runs are counted here, not in the daily run table: thousands of nights would drown it.
 * Hotels where single nights mislead have their night history hidden (C-070d); the target and the
 * email alarm count only the hotels whose night history is shown.
 */
function NightsSection({
  nights,
  accuracy,
  hidden,
}: {
  nights: AdminHealth['nights'];
  accuracy: AdminAccuracyDay[];
  hidden: AdminHealth['night_hidden'];
}) {
  const expected = nights.hotels * NIGHT_GRID.windowDays;
  const done = expected > 0 ? nights.rows / expected : 0;
  const ratio = (n: number, of: number) => (of > 0 ? pct.format(n / of) : '–');
  const weak = (d: AdminAccuracyDay) =>
    d.pairs_shown >= NIGHT_ACCURACY.minPairs &&
    d.within_3_shown / d.pairs_shown < NIGHT_ACCURACY.minShare;
  return (
    <Section
      title="Einzelnächte"
      hint={`Jede Nacht der nächsten ${NIGHT_GRID.windowDays} Tage pro Hotel, täglich ab Mitternacht UTC. Tag in UTC.`}
    >
      <div className="flex flex-col gap-1">
        <p className="font-semibold tabular-nums">
          {int.format(nights.rows)} von {int.format(expected)} Nächten heute
          {nights.last_collected_at &&
            `, zuletzt ${time.format(new Date(nights.last_collected_at))} Uhr`}
        </p>
        <Meter
          share={done}
          label={`${pct.format(done)} abgefragt · ${int.format(nights.priced)} mit Preis · ${int.format(nights.runs)} Läufe · ${int.format(nights.errors)} Fehler`}
          tone="progress"
        />
      </div>

      <h3 className="mt-5 font-semibold">Genauigkeit</h3>
      <p className="text-meta mt-1 mb-2 text-muted-ink">
        Summe der Nächte gegen den echten Preis desselben Aufenthalts auf derselben Seite, am selben
        Tag. Ziel: mindestens {pct.format(NIGHT_ACCURACY.minShare)} auf 3 % genau bei den Hotels,
        deren Verlauf wir zeigen.
      </p>
      {accuracy.length === 0 ? (
        <Empty>Noch kein Vergleich. Der erste kommt morgen früh mit der Tagesprüfung.</Empty>
      ) : (
        <div className="-mx-5 overflow-x-auto px-5 lg:-mx-6 lg:px-6">
          <table className="w-full text-left text-[14px] tabular-nums">
            <thead className="text-meta whitespace-nowrap text-muted-ink">
              <tr className="border-b border-line">
                <th scope="col" className="py-2 pr-3 font-semibold">
                  Tag
                </th>
                <th scope="col" className="py-2 pr-3 text-right font-semibold max-sm:hidden">
                  Vergleiche
                </th>
                <th scope="col" className="py-2 pr-3 text-right font-semibold">
                  Gezeigt ± 3 %
                </th>
                <th scope="col" className="py-2 pr-3 text-right font-semibold">
                  Alle ± 3 %
                </th>
                <th scope="col" className="py-2 pr-3 text-right font-semibold max-sm:hidden">
                  Alle ± 0,5 %
                </th>
                <th scope="col" className="py-2 text-right font-semibold">
                  Median
                </th>
              </tr>
            </thead>
            <tbody>
              {accuracy.map((d) => (
                <tr key={d.day} className="border-t border-line">
                  <th scope="row" className="py-2.5 pr-3 font-semibold whitespace-nowrap">
                    {formatWeekdayDayMonth(d.day, 'de')}
                  </th>
                  <td className="py-2.5 pr-3 text-right max-sm:hidden">{int.format(d.pairs)}</td>
                  <td className={cn('py-2.5 pr-3 text-right', weak(d) && 'font-bold text-bad-ink')}>
                    {ratio(d.within_3_shown, d.pairs_shown)}
                  </td>
                  <td className="py-2.5 pr-3 text-right">{ratio(d.within_3, d.pairs)}</td>
                  <td className="py-2.5 pr-3 text-right max-sm:hidden">
                    {ratio(d.within_05, d.pairs)}
                  </td>
                  <td className="py-2.5 text-right whitespace-nowrap">
                    {d.median_gap_pct === null ? '–' : `${gapPct.format(d.median_gap_pct)} %`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <h3 className="mt-5 font-semibold">Ohne Verlauf aus Einzelnächten</h3>
      <p className="text-meta mt-1 mb-2 text-muted-ink">
        Einzelne Nächte kosten hier dauerhaft anders als der ganze Aufenthalt (Median über 5 %
        daneben) oder schwanken zu stark (unter 40 % auf 3 % genau, 7 Tage). Diese Hotels zeigen nur
        echte Abfragen. Geht automatisch, sobald die Werte wieder passen.
      </p>
      {hidden.length === 0 ? (
        <Empty>Keine. Alle Hotels zeigen den Verlauf aus Einzelnächten.</Empty>
      ) : (
        <Rows>
          {hidden.map((h) => (
            <Row
              key={h.id}
              title={h.name}
              meta={`${h.gap_pct === null ? '' : `Einzelnächte im Median ${h.gap_pct > 0 ? '+' : ''}${gapPct.format(h.gap_pct)} % · `}${int.format(h.within_3)} von ${int.format(h.pairs)} auf 3 % genau`}
            />
          ))}
        </Rows>
      )}
    </Section>
  );
}

function Tile({ label, value, children }: { label: string; value: string; children: ReactNode }) {
  return (
    <Card className="flex flex-col gap-1">
      <p className="text-meta font-semibold text-muted-ink">{label}</p>
      <p className="text-[24px] leading-tight font-extrabold tabular-nums">{value}</p>
      <div className="text-meta text-muted-ink">{children}</div>
    </Card>
  );
}

/** Budget used, as a bar. The label carries the number; the bar is decoration. */
function Meter({
  share,
  label,
  tone = 'budget',
}: {
  share: number;
  label: string;
  /** `budget`: full is bad. `progress`: full is the goal. */
  tone?: 'budget' | 'progress';
}) {
  const pct = Math.min(1, Math.max(0, share)) * 100;
  return (
    <span className="flex flex-col gap-1">
      <span aria-hidden="true" className="h-1.5 w-full overflow-hidden rounded-full bg-line">
        <span
          className={cn(
            'block h-full rounded-full',
            tone === 'progress'
              ? 'bg-accent'
              : share >= 1
                ? 'bg-bad'
                : share >= 0.8
                  ? 'bg-warn'
                  : 'bg-accent',
          )}
          style={{ width: `${pct}%` }}
        />
      </span>
      <span>{label}</span>
    </span>
  );
}

function Section({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <Card className="flex flex-col">
      <h2 className="text-h3">{title}</h2>
      <p className="text-meta mt-1 mb-3 text-muted-ink">{hint}</p>
      {children}
    </Card>
  );
}

function Rows({ children }: { children: ReactNode }) {
  return <ul className="divide-y divide-line">{children}</ul>;
}

function Row({ title, meta, children }: { title: string; meta: string; children?: ReactNode }) {
  return (
    <li className="flex items-center gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{title}</p>
        <p className="text-meta break-words text-muted-ink">{meta}</p>
      </div>
      {children}
    </li>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="text-muted-ink">{children}</p>;
}
