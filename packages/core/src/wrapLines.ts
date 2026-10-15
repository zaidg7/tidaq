/**
 * Splits `text` into at most `max` lines that fit `width`; the last one ends in "…" if cut.
 * For canvas images (C-080b story image); `measure` returns a string's width.
 */
export function wrapLines(
  measure: (s: string) => number,
  text: string,
  width: number,
  max: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (let i = 0; i < words.length; i++) {
    const next = line ? `${line} ${words[i]}` : (words[i] ?? '');
    if (measure(next) <= width || !line) {
      line = next;
      continue;
    }
    lines.push(line);
    line = words[i] ?? '';
    if (lines.length === max) {
      line = '';
      const last = lines[max - 1] ?? '';
      let cut = last;
      while (cut && measure(`${cut}…`) > width) cut = cut.slice(0, -1).trimEnd();
      lines[max - 1] = `${cut}…`;
      return lines;
    }
  }
  if (line) lines.push(line);
  return lines;
}
