'use client';

import { useEffect } from 'react';
import { useMessages, useLocale } from 'next-intl';
import { localizedPath, type Locale } from '@tidaq/core';
import { StatusPage } from '@/components/shell/StatusPage';
import { Button, buttonClasses } from '@/components/ui/Button';
import { routes } from '@/lib/routes';

type Copy = { eyebrow: string; title: string; text: string; retry: string; home: string };

/**
 * Error boundary for every page. Reads the `error` messages that the layout passes to the client
 * provider as plain strings (no placeholders), so no message-format runtime ships to the browser.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = (useMessages() as { error: Copy }).error;
  const locale = useLocale() as Locale;

  useEffect(() => {
    // The digest links this to the server log line; never log user data here.
    console.error('page error', error.digest ?? error.message);
  }, [error]);

  return (
    <StatusPage eyebrow={t.eyebrow} title={t.title} text={t.text}>
      <Button size="lg" onClick={reset}>
        {t.retry}
      </Button>
      <a
        href={localizedPath(routes.home, locale)}
        className={buttonClasses({ variant: 'ghost', size: 'lg' })}
      >
        {t.home}
      </a>
    </StatusPage>
  );
}
