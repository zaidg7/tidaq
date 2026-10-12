import type { GridStay } from '@tidaq/core';
import type { CatalogHotel, CollectorStore, RunKind, RunPatch, StayJob } from '../store';

interface StayRow {
  id: number;
  hotelId: number;
  checkIn: string;
  checkOut: string;
  adults: number;
  active: boolean;
  origin: string;
}

/** In-memory CollectorStore for tests. Mirrors the Supabase behaviour the run logic relies on. */
export function memoryStore(hotels: CatalogHotel[], opts: { watchedStayIds?: number[] } = {}) {
  const stays: StayRow[] = [];
  const runs: ({
    id: number;
    kind: RunKind;
    env: string;
    startedAt: string;
  } & Partial<RunPatch>)[] = [];
  const tasks: { id: string; runId: number; stayId: number; costUsd: number }[] = [];
  const watched = new Set(opts.watchedStayIds ?? []);
  const hotelById = new Map(hotels.map((h) => [h.id, h]));

  const store: CollectorStore = {
    async activeHotels() {
      return hotels;
    },
    async upsertGridStays(grid: readonly GridStay[]) {
      let inserted = 0;
      for (const s of grid) {
        const exists = stays.some(
          (r) =>
            r.hotelId === s.hotelId &&
            r.checkIn === s.checkIn &&
            r.checkOut === s.checkOut &&
            r.adults === s.adults,
        );
        if (!exists) {
          stays.push({ id: stays.length + 1, ...s, active: true, origin: 'grid' });
          inserted++;
        }
      }
      return inserted;
    },
    async deactivatePastStays(today) {
      let n = 0;
      for (const s of stays) {
        if (s.active && s.checkIn < today) {
          s.active = false;
          n++;
        }
      }
      return n;
    },
    async stayJobs(today) {
      return stays
        .filter((s) => s.active && s.checkIn >= today && hotelById.has(s.hotelId))
        .map((s): StayJob => ({
          stayId: s.id,
          checkIn: s.checkIn,
          checkOut: s.checkOut,
          adults: s.adults,
          hotelIdentifier: hotelById.get(s.hotelId)?.dfsHotelIdentifier ?? '',
          watched: watched.has(s.id),
        }));
    },
    async usage(today) {
      const month = today.slice(0, 7);
      let postedToday = 0;
      let spentThisMonthUsd = 0;
      for (const r of runs) {
        if (r.startedAt.startsWith(month)) spentThisMonthUsd += r.estCostUsd ?? 0;
        if (r.startedAt.startsWith(today)) postedToday += r.tasksPosted ?? 0;
      }
      return { postedToday, spentThisMonthUsd };
    },
    async startRun(kind, env, startedAt) {
      runs.push({ id: runs.length + 1, kind, env, startedAt });
      return runs.length;
    },
    async finishRun(runId, patch) {
      Object.assign(runs[runId - 1] ?? {}, patch);
    },
    async recordTasks(runId, posted) {
      tasks.push(...posted.map((t) => ({ ...t, runId })));
    },
  };
  return { store, stays, runs, tasks };
}

/** Fake DataForSEO task_post: accepts every task unless its stay id is in `failStayIds`. */
export function fakeDataForSeo(opts: { failStayIds?: number[]; httpStatus?: number[] } = {}) {
  const calls: {
    url: string;
    body: { tag: string; hotel_identifier: string }[];
    headers: Record<string, string>;
  }[] = [];
  const statuses = [...(opts.httpStatus ?? [])];
  const fetchFn = async (url: string, init?: RequestInit): Promise<Response> => {
    const body = JSON.parse(String(init?.body ?? '[]'));
    calls.push({ url, body, headers: (init?.headers ?? {}) as Record<string, string> });
    const status = statuses.shift() ?? 200;
    if (status !== 200) return new Response('error', { status });
    return Response.json({
      status_code: 20000,
      status_message: 'Ok.',
      cost: body.length * 0.0008,
      tasks: body.map((t: { tag: string }, i: number) =>
        opts.failStayIds?.includes(Number(t.tag))
          ? {
              id: `x-${i}`,
              status_code: 40501,
              status_message: 'Invalid Field',
              cost: 0,
              data: { tag: t.tag },
            }
          : {
              id: `task-${t.tag}`,
              status_code: 20100,
              status_message: 'Task Created.',
              cost: 0.0008,
              data: { tag: t.tag },
            },
      ),
    });
  };
  return { fetchFn, calls };
}
