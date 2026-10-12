import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// The seed aliases from supabase/migrations/20261012154726_seed_cities_providers.sql (subset).
export const SEED_ALIASES: Record<string, string> = {
  'booking.com': 'booking-com',
  booking: 'booking-com',
  expedia: 'expedia',
  'expedia.de': 'expedia',
  'hotels.com': 'hotels-com',
  'trip.com': 'trip-com',
  agoda: 'agoda',
  'agoda.com': 'agoda',
  check24: 'check24',
  'check24.de': 'check24',
};

const FIXTURES = join(__dirname, '..', '..', '..', '..', 'tests', 'fixtures', 'dataforseo');

/** A recorded Hotel Info `task_get` response, re-labelled with our task id. */
export function hotelInfoFixture(name: string, taskId: string): unknown {
  const json = JSON.parse(readFileSync(join(FIXTURES, name), 'utf8'));
  json.tasks[0].id = taskId;
  return json;
}

/** `task_get` envelope for a task with a status but no result (queued, no results, error). */
export function statusOnly(taskId: string, statusCode: number, message: string): unknown {
  return {
    status_code: 20000,
    status_message: 'Ok.',
    cost: 0,
    tasks: [
      {
        id: taskId,
        status_code: statusCode,
        status_message: message,
        cost: 0,
        data: {},
        result: null,
      },
    ],
  };
}

/**
 * Fake DataForSEO results API: `tasks_ready` lists `ready`; `task_get` answers from `responses`
 * (a number = that HTTP status). Unknown ids get "Task in Queue".
 */
export function fakeResults(opts: {
  ready?: string[];
  responses?: Record<string, unknown>;
  readyStatus?: number;
}) {
  const calls: string[] = [];
  const fetchFn = async (url: string): Promise<Response> => {
    calls.push(url);
    if (url.endsWith('/tasks_ready')) {
      if (opts.readyStatus) return new Response('error', { status: opts.readyStatus });
      return Response.json({
        status_code: 20000,
        status_message: 'Ok.',
        tasks: [
          {
            status_code: 20000,
            status_message: 'Ok.',
            result: (opts.ready ?? []).map((id) => ({ id, tag: null })),
          },
        ],
      });
    }
    const id = decodeURIComponent(url.split('/task_get/advanced/')[1] ?? '');
    const res = opts.responses?.[id] ?? statusOnly(id, 40602, 'Task In Queue.');
    if (typeof res === 'number') return new Response('error', { status: res });
    return Response.json(res);
  };
  return { fetchFn, calls };
}
