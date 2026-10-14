-- C-030a: price-alert watches with double opt-in (§ 7 UWG, PLAN §11). The web server calls these
-- with the service role only (never anon), after its own rate limit. Tokens are random UUIDs in
-- the confirmation and manage links; nothing here logs or returns more than the flow needs.

alter table public.watchers
  add column if not exists confirm_token uuid not null default gen_random_uuid(),
  add column if not exists manage_token uuid not null default gen_random_uuid(),
  add column if not exists confirm_sent_at timestamptz;
create unique index if not exists watchers_confirm_token_idx on public.watchers (confirm_token);
create unique index if not exists watchers_manage_token_idx on public.watchers (manage_token);

-- Create or update a watch. Returns { status, email_kind, confirm_token, manage_token, locale }:
--   status 'invalid' | 'too_many' | 'too_soon' | 'ok'
--   email_kind 'confirm' (new or unconfirmed address) | 'added' (confirmed address) | null
create or replace function public.watch_request(
  p_email text,
  p_locale text,
  p_hotel_slug text,
  p_check_in date,
  p_check_out date,
  p_adults integer,
  p_target_cents integer,
  p_consent_text text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  c_max_watches constant integer := 10;
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_today date := (now() at time zone 'Europe/Berlin')::date;
  v_hotel_id integer;
  v_stay_id bigint;
  v_watcher public.watchers%rowtype;
  v_count integer;
begin
  -- Unconfirmed addresses are forgotten after 7 days (C-030 "done when").
  delete from public.watchers w
   where w.confirmed_at is null and w.created_at < now() - interval '7 days';

  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v_email) > 254
     or p_locale not in ('de', 'en')
     or p_check_in is null or p_check_out is null or p_adults is null
     or p_adults not between 1 and 4
     or p_check_out <= p_check_in or p_check_out - p_check_in > 30
     or p_check_in < v_today or p_check_out > v_today + 365
     or (p_target_cents is not null and p_target_cents <= 0)
     or coalesce(btrim(p_consent_text), '') = '' then
    return jsonb_build_object('status', 'invalid');
  end if;

  select h.id into v_hotel_id from public.hotels h where h.slug = p_hotel_slug and h.active;
  if v_hotel_id is null then
    return jsonb_build_object('status', 'invalid');
  end if;

  -- The stay: tracked if there's capacity (request_stay), otherwise kept as an inactive row so
  -- the watch can point at it; alerts can still use the night grid (C-031).
  perform public.request_stay(p_hotel_slug, p_check_in, p_check_out, p_adults);
  insert into public.tracked_stays (hotel_id, check_in, check_out, adults, origin, active)
  values (v_hotel_id, p_check_in, p_check_out, p_adults, 'watch', false)
  on conflict (hotel_id, check_in, check_out, adults) do nothing;
  select ts.id into v_stay_id from public.tracked_stays ts
   where ts.hotel_id = v_hotel_id and ts.check_in = p_check_in
     and ts.check_out = p_check_out and ts.adults = p_adults;

  select * into v_watcher from public.watchers w where w.email = v_email for update;
  if not found then
    insert into public.watchers (email, locale, consent_text, consent_at)
    values (v_email, p_locale, p_consent_text, now())
    returning * into v_watcher;
  else
    if v_watcher.confirm_sent_at > now() - interval '1 minute' then
      return jsonb_build_object('status', 'too_soon');
    end if;
    update public.watchers
       set locale = p_locale, consent_text = p_consent_text, consent_at = now(),
           unsubscribed_at = null
     where id = v_watcher.id
     returning * into v_watcher;
  end if;

  select count(*) into v_count from public.watches wa
   where wa.watcher_id = v_watcher.id and wa.active and wa.stay_id <> v_stay_id;
  if v_count >= c_max_watches then
    return jsonb_build_object('status', 'too_many');
  end if;

  insert into public.watches (watcher_id, stay_id, target_cents, active)
  values (v_watcher.id, v_stay_id, p_target_cents, true)
  on conflict (watcher_id, stay_id)
  do update set target_cents = excluded.target_cents, active = true;

  update public.watchers set confirm_sent_at = now() where id = v_watcher.id;

  return jsonb_build_object(
    'status', 'ok',
    'email_kind', case when v_watcher.confirmed_at is null then 'confirm' else 'added' end,
    'confirm_token', v_watcher.confirm_token,
    'manage_token', v_watcher.manage_token,
    'locale', v_watcher.locale
  );
end;
$$;

-- Confirms an address from its email link. Returns { manage_token, locale } or null.
create or replace function public.watch_confirm(p_token uuid)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  update public.watchers w
     set confirmed_at = coalesce(w.confirmed_at, now())
   where w.confirm_token = p_token
     and w.unsubscribed_at is null
     and (w.confirmed_at is not null or w.created_at >= now() - interval '7 days')
  returning jsonb_build_object('manage_token', w.manage_token, 'locale', w.locale);
$$;

-- Everything the manage page shows. Null for an unknown token.
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

-- Stops one watch. True when something changed.
create or replace function public.watch_remove(p_token uuid, p_watch_id uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  with done as (
    update public.watches wa
       set active = false
      from public.watchers w
     where w.manage_token = p_token and wa.watcher_id = w.id and wa.id = p_watch_id
       and wa.active
    returning wa.id
  )
  select exists (select 1 from done);
$$;

-- Unsubscribes completely: the address and all its watches are deleted (privacy page §6).
create or replace function public.watch_unsubscribe(p_token uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  with done as (
    delete from public.watchers w where w.manage_token = p_token returning w.id
  )
  select exists (select 1 from done);
$$;

revoke all on function public.watch_request(text, text, text, date, date, integer, integer, text) from public, anon, authenticated;
revoke all on function public.watch_confirm(uuid) from public, anon, authenticated;
revoke all on function public.watch_manage(uuid) from public, anon, authenticated;
revoke all on function public.watch_remove(uuid, uuid) from public, anon, authenticated;
revoke all on function public.watch_unsubscribe(uuid) from public, anon, authenticated;
grant execute on function public.watch_request(text, text, text, date, date, integer, integer, text) to service_role;
grant execute on function public.watch_confirm(uuid) to service_role;
grant execute on function public.watch_manage(uuid) to service_role;
grant execute on function public.watch_remove(uuid, uuid) to service_role;
grant execute on function public.watch_unsubscribe(uuid) to service_role;
