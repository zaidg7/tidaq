import { dfsHotelInfoResponseSchema } from '@tidaq/core';
import { describe, expect, it } from 'vitest';
import {
  buildIngest,
  cleanOfficialUrl,
  parseDfsDatetime,
  taskOutcome,
  type OpenTask,
  type TaskOutcome,
} from './ingest';
import { hotelInfoFixture, SEED_ALIASES, statusOnly } from './test/results';

const aliases = new Map(Object.entries(SEED_ALIASES));
const parse = (json: unknown) => dfsHotelInfoResponseSchema.parse(json);
const NOW = '2026-10-12T05:30:00.000Z';

// Adlon, 1 → 3 Dec 2026 (2 nights), queried 12 Oct 2026 16:06 UTC.
const adlonTask: OpenTask = {
  id: 't-adlon',
  stayId: 7,
  hotelId: 1,
  checkIn: '2026-12-01',
  checkOut: '2026-12-03',
  postedAt: '2026-10-12T05:00:00.000Z',
};
const adlon = (): TaskOutcome =>
  taskOutcome(parse(hotelInfoFixture('hotel_info-info-adlon-dec-id.json', 't-adlon')));

describe('taskOutcome', () => {
  it('reads a ready result', () => {
    expect(adlon().kind).toBe('done');
  });

  it('keeps queued tasks pending', () => {
    expect(taskOutcome(parse(statusOnly('a', 40602, 'Task In Queue.'))).kind).toBe('pending');
    expect(taskOutcome(parse(statusOnly('a', 40601, 'Task Handed.'))).kind).toBe('pending');
  });

  it('maps "no search results" and empty price lists to no_results', () => {
    expect(taskOutcome(parse(statusOnly('a', 40102, 'No Search Results.'))).kind).toBe(
      'no_results',
    );
    const empty = parse(hotelInfoFixture('hotel_info-info-adlon-dec-id.json', 'a'));
    const prices = empty.tasks[0]?.result?.[0]?.prices;
    if (!prices) throw new Error('fixture without prices');
    prices.items = [];
    expect(taskOutcome(empty).kind).toBe('no_results');
  });

  it('reports other task errors with code and message', () => {
    expect(taskOutcome(parse(statusOnly('a', 40501, 'Invalid Field.')))).toEqual({
      kind: 'failed',
      error: '40501 Invalid Field.',
    });
    expect(taskOutcome({ status_code: 20000, status_message: 'Ok.', cost: 0, tasks: [] })).toEqual({
      kind: 'failed',
      error: 'empty task list',
    });
  });
});

describe('parseDfsDatetime and cleanOfficialUrl', () => {
  it('parses the API time format with its offset', () => {
    expect(parseDfsDatetime('2026-10-12 16:06:07 +00:00')).toBe('2026-10-12T16:06:07.000Z');
    expect(parseDfsDatetime('2026-10-12 18:06:07 +02:00')).toBe('2026-10-12T16:06:07.000Z');
    expect(parseDfsDatetime('12.10.2026')).toBeNull();
    expect(parseDfsDatetime(null)).toBeNull();
  });

  it('strips tracking parameters and rejects non-web URLs', () => {
    expect(cleanOfficialUrl('https://www.kempinski.com/en/hotel-adlon?utm_source=google#x')).toBe(
      'https://www.kempinski.com/en/hotel-adlon',
    );
    expect(cleanOfficialUrl('javascript:alert(1)')).toBeNull();
    expect(cleanOfficialUrl('not a url')).toBeNull();
    expect(cleanOfficialUrl(undefined)).toBeNull();
  });
});

describe('buildIngest', () => {
  it('turns a real result into eligible snapshots with stay totals', () => {
    const payload = buildIngest([{ task: adlonTask, outcome: adlon() }], aliases, NOW);
    expect(payload.tasks).toEqual([{ id: 't-adlon', status: 'done', error: null }]);
    expect(payload.snapshots.length).toBeGreaterThanOrEqual(15);
    for (const s of payload.snapshots) {
      expect(s.task_id).toBe('t-adlon');
      expect(s.stay_id).toBe(7);
      expect(s.captured_at).toBe('2026-10-12T16:06:07.000Z');
      expect(Number.isInteger(s.total_cents) && s.total_cents > 0).toBe(true);
      expect(s.provider_slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      const raw = s.raw as { nightly: boolean; nightlyCents: number };
      expect(raw.nightly).toBe(true);
      expect(s.total_cents).toBe(raw.nightlyCents * 2);
    }
    // One snapshot per provider.
    const slugs = payload.snapshots.map((s) => s.provider_slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs).toEqual(expect.arrayContaining(['booking-com', 'hotel-direct']));
  });

  it('creates pending providers for unknown sources, each once, with an alias', () => {
    const payload = buildIngest([{ task: adlonTask, outcome: adlon() }], aliases, NOW);
    expect(payload.providers.length).toBeGreaterThan(0);
    const slugs = payload.providers.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const p of payload.providers) {
      expect(aliases.has(p.alias)).toBe(false);
      expect(payload.snapshots.some((s) => s.provider_slug === p.slug)).toBe(true);
    }
    expect(slugs).not.toContain('booking-com');
  });

  it("fills the hotel's official website without tracking parameters", () => {
    const payload = buildIngest([{ task: adlonTask, outcome: adlon() }], aliases, NOW);
    expect(payload.official_urls).toEqual([
      { hotel_id: 1, url: 'https://www.kempinski.com/en/hotel-adlon' },
    ]);
  });

  it('skips pending tasks and records no_results and failures', () => {
    const t = (id: string): OpenTask => ({ ...adlonTask, id });
    const payload = buildIngest(
      [
        { task: t('a'), outcome: { kind: 'pending' } },
        { task: t('b'), outcome: { kind: 'no_results' } },
        { task: t('c'), outcome: { kind: 'failed', error: '40501 Invalid Field.' } },
      ],
      aliases,
      NOW,
    );
    expect(payload.tasks).toEqual([
      { id: 'b', status: 'no_results', error: null },
      { id: 'c', status: 'failed', error: '40501 Invalid Field.' },
    ]);
    expect(payload.snapshots).toEqual([]);
  });

  it('falls back to now when the result has no readable time', () => {
    const outcome = adlon();
    if (outcome.kind !== 'done') throw new Error('expected done');
    const payload = buildIngest(
      [
        {
          task: adlonTask,
          outcome: { kind: 'done', result: { ...outcome.result, datetime: null } },
        },
      ],
      aliases,
      NOW,
    );
    expect(payload.snapshots[0]?.captured_at).toBe(NOW);
  });

  it('marks a result without eligible offers as no_results', () => {
    const outcome = adlon();
    if (outcome.kind !== 'done') throw new Error('expected done');
    const prices = outcome.result.prices;
    const first = prices?.items?.[0];
    if (!prices || !first) throw new Error('expected prices');
    const item = { ...first, price: null };
    const payload = buildIngest(
      [
        {
          task: adlonTask,
          outcome: {
            kind: 'done',
            result: { ...outcome.result, prices: { ...prices, items: [item] } },
          },
        },
      ],
      aliases,
      NOW,
    );
    expect(payload.tasks).toEqual([{ id: 't-adlon', status: 'no_results', error: null }]);
    expect(payload.official_urls).toEqual([]);
  });
});
