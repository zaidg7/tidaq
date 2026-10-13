/**
 * Parses a euro amount typed by hand into integer cents (C-032 audit form). Accepts German and
 * English styles: "1.184", "1.184,50", "1184,5", "1,184.50", "1184.50 €". Null for anything
 * else or for amounts ≤ 0. "1.184" means 1,184 € (hotel totals are never 1.18 €).
 */
export function parseEuroCents(input: string): number | null {
  const s = input.replace(/[\s\u00a0€]/g, '');
  let normalized: string;
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(s)) {
    normalized = s.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(s)) {
    normalized = s.replace(/,/g, '');
  } else if (/^\d+([.,]\d{1,2})?$/.test(s)) {
    normalized = s.replace(',', '.');
  } else {
    return null;
  }
  const cents = Math.round(Number(normalized) * 100);
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}
