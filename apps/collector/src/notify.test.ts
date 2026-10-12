import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PostRunSummary } from './morning';
import {
  ADMIN_FROM,
  adminRecipients,
  crashEmail,
  errorLines,
  postingEmail,
  sendAdminEmail,
} from './notify';
import { testEnv } from './test/env';
import { fakeMail } from './test/mail';

const summary = (over: Partial<PostRunSummary> = {}): PostRunSummary => ({
  runId: 1,
  kind: 'morning',
  today: '2026-10-13',
  gridStaysInserted: 0,
  staysDeactivated: 0,
  jobs: 396,
  posted: 300,
  skipped: 96,
  budgetReason: 'daily_cap',
  estCostUsd: 0.24,
  monthlyAlert: false,
  monthSpendUsd: 3.1,
  monthlyAlertCrossed: false,
  errors: [],
  ...over,
});

const mailEnv = testEnv({
  RESEND_API_KEY: 're_test',
  ADMIN_EMAILS: 'a@example.com, b@example.com',
});

afterEach(() => vi.restoreAllMocks());

describe('adminRecipients and errorLines', () => {
  it('splits, trims and drops invalid addresses', () => {
    expect(adminRecipients({ ADMIN_EMAILS: ' a@example.com,, nope ,b@x.de ' })).toEqual([
      'a@example.com',
      'b@x.de',
    ]);
    expect(adminRecipients({})).toEqual([]);
  });

  it('quotes the first 8 errors and counts the rest', () => {
    const lines = errorLines(Array.from({ length: 11 }, (_, i) => `e${i}`));
    expect(lines).toHaveLength(9);
    expect(lines[0]).toBe('- e0');
    expect(lines[8]).toBe('- … and 3 more');
  });
});

describe('sendAdminEmail', () => {
  it('posts a plain-text email to Resend from the collector address', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const mail = fakeMail();
    const res = await sendAdminEmail(
      mailEnv,
      { subject: 'Hi', lines: ['one', 'two'] },
      mail.fetchFn,
    );
    expect(res).toBe('sent');
    expect(mail.sent).toHaveLength(1);
    expect(mail.sent[0]).toMatchObject({
      from: ADMIN_FROM,
      to: ['a@example.com', 'b@example.com'],
      subject: '[staging] Hi',
    });
    expect(mail.sent[0]?.text).toMatch(/^one\ntwo\n/);
    expect(mail.headers[0]?.authorization).toBe('Bearer re_test');
  });

  it('skips without key or recipients and never logs addresses', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const mail = fakeMail();
    expect(await sendAdminEmail(testEnv(), { subject: 'x', lines: [] }, mail.fetchFn)).toBe(
      'skipped',
    );
    expect(
      await sendAdminEmail(
        testEnv({ RESEND_API_KEY: 're_test', ADMIN_EMAILS: '' }),
        { subject: 'x', lines: [] },
        mail.fetchFn,
      ),
    ).toBe('skipped');
    await sendAdminEmail(mailEnv, { subject: 'x', lines: [] }, mail.fetchFn);
    expect(mail.sent).toHaveLength(1);
    expect(log.mock.calls.flat().join(' ')).not.toContain('@example.com');
  });

  it('reports failures instead of throwing', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    expect(
      await sendAdminEmail(mailEnv, { subject: 'x', lines: [] }, fakeMail({ status: 500 }).fetchFn),
    ).toBe('failed');
    const boom = async () => {
      throw new Error('network');
    };
    expect(await sendAdminEmail(mailEnv, { subject: 'x', lines: [] }, boom)).toBe('failed');
  });
});

describe('postingEmail and crashEmail', () => {
  it('stays quiet for a clean run, also when the cap cut stays', () => {
    expect(postingEmail(summary())).toBeNull();
  });

  it('lists errors of a run', () => {
    const email = postingEmail(summary({ posted: 0, errors: ['stay 3: 40201 Paused.'] }));
    expect(email?.subject).toBe('Collector: morning run had 1 error(s)');
    expect(email?.lines).toEqual([
      'The morning run on 2026-10-13 posted 0 of 396 stays with 1 error(s):',
      '- stay 3: 40201 Paused.',
    ]);
  });

  it('warns once when the month crosses 80 % of the budget', () => {
    const email = postingEmail(summary({ monthlyAlertCrossed: true, monthSpendUsd: 9.71 }));
    expect(email?.subject).toBe('Collector: 80 % of the monthly data budget used');
    expect(email?.lines[0]).toContain('$9.71');
  });

  it('describes a crash', () => {
    expect(crashEmail('morning run', new Error('db down'))).toMatchObject({
      subject: 'Collector: morning run failed',
      lines: expect.arrayContaining(['- db down']),
    });
    expect(crashEmail('daily check', 'x').lines[1]).toBe('- x');
  });
});
