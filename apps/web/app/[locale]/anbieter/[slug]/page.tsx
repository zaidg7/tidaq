import { cache } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import {
  alternatesFor,
  hasProviderPage,
  localizedPath,
  providerPath,
  type Locale,
  type ProviderFact,
  type ProviderFacts,
} from '@tidaq/core';
import { ProviderView } from '@/components/provider/ProviderView';
import { StatusPage } from '@/components/shell/StatusPage';
import { buttonClasses } from '@/components/ui/Button';
import { getProviderFacts } from '@/lib/data/providers';

// Grid shares change every day and tests are added any time: render per request.
export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ locale: Locale; slug: string }> };

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// generateMetadata and the page both need the facts: one load per request.
const load = cache(() => getProviderFacts());

type Resolved =
  | { kind: 'unavailable'; locale: Locale; slug: string }
  | { kind: 'ok'; locale: Locale; slug: string; provider: ProviderFact; facts: ProviderFacts };

async function resolve({ params }: Props): Promise<Resolved> {
  const { locale, slug } = await params;
  if (!SLUG.test(slug)) notFound();
  const result = await load();
  if (result.kind === 'unavailable') return { kind: 'unavailable', locale, slug };
  const provider = result.facts.providers.find((p) => p.slug === slug);
  // Pending providers never come back from SQL; reviewed ones without data have no page.
  if (!provider || !hasProviderPage(provider)) notFound();
  return { kind: 'ok', locale, slug, provider, facts: result.facts };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const r = await resolve(props);
  if (r.kind !== 'ok') return {};
  const t = await getTranslations({ locale: r.locale, namespace: 'provider' });
  const name = r.provider.is_direct ? t('directName') : r.provider.name;
  return {
    title: t('metaTitle', { name }),
    description: t('metaDescription', { name }),
    alternates: alternatesFor(providerPath(r.slug), r.locale),
  };
}

export default async function ProviderPageRoute(props: Props) {
  const r = await resolve(props);
  setRequestLocale(r.locale);
  if (r.kind !== 'ok') {
    const t = await getTranslations({ locale: r.locale, namespace: 'stay' });
    return (
      <StatusPage
        eyebrow={t('unavailableEyebrow')}
        title={t('unavailableTitle')}
        text={t('unavailableText')}
      >
        <a
          href={localizedPath(providerPath(r.slug), r.locale)}
          className={buttonClasses({ size: 'lg' })}
        >
          {t('retry')}
        </a>
      </StatusPage>
    );
  }
  return <ProviderView provider={r.provider} facts={r.facts} />;
}
