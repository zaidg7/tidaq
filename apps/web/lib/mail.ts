import 'server-only';

export interface Mail {
  to: string;
  subject: string;
  text: string;
  html: string;
  /** For logs only ("watch_confirm"); never the address. */
  kind: string;
  /** One-click unsubscribe (RFC 8058) for alert emails. */
  unsubscribeUrl?: string;
}

const FROM = 'Tidaq <alarm@tidaq.com>';

/**
 * Real emails only in production with a key and ALERTS_DRY_RUN not "true" (CLAUDE.md rule 5).
 * Everything else is a dry run: logged without the address, nothing sent.
 */
export function mailIsLive(): boolean {
  return (
    process.env.APP_ENV === 'production' &&
    process.env.ALERTS_DRY_RUN !== 'true' &&
    !!process.env.RESEND_API_KEY
  );
}

/** Sends one email through Resend (EU region). Returns false on failure; never throws. */
export async function sendMail(mail: Mail): Promise<boolean> {
  if (!mailIsLive()) {
    console.log(JSON.stringify({ msg: 'mail dry run', kind: mail.kind }));
    return true;
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: [mail.to],
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
        ...(mail.unsubscribeUrl && {
          headers: {
            'List-Unsubscribe': `<${mail.unsubscribeUrl}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          },
        }),
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.error(JSON.stringify({ msg: 'mail failed', kind: mail.kind, status: res.status }));
      return false;
    }
    return true;
  } catch (error) {
    console.error(JSON.stringify({ msg: 'mail failed', kind: mail.kind, error: String(error) }));
    return false;
  }
}
