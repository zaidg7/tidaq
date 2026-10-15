-- C-080k1: Preissturz-Alarm for one hotel. "Sag mir, wenn das Adlon plötzlich günstiger wird":
-- for people who saw one hotel in a video and want that one, any date. Same address, double
-- opt-in, manage page and unsubscribe as the city alarm (C-080e1); an address can follow up to 20
-- hotels. Deleting the address (watch_unsubscribe, the 7-day cleanup) deletes its hotels too.
-- Service role only.
create table public.drop_hotel_alerts (
  watcher_id uuid not null references public.watchers (id) on delete cascade,
  hotel_id integer not null references public.hotels (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (watcher_id, hotel_id)
);

alter table public.drop_hotel_alerts enable row level security;
revoke all on table public.drop_hotel_alerts from anon, authenticated;
create index drop_hotel_alerts_hotel on public.drop_hotel_alerts (hotel_id);

-- Follow a hotel's drops. Same answer as drop_alert_request:
-- { status 'invalid' | 'too_soon' | 'ok', email_kind 'confirm' | 'added' | 'already', tokens, locale }.
-- 'invalid' also when the address already follows 20 other hotels.
create or replace function public.drop_hotel_alert_request(
  p_email text,
  p_locale text,
  p_consent_text text,
  p_hotel text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_hotel integer;
  v_watcher public.watchers%rowtype;
  v_same boolean := false;
begin
  delete from public.watchers w
   where w.confirmed_at is null and w.created_at < now() - interval '7 days';

  select h.id into v_hotel from public.hotels h where h.slug = p_hotel and h.active;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v_email) > 254
     or p_locale not in ('de', 'en')
     or coalesce(btrim(p_consent_text), '') = ''
     or v_hotel is null then
    return jsonb_build_object('status', 'invalid');
  end if;

  select * into v_watcher from public.watchers w where w.email = v_email for update;
  if not found then
    insert into public.watchers (email, locale, consent_text, consent_at, drop_consent_text, drop_at)
    values (v_email, p_locale, p_consent_text, now(), p_consent_text, now())
    returning * into v_watcher;
  else
    if v_watcher.confirm_sent_at > now() - interval '1 minute' then
      return jsonb_build_object('status', 'too_soon');
    end if;
    v_same := v_watcher.confirmed_at is not null and exists (
      select 1 from public.drop_hotel_alerts a
       where a.watcher_id = v_watcher.id and a.hotel_id = v_hotel);
    if not v_same and (select count(*) from public.drop_hotel_alerts a
                        where a.watcher_id = v_watcher.id) >= 20 then
      return jsonb_build_object('status', 'invalid');
    end if;
    update public.watchers
       set locale = p_locale, drop_consent_text = p_consent_text, drop_at = now(),
           unsubscribed_at = null
     where id = v_watcher.id
     returning * into v_watcher;
  end if;

  insert into public.drop_hotel_alerts (watcher_id, hotel_id)
  values (v_watcher.id, v_hotel)
  on conflict do nothing;
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

-- Stops following one hotel (the city alarm and everything else stay). True when something changed.
create or replace function public.drop_hotel_alert_off(p_token uuid, p_hotel text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  with done as (
    delete from public.drop_hotel_alerts a
     using public.watchers w, public.hotels h
     where w.manage_token = p_token and a.watcher_id = w.id
       and h.slug = p_hotel and a.hotel_id = h.id
    returning a.hotel_id
  )
  select exists (select 1 from done);
$$;

-- The manage page also lists the followed hotels.
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
    'drop_hotels', coalesce((
      select jsonb_agg(jsonb_build_object('slug', h.slug, 'name', h.name) order by h.name)
        from public.drop_hotel_alerts a
        join public.hotels h on h.id = a.hotel_id
       where a.watcher_id = w.id
    ), '[]'::jsonb),
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

revoke all on function public.drop_hotel_alert_request(text, text, text, text) from public, anon, authenticated;
revoke all on function public.drop_hotel_alert_off(uuid, text) from public, anon, authenticated;
grant execute on function public.drop_hotel_alert_request(text, text, text, text) to service_role;
grant execute on function public.drop_hotel_alert_off(uuid, text) to service_role;
