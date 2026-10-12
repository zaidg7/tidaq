/**
 * C-010 DataForSEO spike. Run with Node 22 (type stripping). In cloud sessions prefix
 * NODE_USE_ENV_PROXY=1 so fetch goes through the agent proxy, which adds the auth header:
 *   node scripts/spike/dataforseo.ts balance   # free: account balance
 *   node scripts/spike/dataforseo.ts post      # round 1: search + Hotel Info by name (hard cap below)
 *   node scripts/spike/dataforseo.ts post-info # round 2: Hotel Info by hotel_identifier
 *   node scripts/spike/dataforseo.ts ready     # free: lists finished tasks
 *   node scripts/spike/dataforseo.ts get       # free: downloads results into tests/fixtures/dataforseo/
 *
 * Auth: in cloud sessions the agent proxy adds the Basic header, so no credentials are needed.
 * Elsewhere set DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD.
 *
 * Budget guard for the spike: at most MAX_TASKS paid tasks in total, tracked in the state file.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const API = 'https://api.dataforseo.com/v3';
const MAX_TASKS = 20;
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FIXTURES = join(ROOT, 'tests', 'fixtures', 'dataforseo');
const STATE = join(FIXTURES, 'spike-state.json');

const GERMANY = 2276;

interface PostedTask {
  id: string;
  endpoint: 'hotel_searches' | 'hotel_info';
  tag: string;
  postedAt: string;
}
interface State {
  posted: PostedTask[];
  balanceBefore?: number;
}

function headers(): Record<string, string> {
  const h: Record<string, string> = { 'content-type': 'application/json' };
  const { DATAFORSEO_LOGIN: login, DATAFORSEO_PASSWORD: password } = process.env;
  if (login && password) {
    h.authorization = `Basic ${Buffer.from(`${login}:${password}`).toString('base64')}`;
  }
  return h;
}

async function call(path: string, body?: unknown): Promise<any> {
  const res = await fetch(`${API}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: headers(),
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok || json.status_code !== 20000) {
    throw new Error(`${path}: HTTP ${res.status} ${json.status_code} ${json.status_message}`);
  }
  return json;
}

function loadState(): State {
  return existsSync(STATE) ? JSON.parse(readFileSync(STATE, 'utf8')) : { posted: [] };
}
function saveState(state: State): void {
  mkdirSync(FIXTURES, { recursive: true });
  writeFileSync(STATE, `${JSON.stringify(state, null, 2)}\n`);
}

async function balance(): Promise<number> {
  const json = await call('/appendix/user_data');
  return json.tasks[0].result[0].money.balance;
}

/** Next Friday → Sunday, counted from `today` (UTC). */
function nextWeekend(today: Date): [string, string] {
  const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const add = (5 - d.getUTCDay() + 7) % 7 || 7;
  d.setUTCDate(d.getUTCDate() + add);
  const fri = d.toISOString().slice(0, 10);
  d.setUTCDate(d.getUTCDate() + 2);
  return [fri, d.toISOString().slice(0, 10)];
}

// Identifiers from the Hotel Searches result (fixture hotel_searches-search-luxushotel-berlin.json).
// Hotel Info by `keyword` returned 40102 "No Search Results" for all three hotels (first run).
const HOTELS: [string, string][] = [
  ['adlon', 'ChUI2f3tmL_9t_IZGgkvbS8wOG1mdzIQAQ'],
  ['ritz-carlton', 'ChgIveLHqY3365ykARoLL2cvMTIzMjYwN3gQAQ'],
  ['waldorf', 'ChcIlb2fkJjIvrVsGgsvbS8wMTEzZmJ6ahAB'],
];

function spikeTasks(round: 'keyword' | 'identifier'): {
  endpoint: PostedTask['endpoint'];
  tag: string;
  task: object;
}[] {
  const [fri, sun] = nextWeekend(new Date());
  const stays: [string, string, string][] = [
    ['weekend', fri, sun],
    ['dec', '2026-12-01', '2026-12-03'],
  ];
  const base = { location_code: GERMANY, language_code: 'de', currency: 'EUR', adults: 2 };
  const tasks: { endpoint: PostedTask['endpoint']; tag: string; task: object }[] = [];
  if (round === 'keyword') {
    tasks.push({
      endpoint: 'hotel_searches',
      tag: 'search-luxushotel-berlin',
      task: {
        ...base,
        keyword: 'Luxushotel Berlin',
        check_in: '2026-12-01',
        check_out: '2026-12-03',
      },
    });
  }
  const names: Record<string, string> = {
    adlon: 'Hotel Adlon Kempinski Berlin',
    'ritz-carlton': 'The Ritz-Carlton Berlin',
    waldorf: 'Waldorf Astoria Berlin',
  };
  for (const [key, identifier] of HOTELS) {
    const hotel = round === 'keyword' ? { keyword: names[key] } : { hotel_identifier: identifier };
    for (const [stayKey, checkIn, checkOut] of stays) {
      tasks.push({
        endpoint: 'hotel_info',
        tag: `info-${key}-${stayKey}${round === 'identifier' ? '-id' : ''}`,
        task: { ...base, ...hotel, check_in: checkIn, check_out: checkOut },
      });
    }
  }
  // Price calendar test (double price): one hotel, one stay.
  tasks.push({
    endpoint: 'hotel_info',
    tag: `info-adlon-dec-calendar${round === 'identifier' ? '-id' : ''}`,
    task: {
      ...base,
      ...(round === 'keyword' ? { keyword: names.adlon } : { hotel_identifier: HOTELS[0]![1] }),
      check_in: '2026-12-01',
      check_out: '2026-12-03',
      load_prices_by_dates: true,
      prices_date_range: 'three_months',
    },
  });
  return tasks;
}

async function post(round: 'keyword' | 'identifier'): Promise<void> {
  const state = loadState();
  const tasks = spikeTasks(round);
  if (state.posted.length + tasks.length > MAX_TASKS) {
    throw new Error(
      `Budget guard: ${state.posted.length} posted, ${tasks.length} more would exceed ${MAX_TASKS}`,
    );
  }
  state.balanceBefore ??= await balance();
  for (const endpoint of ['hotel_searches', 'hotel_info'] as const) {
    const batch = tasks.filter((t) => t.endpoint === endpoint);
    if (batch.length === 0) continue;
    const json = await call(
      `/business_data/google/${endpoint}/task_post`,
      batch.map((t) => ({ ...t.task, tag: t.tag })),
    );
    for (const t of json.tasks) {
      if (t.status_code !== 20100)
        throw new Error(`${endpoint} task failed: ${t.status_code} ${t.status_message}`);
      state.posted.push({
        id: t.id,
        endpoint,
        tag: t.data.tag,
        postedAt: new Date().toISOString(),
      });
    }
    console.log(`${endpoint}: posted ${json.tasks.length} tasks, cost $${json.cost}`);
  }
  saveState(state);
}

async function ready(): Promise<void> {
  for (const endpoint of ['hotel_searches', 'hotel_info']) {
    const json = await call(`/business_data/google/${endpoint}/tasks_ready`);
    const items = json.tasks[0].result ?? [];
    console.log(
      `${endpoint}: ${items.length} ready`,
      items.map((i: any) => i.tag),
    );
  }
}

/** Removes anything that could identify the account from a saved response. */
function scrub(json: any): any {
  const copy = structuredClone(json);
  for (const t of copy.tasks ?? []) {
    delete t.data?.postback_url;
    delete t.data?.pingback_url;
  }
  return copy;
}

async function get(): Promise<void> {
  const state = loadState();
  for (const task of state.posted) {
    const file = join(FIXTURES, `${task.endpoint}-${task.tag}.json`);
    if (existsSync(file)) continue;
    const t0 = Date.now();
    const path =
      task.endpoint === 'hotel_info'
        ? `/business_data/google/hotel_info/task_get/advanced/${task.id}`
        : `/business_data/google/hotel_searches/task_get/${task.id}`;
    const json = await call(path).catch((err: Error) => ({ error: err.message }));
    const status = json.tasks?.[0]?.status_code;
    if (status !== 20000) {
      console.log(`${task.tag}: not ready (${status ?? json.error})`);
      continue;
    }
    writeFileSync(file, `${JSON.stringify(scrub(json), null, 2)}\n`);
    console.log(`${task.tag}: saved (${Date.now() - t0} ms), cost $${json.cost}`);
  }
}

const command = process.argv[2];
const commands: Record<string, () => Promise<unknown>> = {
  balance: async () => console.log(`balance $${await balance()}`),
  post: () => post('keyword'),
  'post-info': () => post('identifier'),
  ready,
  get,
};
const run = commands[command ?? ''];
if (!run) {
  console.error('usage: node scripts/spike/dataforseo.ts balance|post|post-info|ready|get');
  process.exit(1);
}
await run();
