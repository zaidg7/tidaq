-- C-054a: weekly deals newsletter, opt-in only. It shares the price-alert address (watchers):
-- one double opt-in (watch_confirm), one manage page, one unsubscribe link that deletes
-- everything. Its consent sentence and time are stored separately. Service role only.
alter table public.watchers
  add column if not exists newsletter boolean not null default false,
  add column if not exists newsletter_consent_text text,
  add column if not exists newsletter_at timestamptz;

-- Subscribe an address. Returns { status, email_kind, confirm_token, manage_token, locale }:
--   status 'invalid' | 'too_soon' | 'ok'
--   email_kind 'confirm' (new or unconfirmed address) | 'added' (confirmed, newly subscribed)
--              | 'already' (confirmed and subscribed before)
create or replace function public.newsletter_request(
  p_email text,
  p_locale text,
  p_consent_text text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_watcher public.watchers%rowtype;
  v_was_on boolean := false;
begin
  -- Unconfirmed addresses are forgotten after 7 days, as in watch_request (privacy page §6).
  delete from public.watchers w
   where w.confirmed_at is null and w.created_at < now() - interval '7 days';

  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v_email) > 254
     or p_locale not in ('de', 'en')
     or coalesce(btrim(p_consent_text), '') = '' then
    return jsonb_build_object('status', 'invalid');
  end if;

  select * into v_watcher from public.watchers w where w.email = v_email for update;
  if not found then
    insert into public.watchers
      (email, locale, consent_text, consent_at, newsletter, newsletter_consent_text, newsletter_at)
    values (v_email, p_locale, p_consent_text, now(), true, p_consent_text, now())
    returning * into v_watcher;
  else
    if v_watcher.confirm_sent_at > now() - interval '1 minute' then
      return jsonb_build_object('status', 'too_soon');
    end if;
    v_was_on := v_watcher.newsletter and v_watcher.confirmed_at is not null;
    update public.watchers
       set locale = p_locale, newsletter = true, newsletter_consent_text = p_consent_text,
           newsletter_at = now(), unsubscribed_at = null
     where id = v_watcher.id
     returning * into v_watcher;
  end if;

  update public.watchers set confirm_sent_at = now() where id = v_watcher.id;

  return jsonb_build_object(
    'status', 'ok',
    'email_kind', case
      when v_watcher.confirmed_at is null then 'confirm'
      when v_was_on then 'already'
      else 'added'
    end,
    'confirm_token', v_watcher.confirm_token,
    'manage_token', v_watcher.manage_token,
    'locale', v_watcher.locale
  );
end;
$$;

-- Stops the newsletter only (price alerts stay). True when something changed.
create or replace function public.newsletter_off(p_token uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  with done as (
    update public.watchers w
       set newsletter = false
     where w.manage_token = p_token and w.newsletter
    returning w.id
  )
  select exists (select 1 from done);
$$;

-- The manage page now also shows whether the newsletter is on.
create or replace function public.watch_manage(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'email', w.email,
    'locale', w.locale,
    'confirmed', w.confirmed_at is not null,
    'newsletter', w.newsletter,
    'watches', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', wa.id,
               'hotel_slug', h.slug,
               'hotel_name', h.name,
               'check_in', ts.check_in,
               'check_out', ts.check_out,
               'adults', ts.adults,
               'target_cents', wa.target_cents
             ) order by ts.check_in, h.name)
        from public.watches wa
        join public.tracked_stays ts on ts.id = wa.stay_id
        join public.hotels h on h.id = ts.hotel_id
       where wa.watcher_id = w.id and wa.active
    ), '[]'::jsonb)
  )
    from public.watchers w
   where w.manage_token = p_token;
$$;

revoke all on function public.newsletter_request(text, text, text) from public, anon, authenticated;
revoke all on function public.newsletter_off(uuid) from public, anon, authenticated;
grant execute on function public.newsletter_request(text, text, text) to service_role;
grant execute on function public.newsletter_off(uuid) to service_role;
