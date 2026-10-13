/** Trust score display rules (DESIGN.md §3 TrustScore, PLAN §8) and the score itself (C-032). */
export const TRUST = {
  /** Below this many checkout tests the score is not shown ("Noch zu wenig Tests"). */
  minTests: 5,
  /** Score ≥ high: green. */
  high: 85,
  /** Score ≥ mid (and < high): neutral. Below: red. */
  mid: 60,
} as const;

export type TrustLevel = 'high' | 'mid' | 'low' | 'insufficient';

/** Display level for a 0–100 trust score based on `tests` checkout tests. */
export function trustLevel(score: number | null, tests: number): TrustLevel {
  if (score === null || !Number.isFinite(score) || tests < TRUST.minTests) return 'insufficient';
  if (score >= TRUST.high) return 'high';
  if (score >= TRUST.mid) return 'mid';
  return 'low';
}

/** Score parameters (PLAN §8.2). */
export const TRUST_SCORE = {
  /** A test passes when the checkout total is at most this much above the listed price. */
  passMarkup: 0.01,
  /** Penalty points per unit of average markup of the failed tests, capped. */
  penaltyFactor: 200,
  penaltyCap: 40,
  /** Bayesian shrinkage towards `prior` with the weight of `priorTests` tests. */
  prior: 70,
  priorTests: 5,
} as const;

export interface TrustTestPrices {
  listedCents: number;
  /** Null when the price could not be booked. */
  checkoutCents: number | null;
}

/** (checkout − listed) / listed; null when the price could not be booked. */
export function checkoutMarkup(t: TrustTestPrices): number | null {
  if (t.checkoutCents === null || t.listedCents <= 0) return null;
  return (t.checkoutCents - t.listedCents) / t.listedCents;
}

/** The outcome stored with a test, derived from the two prices (±1 % counts as a match). */
export function trustOutcome(t: TrustTestPrices): 'match' | 'higher' | 'lower' | 'unavailable' {
  const m = checkoutMarkup(t);
  if (m === null) return 'unavailable';
  if (m > TRUST_SCORE.passMarkup) return 'higher';
  if (m < -TRUST_SCORE.passMarkup) return 'lower';
  return 'match';
}

export interface ProviderScore {
  tests: number;
  /** Tests that passed: bookable at most 1 % above the listed price. */
  matches: number;
  /** Mean markup over bookable tests in percent (1 decimal), for "erwartet an der Kasse". */
  avgMarkupPct: number | null;
  score: number;
}

/** Trust score of one provider from its checkout tests (PLAN §8.2); null without tests. */
export function providerScore(tests: readonly TrustTestPrices[]): ProviderScore | null {
  const n = tests.length;
  if (n === 0) return null;
  const markups = tests.map(checkoutMarkup);
  const passed = markups.filter((m) => m !== null && m <= TRUST_SCORE.passMarkup).length;
  const accuracy = passed / n;

  const failedMarkups = markups.filter(
    (m): m is number => m !== null && m > TRUST_SCORE.passMarkup,
  );
  const meanFailed =
    failedMarkups.length > 0 ? failedMarkups.reduce((s, m) => s + m, 0) / failedMarkups.length : 0;
  const penalty = Math.min(TRUST_SCORE.penaltyCap, meanFailed * TRUST_SCORE.penaltyFactor);
  const raw = Math.min(100, Math.max(0, 100 * accuracy - penalty * (1 - accuracy)));
  const score = Math.round(
    (n * raw + TRUST_SCORE.priorTests * TRUST_SCORE.prior) / (n + TRUST_SCORE.priorTests),
  );

  const bookable = markups.filter((m): m is number => m !== null);
  const avgMarkupPct =
    bookable.length > 0
      ? Math.round((bookable.reduce((s, m) => s + m, 0) / bookable.length) * 1000) / 10
      : null;

  return { tests: n, matches: passed, avgMarkupPct, score };
}
