import type { Instrumentation } from 'next';

/** Control flow Next throws on purpose (404s, redirects, dynamic bailouts): not errors. */
const EXPECTED = /^(NEXT_NOT_FOUND|NEXT_REDIRECT|NEXT_HTTP_ERROR_FALLBACK|DYNAMIC_SERVER_USAGE)/;

/**
 * Unhandled server errors (render, route handlers, server actions) go to the daily check like
 * handled ones (C-041c). Only the route pattern is stored, never the URL with its parameters.
 */
export const onRequestError: Instrumentation.onRequestError = async (error, _request, context) => {
  const digest = (error as { digest?: unknown }).digest;
  if (typeof digest === 'string' && EXPECTED.test(digest)) return;
  const { recordError } = await import('./lib/errors');
  await recordError('request failed', error, {
    route: context.routePath,
    type: context.routeType,
  });
};
