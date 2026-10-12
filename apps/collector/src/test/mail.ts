/** Fake Resend API: records sent emails; `status` makes every call fail with that HTTP status. */
export function fakeMail(opts: { status?: number } = {}) {
  const sent: { from: string; to: string[]; subject: string; text: string }[] = [];
  const headers: Record<string, string>[] = [];
  const fetchFn = async (_url: string, init?: RequestInit): Promise<Response> => {
    if (opts.status) return new Response('error', { status: opts.status });
    sent.push(JSON.parse(String(init?.body)));
    headers.push((init?.headers ?? {}) as Record<string, string>);
    return Response.json({ id: `email-${sent.length}` });
  };
  return { fetchFn, sent, headers };
}
