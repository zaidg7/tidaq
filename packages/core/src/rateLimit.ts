/**
 * Sliding-window rate limit in memory (C-030b, C-041b): at most `max` hits per key in `windowMs`.
 * Per Worker isolate, so a first line against floods, not an exact quota. Keys (an IP) live only
 * in memory and are never stored or logged. Past `maxKeys` the table starts over, so memory
 * stays bounded under a flood of distinct keys.
 */
export function createRateLimiter(opts: { max: number; windowMs: number; maxKeys?: number }) {
  const { max, windowMs, maxKeys = 5000 } = opts;
  const hits = new Map<string, number[]>();
  return {
    /** Counts a hit; true when the key is over the limit (the caller should refuse). */
    limited(key: string, now = Date.now()): boolean {
      const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
      recent.push(now);
      if (!hits.has(key) && hits.size >= maxKeys) hits.clear();
      hits.set(key, recent);
      return recent.length > max;
    },
  };
}

/** The visitor's IP from Cloudflare's header (or the first proxy hop locally); '' if unknown. */
export function clientIp(headers: { get(name: string): string | null }): string {
  return (
    headers.get('cf-connecting-ip') ?? headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? ''
  );
}
