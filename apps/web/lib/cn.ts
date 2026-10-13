/**
 * Joins class names, skipping falsy values. It does not resolve conflicts (no tailwind-merge):
 * a passed `hidden` or `absolute` can lose against a component's own `inline-flex` or `relative`,
 * because the CSS order decides. Put such overrides on a wrapper element instead.
 */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
