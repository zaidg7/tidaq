import type { Instrumentation } from 'next';

/**
 * Unhandled server errors (render, route handlers, server actions) go to the daily check like
 * handled ones (C-041c). Only the route pattern is stored, never the URL with its parameters.
 */
export const onRequestError: Instrumentation.onRequestError = async (error, _request, context) => {
  const { recordError } = await import('./lib/errors');
  await recordError('request failed', error, {
    route: context.routePath,
    type: context.routeType,
  });
};
