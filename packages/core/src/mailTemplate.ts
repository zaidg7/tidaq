/**
 * Tidaq emails (C-030, redesigned in C-083): a calm, premium card in the site's Soft Modern look.
 * Logo and an optional eyebrow pill, a big heading, short paragraphs, optional entries as cards
 * (with a green badge such as "−31 %"), one bulletproof button, a quiet footer. Table layout and
 * inline styles only, so Gmail, Apple Mail and Outlook render it the same; light colors are
 * pinned so dark-mode clients don't invert it into mud. Plus a text version. Every value is
 * escaped, so hotel names or user input can't inject markup.
 */
export interface MailContent {
  /** Short line shown next to the subject in inboxes. */
  preheader: string;
  /** Small label above the heading, e.g. "Preissturz-Alarm" (C-083). */
  eyebrow?: string;
  heading: string;
  paragraphs: string[];
  /** A list of linked entries after the paragraphs (e.g. the deals of the week). */
  items?: { title: string; meta: string; url: string; badge?: string }[];
  button: { label: string; url: string };
  /** A secondary text link under the button (e.g. the booking site in alert emails). */
  link?: { label: string; url: string };
  /** Small print, e.g. why you got this and how to stop it. */
  footer: string[];
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** The site's colors (globals.css, light theme). */
const C = {
  page: '#f5f3fc',
  card: '#ffffff',
  line: '#e6e0f7',
  fg: '#221c3b',
  body: '#3b3555',
  muted: '#6c6687',
  accent: '#6a49e0',
  accentSoft: '#ede7ff',
  good: '#126b4c',
  goodSoft: '#e3f3ec',
} as const;

const FONT =
  "font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

export function renderMail(c: MailContent): { html: string; text: string } {
  const e = escapeHtml;
  const p = (t: string) =>
    `<p style="margin:0 0 16px;${FONT};font-size:16px;line-height:1.6;color:${C.body}">${e(t)}</p>`;
  const small = (t: string) =>
    `<p style="margin:0 0 8px;${FONT};font-size:12.5px;line-height:1.6;color:${C.muted}">${e(t)}</p>`;
  const item = (i: NonNullable<MailContent['items']>[number]) => `
<tr><td style="padding:0 0 12px">
<a href="${e(i.url)}" style="display:block;text-decoration:none;border:1px solid ${C.line};border-radius:16px;background:${C.card}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td style="padding:16px 18px;${FONT}">
${i.badge ? `<span style="display:inline-block;margin:0 0 8px;padding:4px 10px;border-radius:999px;background:${C.goodSoft};color:${C.good};font-size:13px;font-weight:800;letter-spacing:-0.01em">${e(i.badge)}</span><br>` : ''}
<span style="font-size:16px;line-height:1.35;font-weight:700;color:${C.fg}">${e(i.title)}</span><br>
<span style="font-size:14px;line-height:1.5;color:${C.muted}">${e(i.meta)}</span>
</td>
<td width="36" align="right" style="padding:0 18px 0 0;${FONT};font-size:20px;color:${C.accent}">&#8594;</td>
</tr></table>
</a>
</td></tr>`;
  const items = c.items?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 8px">${c.items.map(item).join('')}</table>`
    : '';
  // Bulletproof button: a table cell with the color, so Outlook keeps the padding and shape.
  const button = `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 12px"><tr>
<td align="center" bgcolor="${C.accent}" style="border-radius:999px;background:${C.accent}">
<a href="${e(c.button.url)}" style="display:inline-block;padding:15px 28px;${FONT};font-size:16px;font-weight:700;line-height:1;color:#ffffff;text-decoration:none;border-radius:999px">${e(c.button.label)}&nbsp;&#8594;</a>
</td></tr></table>`;
  const html = `<!doctype html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light">
<title>${e(c.heading)}</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:${C.page};-webkit-text-size-adjust:100%">
<span style="display:none;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all">${e(c.preheader)}&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.page}" style="background:${C.page}"><tr><td align="center" style="padding:36px 14px 28px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td style="padding:0 6px 18px;${FONT};font-size:22px;font-weight:800;letter-spacing:-0.03em;color:${C.fg}">tidaq<span style="color:${C.accent}">.</span></td></tr>
<tr><td bgcolor="${C.card}" style="background:${C.card};border:1px solid ${C.line};border-radius:24px;overflow:hidden">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td height="5" bgcolor="${C.accent}" style="height:5px;line-height:5px;font-size:0;background:${C.accent};background-image:linear-gradient(90deg,${C.accent},#a48bff)">&nbsp;</td></tr>
<tr><td style="padding:32px 30px 30px">
${c.eyebrow ? `<span style="display:inline-block;margin:0 0 16px;padding:6px 12px;border-radius:999px;background:${C.accentSoft};${FONT};font-size:12.5px;font-weight:700;letter-spacing:0.02em;color:${C.accent}">${e(c.eyebrow)}</span>` : ''}
<h1 style="margin:0 0 16px;${FONT};font-size:26px;line-height:1.2;font-weight:800;letter-spacing:-0.02em;color:${C.fg}">${e(c.heading)}</h1>
${c.paragraphs.map(p).join('\n')}
${items}
${button}
<p style="margin:0;${FONT};font-size:12px;line-height:1.5;color:${C.muted};word-break:break-all"><a href="${e(c.button.url)}" style="color:${C.muted};text-decoration:underline">${e(c.button.url)}</a></p>
${c.link ? `<p style="margin:20px 0 0;${FONT};font-size:15px;line-height:1.5"><a href="${e(c.link.url)}" style="color:${C.accent};font-weight:700;text-decoration:none">${e(c.link.label)}&nbsp;&#8594;</a></p>` : ''}
</td></tr></table>
</td></tr>
<tr><td style="padding:22px 12px 0">
${c.footer.map(small).join('\n')}
<p style="margin:12px 0 0;${FONT};font-size:12px;line-height:1.5;color:${C.muted}">tidaq.com</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
  const text = [
    ...(c.eyebrow ? [c.eyebrow.toUpperCase(), ''] : []),
    c.heading,
    '',
    ...c.paragraphs.flatMap((t) => [t, '']),
    ...(c.items ?? []).flatMap((i) => [
      i.badge ? `${i.badge} · ${i.title}` : i.title,
      i.meta,
      i.url,
      '',
    ]),
    `${c.button.label}: ${c.button.url}`,
    ...(c.link ? ['', `${c.link.label}: ${c.link.url}`] : []),
    '',
    '—',
    ...c.footer,
  ].join('\n');
  return { html, text };
}
