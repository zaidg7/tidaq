/**
 * Plain, robust emails (C-030): one heading, a few paragraphs, one button, a quiet footer. HTML
 * with inline styles for mail clients plus a text version. Every value is escaped, so hotel
 * names or user input can't inject markup.
 */
export interface MailContent {
  /** Short line shown next to the subject in inboxes. */
  preheader: string;
  heading: string;
  paragraphs: string[];
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

const FONT = "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif";

export function renderMail(c: MailContent): { html: string; text: string } {
  const p = (t: string) =>
    `<p style="margin:0 0 16px;${FONT};font-size:16px;line-height:1.5;color:#2a2440">${escapeHtml(t)}</p>`;
  const small = (t: string) =>
    `<p style="margin:0 0 8px;${FONT};font-size:12.5px;line-height:1.5;color:#6b6585">${escapeHtml(t)}</p>`;
  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#f5f3fc">
<span style="display:none;max-height:0;overflow:hidden">${escapeHtml(c.preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3fc"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:20px">
<tr><td style="padding:32px 28px">
<p style="margin:0 0 24px;${FONT};font-size:20px;font-weight:800;color:#1b1530">tidaq<span style="color:#6d4aff">.</span></p>
<h1 style="margin:0 0 16px;${FONT};font-size:22px;line-height:1.25;color:#1b1530">${escapeHtml(c.heading)}</h1>
${c.paragraphs.map(p).join('\n')}
<p style="margin:24px 0"><a href="${escapeHtml(c.button.url)}" style="display:inline-block;background:#6d4aff;color:#ffffff;${FONT};font-size:16px;font-weight:600;text-decoration:none;padding:14px 24px;border-radius:999px">${escapeHtml(c.button.label)}</a></p>
${small(c.button.url)}
${c.link ? `<p style="margin:16px 0 0;${FONT};font-size:16px;line-height:1.5"><a href="${escapeHtml(c.link.url)}" style="color:#6d4aff;font-weight:600">${escapeHtml(c.link.label)}</a></p>` : ''}
</td></tr></table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px"><tr><td style="padding:16px 28px">
${c.footer.map(small).join('\n')}
</td></tr></table>
</td></tr></table>
</body></html>`;
  const text = [
    c.heading,
    '',
    ...c.paragraphs.flatMap((t) => [t, '']),
    `${c.button.label}: ${c.button.url}`,
    ...(c.link ? ['', `${c.link.label}: ${c.link.url}`] : []),
    '',
    '—',
    ...c.footer,
  ].join('\n');
  return { html, text };
}
