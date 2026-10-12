import { toIsoDate } from '@tidaq/core';
import type { FetchFn } from './dataforseo';
import type { Env } from './env';
import { errorLines, sendAdminEmail, type SendResult } from './notify';
import type { CollectorStore } from './store';

/** A run still unfinished after this long has crashed. */
const STUCK_AFTER_MINUTES = 30;

export interface DailyCheckSummary {
  today: string;
  /** Snapshots whose raw JSON was removed (D-19, older than 30 days). */
  pruned: number;
  problems: string[];
  email: SendResult | null;
}

const hhmm = (iso: string) => iso.slice(11, 16);

/**
 * Daily check after the morning collect window (C-013c): prunes raw JSON (D-19) and emails the
 * admins once if today's runs had errors, crashed, or left tasks without results.
 */
export async function runDailyCheck(opts: {
  store: CollectorStore;
  env: Env;
  now: Date;
  fetchFn?: FetchFn;
}): Promise<DailyCheckSummary> {
  const { store, env, now } = opts;
  const today = toIsoDate(now.getTime());
  const pruned = await store.pruneRaw();
  const report = await store.dayReport(today);
  const problems: string[] = [];

  if (!report.runs.some((r) => r.kind === 'morning' && r.env === env.APP_ENV)) {
    problems.push(`No morning run in ${env.APP_ENV} today.`);
  }
  const stuckBefore = now.getTime() - STUCK_AFTER_MINUTES * 60_000;
  for (const r of report.runs) {
    const label = `${r.kind} run (${r.env}, ${hhmm(r.startedAt)} UTC)`;
    if (!r.finishedAt && Date.parse(r.startedAt) < stuckBefore) {
      problems.push(`${label} never finished (crashed or timed out).`);
    }
    if (r.errors.length > 0) {
      problems.push(`${label}: ${r.errors.length} error(s)`, ...errorLines(r.errors));
    }
  }
  if (report.tasks.posted > 0) {
    problems.push(`${report.tasks.posted} task(s) posted today still have no result.`);
  }
  if (report.tasks.failed > 0) problems.push(`${report.tasks.failed} task(s) failed today.`);

  let email: SendResult | null = null;
  if (problems.length > 0) {
    const t = report.tasks;
    email = await sendAdminEmail(
      env,
      {
        subject: `Collector: daily check found problems (${today})`,
        lines: [
          `Tasks posted today: ${t.posted + t.done + t.noResults + t.failed} (done ${t.done}, no results ${t.noResults}, failed ${t.failed}, still open ${t.posted}).`,
          '',
          ...problems,
        ],
      },
      opts.fetchFn,
    );
  }
  return { today, pruned, problems, email };
}
