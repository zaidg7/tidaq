-- Tidaq schema v1 (PLAN §6). Money in integer EUR cents, timestamps in UTC, stay dates as `date`.

-- ─── Catalog ────────────────────────────────────────────────────────────────

create table public.cities (
  id smallint generated always as identity primary key,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name_de text not null,
  name_en text not null,
  country_code char(2) not null check (country_code ~ '^[A-Z]{2}$')
);

create table public.hotels (
  id integer generated always as identity primary key,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  city_id smallint not null references public.cities (id),
  stars smallint not null default 5 check (stars between 1 and 5),
  dfs_hotel_identifier text unique,          -- DataForSEO / Google hotel id
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  official_url text,
  image_url text,
  image_credit text,                          -- licensed images only (PLAN §11)
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (image_url is null or image_credit is not null)
);
create index hotels_city_id_idx on public.hotels (city_id);

create table public.providers (
  id integer generated always as identity primary key,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  domain text,
  is_direct boolean not null default false,
  -- Unknown API sources are auto-created as pending providers (C-014) and reviewed in /admin.
  pending boolean not null default false,
  affiliate_template text,                    -- URL template with {url}, filled when approved
  created_at timestamptz not null default now()
);

-- Maps raw API source names to providers. Aliases are stored lowercased and trimmed.
create table public.provider_aliases (
  alias text primary key check (alias = lower(btrim(alias)) and alias <> ''),
  provider_id integer not null references public.providers (id) on delete cascade
);
create index provider_aliases_provider_id_idx on public.provider_aliases (provider_id);

-- ─── What we track ──────────────────────────────────────────────────────────

create table public.tracked_stays (
  id bigint generated always as identity primary key,
  hotel_id integer not null references public.hotels (id),
  check_in date not null,
  check_out date not null,
  adults smallint not null default 2 check (adults between 1 and 4),
  origin text not null check (origin in ('grid', 'watch', 'manual')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (hotel_id, check_in, check_out, adults),
  check (check_out > check_in and check_out - check_in <= 30)
);
create index tracked_stays_active_check_in_idx on public.tracked_stays (check_in) where active;

-- Raw observations (append-only). `raw` is pruned to null after 30 days (D-19).
create table public.price_snapshots (
  id bigint generated always as identity primary key,
  stay_id bigint not null references public.tracked_stays (id),
  provider_id integer not null references public.providers (id),
  captured_at timestamptz not null,
  total_cents integer not null check (total_cents > 0),  -- whole stay, EUR, incl. taxes as shown
  currency char(3) not null default 'EUR',
  room_name text,
  board text,
  free_cancellation boolean,
  raw jsonb
);
create index price_snapshots_stay_captured_idx on public.price_snapshots (stay_id, captured_at desc);
create index price_snapshots_provider_id_idx on public.price_snapshots (provider_id);
create index price_snapshots_captured_raw_idx on public.price_snapshots (captured_at) where raw is not null;

-- One row per stay per day: best price overall and per provider (derived, rebuilt by the collector).
create table public.stay_daily (
  stay_id bigint not null references public.tracked_stays (id),
  day date not null,
  best_cents integer not null check (best_cents > 0),
  best_provider_id integer references public.providers (id),
  per_provider jsonb not null default '{}',   -- {"<provider_id>": cents}
  primary key (stay_id, day)
);
create index stay_daily_best_provider_id_idx on public.stay_daily (best_provider_id);

-- Computed signal per stay (latest), PLAN §8.1.
create table public.stay_stats (
  stay_id bigint primary key references public.tracked_stays (id),
  updated_at timestamptz not null,
  days_tracked integer not null check (days_tracked >= 0),
  now_cents integer,
  low_cents integer,
  high_cents integer,
  avg30_cents integer,
  percentile numeric check (percentile between 0 and 1),
  trend_7d numeric,                           -- % change per week from regression
  state text check (state in ('collecting', 'near_low', 'good', 'normal', 'high'))
);

-- ─── Trust: manual checkout tests ───────────────────────────────────────────

create table public.trust_tests (
  id bigint generated always as identity primary key,
  provider_id integer not null references public.providers (id),
  hotel_id integer not null references public.hotels (id),
  check_in date not null,
  check_out date not null,
  adults smallint not null check (adults between 1 and 4),
  listed_cents integer not null check (listed_cents > 0),
  checkout_cents integer check (checkout_cents > 0),  -- null = could not book
  outcome text not null check (outcome in ('match', 'higher', 'lower', 'unavailable')),
  extras text[] not null default '{}',        -- e.g. {'city_tax','breakfast_missing'}
  screenshot_path text,                       -- Supabase Storage, private bucket
  notes text,
  tested_at timestamptz not null default now(),
  tested_by text not null default 'zaid',
  check (check_out > check_in),
  check ((outcome = 'unavailable') = (checkout_cents is null))
);
create index trust_tests_provider_id_idx on public.trust_tests (provider_id);
create index trust_tests_hotel_id_idx on public.trust_tests (hotel_id);

create table public.provider_scores (
  provider_id integer primary key references public.providers (id),
  updated_at timestamptz not null,
  tests integer not null check (tests >= 0),
  matches integer not null check (matches >= 0 and matches <= tests),
  avg_markup_pct numeric,
  score smallint not null check (score between 0 and 100)
);

-- ─── Users and alerts (no accounts, email only; never public) ───────────────

create table public.watchers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(btrim(email)) and position('@' in email) > 1),
  locale text not null default 'de' check (locale in ('de', 'en')),
  confirmed_at timestamptz,                   -- double opt-in
  consent_text text not null,
  consent_at timestamptz not null,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.watches (
  id uuid primary key default gen_random_uuid(),
  watcher_id uuid not null references public.watchers (id) on delete cascade,
  stay_id bigint not null references public.tracked_stays (id),
  target_cents integer check (target_cents > 0),
  last_alert_cents integer,
  last_alert_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (watcher_id, stay_id)
);
create index watches_stay_id_idx on public.watches (stay_id);

create table public.alerts_sent (
  id bigint generated always as identity primary key,
  watch_id uuid not null references public.watches (id) on delete cascade,
  kind text not null check (kind in ('target', 'new_low', 'drop', 'near_low')),
  price_cents integer not null,
  sent_at timestamptz not null default now(),
  resend_id text
);
create index alerts_sent_watch_id_idx on public.alerts_sent (watch_id);

-- ─── Ops ────────────────────────────────────────────────────────────────────

create table public.collector_runs (
  id bigint generated always as identity primary key,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  tasks_posted integer not null default 0,
  tasks_done integer not null default 0,
  est_cost_usd numeric not null default 0,
  errors jsonb not null default '[]'
);
create index collector_runs_started_at_idx on public.collector_runs (started_at desc);

-- Privacy-friendly product analytics: no IP, no user id, no user agent.
create table public.events (
  id bigint generated always as identity primary key,
  name text not null,                         -- 'search','stay_view','watch_created','outbound_click'
  props jsonb not null default '{}',
  at timestamptz not null default now()
);
create index events_name_at_idx on public.events (name, at desc);

-- ─── Public views (read by the web app with the anon key) ───────────────────

-- Stays with hotel, city and the latest signal. security_invoker: RLS of the base tables applies.
create view public.v_stay_public with (security_invoker = true) as
select
  s.id as stay_id,
  s.check_in,
  s.check_out,
  s.adults,
  (s.check_out - s.check_in) as nights,
  s.active,
  h.id as hotel_id,
  h.slug as hotel_slug,
  h.name as hotel_name,
  c.slug as city_slug,
  c.name_de as city_name_de,
  c.name_en as city_name_en,
  st.updated_at,
  st.days_tracked,
  st.now_cents,
  st.low_cents,
  st.high_cents,
  st.avg30_cents,
  st.percentile,
  st.trend_7d,
  st.state
from public.tracked_stays s
join public.hotels h on h.id = s.hotel_id
join public.cities c on c.id = h.city_id
left join public.stay_stats st on st.stay_id = s.id
where h.active;

-- Price calendar per hotel: one row per active upcoming stay with its latest best price.
create view public.v_hotel_calendar with (security_invoker = true) as
select
  s.hotel_id,
  s.id as stay_id,
  s.check_in,
  s.check_out,
  s.adults,
  latest.day as price_day,
  latest.best_cents,
  latest.best_provider_id,
  st.state
from public.tracked_stays s
join public.hotels h on h.id = s.hotel_id and h.active
left join lateral (
  select d.day, d.best_cents, d.best_provider_id
  from public.stay_daily d
  where d.stay_id = s.id
  order by d.day desc
  limit 1
) latest on true
left join public.stay_stats st on st.stay_id = s.id
where s.active and s.check_in >= current_date;

-- ─── Row Level Security ─────────────────────────────────────────────────────
-- Every table has RLS. Public (anon + authenticated) may only read the catalog and derived
-- price data. Everything else has no policy, so only the service role (server) can access it.

alter table public.cities enable row level security;
alter table public.hotels enable row level security;
alter table public.providers enable row level security;
alter table public.provider_aliases enable row level security;
alter table public.tracked_stays enable row level security;
alter table public.price_snapshots enable row level security;
alter table public.stay_daily enable row level security;
alter table public.stay_stats enable row level security;
alter table public.trust_tests enable row level security;
alter table public.provider_scores enable row level security;
alter table public.watchers enable row level security;
alter table public.watches enable row level security;
alter table public.alerts_sent enable row level security;
alter table public.collector_runs enable row level security;
alter table public.events enable row level security;

create policy "public read" on public.cities for select to anon, authenticated using (true);
create policy "public read" on public.hotels for select to anon, authenticated using (true);
create policy "public read" on public.providers for select to anon, authenticated using (not pending);
create policy "public read" on public.stay_daily for select to anon, authenticated using (true);
create policy "public read" on public.stay_stats for select to anon, authenticated using (true);
create policy "public read" on public.provider_scores for select to anon, authenticated using (true);
-- Needed by the security_invoker views above. Contains no personal data (hotel, dates, adults).
create policy "public read" on public.tracked_stays for select to anon, authenticated using (true);

-- Defense in depth: the public roles never write and never touch private tables directly.
revoke insert, update, delete, truncate on all tables in schema public from anon, authenticated;
revoke all on public.watchers, public.watches, public.alerts_sent, public.trust_tests,
  public.collector_runs, public.events, public.price_snapshots, public.provider_aliases
  from anon, authenticated;

-- ─── Maintenance ────────────────────────────────────────────────────────────

-- D-19: drop raw API JSON older than 30 days. Called once a day by the collector.
create function public.prune_raw_snapshots(older_than interval default interval '30 days')
returns integer
language sql
security invoker
set search_path = ''
as $$
  with pruned as (
    update public.price_snapshots
    set raw = null
    where raw is not null and captured_at < now() - older_than
    returning 1
  )
  select count(*)::integer from pruned;
$$;
revoke execute on function public.prune_raw_snapshots(interval) from public, anon, authenticated;
grant execute on function public.prune_raw_snapshots(interval) to service_role;
