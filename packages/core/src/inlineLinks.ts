/**
 * Long texts in the message files (legal pages, C-027) mark links as `[label](href)`. This splits
 * a paragraph into plain and link parts. Only `https:`, `mailto:` and site paths (`/…`) become
 * links; anything else stays plain text, brackets included.
 */
export type InlinePart = { text: string; href?: string };

const LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g;
const SAFE = /^(https:\/\/|mailto:|\/(?!\/))/;

export function inlineLinks(text: string): InlinePart[] {
  const parts: InlinePart[] = [];
  let last = 0;
  for (const m of text.matchAll(LINK)) {
    const [whole, label = '', href = ''] = m;
    if (!SAFE.test(href)) continue;
    if (m.index > last) parts.push({ text: text.slice(last, m.index) });
    parts.push({ text: label, href });
    last = m.index + whole.length;
  }
  if (last < text.length || parts.length === 0) parts.push({ text: text.slice(last) });
  return parts;
}
