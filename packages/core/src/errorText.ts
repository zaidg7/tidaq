/**
 * Error text without anything personal (CLAUDE.md §5, C-041c): email addresses and tokens (UUIDs)
 * are masked and query strings dropped, at most 500 characters. What's left names the failing
 * call, e.g. "Supabase 500 for v_stay_public".
 */
export function scrubErrorText(text: string): string {
  return text
    .replace(/[^\s@()]+@[^\s@()]+\.[^\s@()]+/g, '[email]')
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '[id]')
    .replace(/\?[^\s"')]*/g, '')
    .slice(0, 500);
}
