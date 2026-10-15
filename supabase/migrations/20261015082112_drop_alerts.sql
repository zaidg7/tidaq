-- C-080e1: Preissturz-Alarm sign-up. "Schick mir Preisstürze in Paris" (or in all cities), opt-in
-- only, on the same address as price alerts and the newsletter (watchers): one double opt-in
-- (watch_confirm), one manage page, one unsubscribe link that deletes everything. Its consent
-- sentence and time are stored separately. drop_sent_on keeps the send to one email per day
-- (C-080e2). Service role only.
alter table public.watchers
  add column if not exists drop_alerts boolean not null default false,
  add column if not exists drop_city text,
  add column if not exists drop_consent_text text,
  add column if not exists drop_at timestamptz,
  add column if not exists drop_sent_on date;

comment on column public.watchers.drop_city is
  'City slug for the Preissturz-Alarm (C-080e); null = all cities.';

-- Subscribe an address. p_city: a city slug, or null/'' for all cities. Returns
-- { status, email_kind, confirm_token, manage_token, locale }:
--   status 'invalid' | 'too_soon' | 'ok'
--   email_kind 'confirm' (new or unconfirmed address) | 'added' (confirmed, newly subscribed or
--              another city) | 'already' (confirmed, same choice as before)
create or replace function public.drop_alert_request(
  p_email text,
  p_locale text,
  p_consent_text text,
  p_city text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_city text := nullif(btrim(coalesce(p_city, '')), '');
  v_watcher public.watchers%rowtype;
  v_same boolean := false;
begin
  -- Unconfirmed addresses are forgotten after 7 days, as in watch_request (privacy page §6).
  delete from public.watchers w
   where w.confirmed_at is null and w.created_at < now() - interval '7 days';

  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v_email) > 254
     or p_locale not in ('de', 'en')
     or coalesce(btrim(p_consent_text), '') = ''
     or (v_city is not null and not exists (select 1 from public.cities c where c.slug = v_city)) then
    return jsonb_build_object('status', 'invalid');
  end if;

  select * into v_watcher from public.watchers w where w.email = v_email for update;
  if not found then
    insert into public.watchers
      (email, locale, consent_text, consent_at, drop_alerts, drop_city, drop_consent_text, drop_at)
    values (v_email, p_locale, p_consent_text, now(), true, v_city, p_consent_text, now())
    returning * into v_watcher;
  else
    if v_watcher.confirm_sent_at > now() - interval '1 minute' then
      return jsonb_build_object('status', 'too_soon');
    end if;
    v_same := v_watcher.drop_alerts and v_watcher.confirmed_at is not null
              and v_watcher.drop_city is not distinct from v_city;
    update public.watchers
       set locale = p_locale, drop_alerts = true, drop_city = v_city,
           drop_consent_text = p_consent_text, drop_at = now(), unsubscribed_at = null
     where id = v_watcher.id
     returning * into v_watcher;
  end if;

  update public.watchers set confirm_sent_at = now() where id = v_watcher.id;

  return jsonb_build_object(
    'status', 'ok',
    'email_kind', case
      when v_watcher.confirmed_at is null then 'confirm'
      when v_same then 'already'
      else 'added'
    end,
    'confirm_token', v_watcher.confirm_token,
    'manage_token', v_watcher.manage_token,
    'locale', v_watcher.locale
  );
end;
$$;

-- Stops the Preissturz-Alarm only (price alerts and newsletter stay). True when something changed.
create or replace function public.drop_alert_off(p_token uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  with done as (
    update public.watchers w
       set drop_alerts = false
     where w.manage_token = p_token and w.drop_alerts
    returning w.id
  )
  select exists (select 1 from done);
$$;

-- The manage page now also shows the Preissturz-Alarm and its city.
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
    'drop_alerts', w.drop_alerts,
    'drop_city', case when c.slug is null then null else jsonb_build_object(
      'slug', c.slug, 'name_de', c.name_de, 'name_en', c.name_en) end,
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
    left join public.cities c on c.slug = w.drop_city
   where w.manage_token = p_token;
$$;

revoke all on function public.drop_alert_request(text, text, text, text) from public, anon, authenticated;
revoke all on function public.drop_alert_off(uuid) from public, anon, authenticated;
grant execute on function public.drop_alert_request(text, text, text, text) to service_role;
grant execute on function public.drop_alert_off(uuid) to service_role;
