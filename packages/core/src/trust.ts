/** Trust score display rules (DESIGN.md §3 TrustScore, PLAN §8). The score itself comes in C-032. */
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
