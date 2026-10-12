import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DFS_NO_RESULTS,
  DFS_OK,
  dfsHotelInfoResponseSchema,
  dfsHotelSearchResponseSchema,
  dfsTasksReadyResponseSchema,
} from './dataforseo';

const FIXTURES = join(__dirname, '..', '..', '..', 'tests', 'fixtures', 'dataforseo');
const load = (name: string): unknown => JSON.parse(readFileSync(join(FIXTURES, name), 'utf8'));
const infoFiles = readdirSync(FIXTURES).filter((f) => f.startsWith('hotel_info-'));

describe('DataForSEO Hotel Info schema', () => {
  it('has spike fixtures to test against', () => {
    expect(infoFiles.length).toBeGreaterThanOrEqual(7);
  });

  it.each(infoFiles)('parses %s', (file) => {
    const parsed = dfsHotelInfoResponseSchema.parse(load(file));
    const task = parsed.tasks[0];
    expect(task?.status_code).toBe(DFS_OK);
    const result = task?.result?.[0];
    expect(result?.prices?.currency).toBe('EUR');
    const items = result?.prices?.items ?? [];
    expect(items.length).toBeGreaterThanOrEqual(20);
    expect(items.some((i) => i.official_site)).toBe(true);
    expect(items.every((i) => i.price === null || i.price > 0)).toBe(true);
  });

  it('reads the official website and query time', () => {
    const result = dfsHotelInfoResponseSchema.parse(load('hotel_info-info-adlon-dec-id.json'))
      .tasks[0]?.result?.[0];
    expect(result?.about?.url).toMatch(/^https:\/\/www\.kempinski\.com\//);
    expect(result?.datetime).toBe('2026-10-12 16:06:07 +00:00');
  });

  it('reads the price calendar', () => {
    const parsed = dfsHotelInfoResponseSchema.parse(
      load('hotel_info-info-adlon-dec-calendar-id.json'),
    );
    const calendar = parsed.tasks[0]?.result?.[0]?.prices?.prices_by_dates ?? [];
    expect(calendar.length).toBeGreaterThan(90);
    expect(calendar[0]).toMatchObject({ check_in_date: '2026-12-01 00:00:00 +00:00' });
  });

  it('accepts a task without results (keyword lookups returned 40102)', () => {
    const response = {
      status_code: DFS_OK,
      status_message: 'Ok.',
      cost: 0,
      tasks: [
        {
          id: 'x',
          status_code: DFS_NO_RESULTS,
          status_message: 'No Search Results.',
          cost: 0,
          data: { keyword: 'Hotel Adlon Kempinski Berlin', tag: 'info-adlon-weekend' },
          result: null,
        },
      ],
    };
    const parsed = dfsHotelInfoResponseSchema.parse(response);
    expect(parsed.tasks[0]?.result).toBeNull();
  });

  it('rejects a response with a wrong shape', () => {
    expect(
      dfsHotelInfoResponseSchema.safeParse({ status_code: 20000, tasks: 'nope' }).success,
    ).toBe(false);
  });
});

describe('DataForSEO Hotel Searches schema', () => {
  it('parses the spike search and finds the seed hotels', () => {
    const parsed = dfsHotelSearchResponseSchema.parse(
      load('hotel_searches-search-luxushotel-berlin.json'),
    );
    const items = parsed.tasks[0]?.result?.[0]?.items ?? [];
    expect(items).toHaveLength(18);
    const titles = items.map((i) => i.title);
    expect(titles).toEqual(
      expect.arrayContaining([
        'Hotel Adlon Kempinski Berlin',
        'The Ritz-Carlton',
        'Waldorf Astoria Berlin',
      ]),
    );
  });
});

describe('DataForSEO tasks_ready schema', () => {
  it('parses a recorded empty response', () => {
    const parsed = dfsTasksReadyResponseSchema.parse(load('tasks_ready-empty.json'));
    expect(parsed.status_code).toBe(DFS_OK);
    expect(parsed.tasks?.[0]?.result).toBeNull();
  });

  it('parses ready task ids and tags', () => {
    const parsed = dfsTasksReadyResponseSchema.parse({
      status_code: 20000,
      status_message: 'Ok.',
      tasks: [
        {
          status_code: 20000,
          status_message: 'Ok.',
          result: [
            { id: 'a', tag: '12', se: 'google', endpoint_advanced: '/v3/x' },
            { id: 'b', tag: null },
          ],
        },
      ],
    });
    expect(parsed.tasks?.[0]?.result?.map((r) => r.id)).toEqual(['a', 'b']);
  });
});
