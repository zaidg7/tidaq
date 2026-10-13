/**
 * CSV for spreadsheet exports (C-032b audit export). Semicolon-separated with a BOM, so German
 * Excel opens it with umlauts and columns intact; fields are quoted when needed (RFC 4180).
 * Cells that start with = + - @ are prefixed with ' so a spreadsheet never runs them as formulas.
 */
export function toCsv(rows: ReadonlyArray<ReadonlyArray<string | number | null>>): string {
  const cell = (v: string | number | null) => {
    if (v === null) return '';
    let s = String(v);
    if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return `\ufeff${rows.map((r) => r.map(cell).join(';')).join('\r\n')}\r\n`;
}
