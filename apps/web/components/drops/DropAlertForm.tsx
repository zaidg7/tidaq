'use client';

import { useActionState, useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { dropAlertAction, type DropAlertFormState } from '@/app/[locale]/preissturz/alertAction';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { HOTEL_PREFIX } from './alertId';
import { Turnstile } from '@/components/ui/Turnstile';

export type DropAlertFormLabels = {
  email: string;
  city: string;
  /** The select's label when one hotel is offered: "Alarm für" (C-080k1). */
  scope: string;
  /** "Nur Hotel Adlon Kempinski" (C-080k1). */
  onlyHotel?: string;
  allCities: string;
  consent: string;
  privacy: string;
  privacyHref: string;
  submit: string;
  results: Record<Exclude<DropAlertFormState['status'], 'idle'>, string>;
  preview: string;
  /** The `bar` layout's short texts: "E-Mail", "du@beispiel.de", "Aktivieren", and the phone
   *  button "Price Alert aktivieren". */
  bar?: { email: string; placeholder: string; submit: string; submitPhone: string };
};

/**
 * Preissturz-Alarm sign-up (C-080e1): address, city (or all cities) and a consent box that is
 * never pre-ticked; double opt-in by email. Works without JavaScript as a plain form post.
 */
export function DropAlertForm({
  locale,
  cities,
  defaultCity,
  hotel = null,
  labels,
  variant = 'card',
}: {
  locale: string;
  /** Every city we track, by name. */
  cities: { slug: string; name: string }[];
  /** Preselected city slug (the city page, the drop's city, the radar's filter). */
  defaultCity: string | null;
  /** Offer "only this hotel" first and preselect it (drop pages, hotel pages; C-080k1). */
  hotel?: { slug: string; name: string } | null;
  labels: DropAlertFormLabels;
  /** `bar`: one white line (E-Mail | Stadt | Aktivieren) on a dark section (homepage, mockup B);
   *  on phones the fields stack inside the white card. */
  /** `hotel` (drop page, mockup B): only the email and a dark button; the alert is for `hotel`. */
  variant?: 'card' | 'bar' | 'hotel';
}) {
  const id = useId();
  const [state, action, pending] = useActionState(dropAlertAction, { status: 'idle' });
  const ok = state.status === 'sent' || state.status === 'added';
  const values = state.status === 'idle' ? undefined : state.values;

  if (ok) {
    return (
      <div
        role="status"
        className={
          variant === 'bar'
            ? 'rounded-[22px] border border-white/14 bg-white/10 px-5 py-4 text-[15px] text-white'
            : 'rounded-cell bg-surface px-4 py-3 text-[14.5px]'
        }
      >
        <p className="font-semibold">{labels.results[state.status]}</p>
        {state.previewUrl && (
          <p className="mt-2 text-[13px]">
            <a
              href={state.previewUrl}
              className={
                variant === 'bar'
                  ? 'font-semibold underline'
                  : 'font-semibold text-accent underline'
              }
            >
              {labels.preview}
            </a>
          </p>
        )}
      </div>
    );
  }

  const honeypot = (
    // Hidden from people and screen readers; bots fill it.
    <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
      <label htmlFor={`${id}-website`}>Website</label>
      <input id={`${id}-website`} name="website" tabIndex={-1} autoComplete="off" />
    </div>
  );

  if (variant === 'hotel' && hotel && labels.bar) {
    return (
      <form key={JSON.stringify(values)} action={action} className="relative flex flex-col gap-2.5">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="city" value={`${HOTEL_PREFIX}${hotel.slug}`} />
        {honeypot}
        <label htmlFor={`${id}-email`} className="text-[14px] font-semibold">
          {labels.bar.email}
        </label>
        <input
          id={`${id}-email`}
          name="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          placeholder={labels.bar.placeholder}
          defaultValue={values?.email}
          aria-describedby={state.status !== 'idle' ? `${id}-error` : undefined}
          className="min-h-[52px] rounded-[14px] border border-line-strong bg-surface px-4 text-[17px] text-ink transition-[border-color,box-shadow] duration-[var(--t-fast)] placeholder:text-faint focus:border-accent focus:shadow-halo focus:outline-none"
        />
        <label className="mt-1 flex items-start gap-2.5 text-[13.5px] leading-snug text-muted">
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
          <p id={`${id}-error`} role="alert" className="text-[13.5px] font-semibold text-high">
            {labels.results[state.status]}
          </p>
        )}
        <Turnstile locale={locale} />
        <Button type="submit" variant="dark" block loading={pending} className="min-h-[54px]">
          {labels.bar.submitPhone}
        </Button>
      </form>
    );
  }

  if (variant === 'bar' && labels.bar) {
    const b = labels.bar;
    return (
      <form key={JSON.stringify(values)} action={action} className="relative">
        <input type="hidden" name="locale" value={locale} />
        {honeypot}
        <div className="flex flex-col rounded-[22px] bg-surface p-2 text-ink sm:flex-row sm:items-stretch">
          <div className="flex flex-col justify-center px-3.5 py-2 sm:flex-[1_1_200px] sm:py-1.5">
            <label htmlFor={`${id}-email`} className="text-[12px] font-semibold">
              {b.email}
            </label>
            <input
              id={`${id}-email`}
              name="email"
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              placeholder={b.placeholder}
              defaultValue={values?.email}
              aria-describedby={state.status !== 'idle' ? `${id}-error` : undefined}
              className="w-full min-w-0 bg-transparent text-[17px] text-ink placeholder:text-faint focus:outline-none"
            />
          </div>
          <div className="relative flex flex-col justify-center border-t border-line px-3.5 py-2 sm:flex-[0_1_170px] sm:border-t-0 sm:border-l sm:py-1.5">
            <label htmlFor={`${id}-city`} className="text-[12px] font-semibold">
              {hotel ? labels.scope : labels.city}
            </label>
            <select
              id={`${id}-city`}
              name="city"
              defaultValue={
                values?.city ?? (hotel ? `${HOTEL_PREFIX}${hotel.slug}` : (defaultCity ?? ''))
              }
              className="w-full min-w-0 appearance-none bg-transparent pr-6 text-[17px] text-ink focus:outline-none"
            >
              {hotel && labels.onlyHotel && (
                <option value={`${HOTEL_PREFIX}${hotel.slug}`}>{labels.onlyHotel}</option>
              )}
              <option value="">{labels.allCities}</option>
              {cities.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
            <Icon
              icon={ChevronDown}
              size={16}
              className="pointer-events-none absolute right-3 bottom-3.5 text-muted"
            />
          </div>
          <Button type="submit" loading={pending} className="mt-2 min-h-14 sm:mt-0 sm:px-6">
            <span className="sm:hidden">{b.submitPhone}</span>
            <span className="hidden sm:inline">{b.submit}</span>
          </Button>
        </div>
        <label className="mt-3.5 flex items-start gap-2.5 text-[13.5px] leading-snug text-night-ink/70">
          <input
            type="checkbox"
            name="consent"
            required
            defaultChecked={values?.consent}
            className="mt-0.5 size-4 shrink-0 accent-[var(--good-bright)]"
          />
          <span>
            {labels.consent}{' '}
            <a
              href={labels.privacyHref}
              className="font-semibold text-white underline-offset-2 hover:underline"
            >
              {labels.privacy}
            </a>
          </span>
        </label>
        {state.status !== 'idle' && (
          <p
            id={`${id}-error`}
            role="alert"
            className="mt-3 text-[14px] font-semibold text-[#ffb4a8]"
          >
            {labels.results[state.status]}
          </p>
        )}
        <Turnstile locale={locale} />
      </form>
    );
  }

  return (
    <form key={JSON.stringify(values)} action={action} className="flex flex-col gap-3">
      <input type="hidden" name="locale" value={locale} />
      {honeypot}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="group relative flex min-h-[60px] items-center rounded-card border border-line bg-field px-3.5 py-2.5 transition-[border-color,background-color,box-shadow] duration-[180ms] ease-soft focus-within:border-accent focus-within:bg-surface focus-within:shadow-halo hover:border-line-strong">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <label
              htmlFor={`${id}-city`}
              className="text-[12.5px] leading-tight font-semibold text-muted-ink"
            >
              {hotel ? labels.scope : labels.city}
            </label>
            <select
              id={`${id}-city`}
              name="city"
              defaultValue={
                values?.city ?? (hotel ? `${HOTEL_PREFIX}${hotel.slug}` : (defaultCity ?? ''))
              }
              className="w-full min-w-0 appearance-none bg-transparent pr-6 text-[16px] leading-snug font-bold text-fg focus:outline-none"
            >
              {hotel && labels.onlyHotel && (
                <option value={`${HOTEL_PREFIX}${hotel.slug}`}>{labels.onlyHotel}</option>
              )}
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
      <Turnstile locale={locale} />
      <Button type="submit" block loading={pending} className="sm:w-auto sm:self-start">
        {labels.submit}
      </Button>
    </form>
  );
}
