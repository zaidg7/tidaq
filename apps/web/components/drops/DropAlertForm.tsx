'use client';

import { useActionState, useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { dropAlertAction, type DropAlertFormState } from '@/app/[locale]/preissturz/alertAction';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';

export type DropAlertFormLabels = {
  email: string;
  city: string;
  allCities: string;
  consent: string;
  privacy: string;
  privacyHref: string;
  submit: string;
  results: Record<Exclude<DropAlertFormState['status'], 'idle'>, string>;
  preview: string;
};

/**
 * Preissturz-Alarm sign-up (C-080e1): address, city (or all cities) and a consent box that is
 * never pre-ticked; double opt-in by email. Works without JavaScript as a plain form post.
 */
export function DropAlertForm({
  locale,
  cities,
  defaultCity,
  labels,
}: {
  locale: string;
  /** Every city we track, by name. */
  cities: { slug: string; name: string }[];
  /** Preselected city slug (the city page, the drop's city, the radar's filter). */
  defaultCity: string | null;
  labels: DropAlertFormLabels;
}) {
  const id = useId();
  const [state, action, pending] = useActionState(dropAlertAction, { status: 'idle' });
  const ok = state.status === 'sent' || state.status === 'added';
  const values = state.status === 'idle' ? undefined : state.values;

  if (ok) {
    return (
      <div role="status" className="rounded-cell bg-surface px-4 py-3 text-[14.5px]">
        <p className="font-semibold">{labels.results[state.status]}</p>
        {state.previewUrl && (
          <p className="mt-2 text-[13px]">
            <a href={state.previewUrl} className="font-semibold text-accent underline">
              {labels.preview}
            </a>
          </p>
        )}
      </div>
    );
  }

  return (
    <form key={JSON.stringify(values)} action={action} className="flex flex-col gap-3">
      <input type="hidden" name="locale" value={locale} />
      {/* Honeypot: hidden from people and screen readers; bots fill it. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor={`${id}-website`}>Website</label>
        <input id={`${id}-website`} name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="group relative flex min-h-[60px] items-center rounded-card border border-line bg-field px-3.5 py-2.5 transition-[border-color,background-color,box-shadow] duration-[180ms] ease-soft focus-within:border-accent focus-within:bg-surface focus-within:shadow-halo hover:border-line-strong">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <label
              htmlFor={`${id}-city`}
              className="text-[12.5px] leading-tight font-semibold text-muted-ink"
            >
              {labels.city}
            </label>
            <select
              id={`${id}-city`}
              name="city"
              defaultValue={values?.city ?? defaultCity ?? ''}
              className="w-full min-w-0 appearance-none bg-transparent pr-6 text-[16px] leading-snug font-bold text-fg focus:outline-none"
            >
              <option value="">{labels.allCities}</option>
              {cities.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <Icon
            icon={ChevronDown}
            size={18}
            className="pointer-events-none absolute right-3.5 text-muted"
          />
        </div>
        <TextField
          id={`${id}-email`}
          name="email"
          type="email"
          label={labels.email}
          autoComplete="email"
          inputMode="email"
          required
          defaultValue={values?.email}
        />
      </div>
      <label className="flex items-start gap-2.5 text-[13.5px] leading-snug text-muted-ink">
        <input
          type="checkbox"
          name="consent"
          required
          defaultChecked={values?.consent}
          className="mt-0.5 size-4 shrink-0 accent-[var(--accent)]"
        />
        <span>
          {labels.consent}{' '}
          <a
            href={labels.privacyHref}
            className="font-semibold text-accent underline-offset-2 hover:underline"
          >
            {labels.privacy}
          </a>
        </span>
      </label>
      {state.status !== 'idle' && (
        <p role="alert" className="text-[13.5px] font-semibold text-bad-ink">
          {labels.results[state.status]}
        </p>
      )}
      <Button type="submit" block loading={pending} className="sm:w-auto sm:self-start">
        {labels.submit}
      </Button>
    </form>
  );
}
