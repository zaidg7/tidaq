-- C-080j: drops we showed in a TikTok or Instagram post. The creator kit (/admin/preisstuerze)
-- saves a snapshot of the drop as it was when posted (the radar recomputes drops daily, so a
-- drop from a video can be gone the next day). The TikTok and Instagram landing lists them first
-- ("Aus unseren Videos") so a viewer finds the hotel from the video. Written only with the service
-- role after requireAdmin(); the public reads them through posted_drops_recent().
create table public.posted_drops (
  id bigint generated always as identity primary key,
  hotel_id integer not null references public.hotels (id),
  night date not null,
  check_out date not null check (check_out > night and check_out <= night + 2),
  platform text not null check (platform in ('tiktok', 'instagram')),
  posted_on date not null,
  seen_day date not null,
  seen_at timestamptz not null,
  now_cents integer not null check (now_cents > 0),
  prev_cents integer not null check (prev_cents > now_cents),
  drop_pct numeric(5, 4) not null check (drop_pct > 0 and drop_pct <= 1),
  prior_low_cents integer not null check (prior_low_cents > 0),
  prior_days integer not null check (prior_days >= 0),
  prior_avg_cents integer not null check (prior_avg_cents > 0),
  provider_slug text not null,
  offers integer not null check (offers >= 0),
  confirmed boolean not null,
  created_at timestamptz not null default now(),
  unique (hotel_id, night, check_out, platform)
);

alter table public.posted_drops enable row level security;
revoke all on table public.posted_drops from anon, authenticated;
create index posted_drops_posted_on on public.posted_drops (posted_on desc);

-- The stays shown in posts during the last p_days days whose check-in is still ahead, newest
-- post first, one row per stay with every platform it was on. Same columns as radar_drops (with
-- check_out) plus posted_on and platforms. Public data, anon may call it.
create or replace function public.posted_drops_recent(p_today date, p_days integer default 7)
returns table (
  hotel_id integer,
  hotel_slug text,
  hotel_name text,
  city_slug text,
  city_name_de text,
  city_name_en text,
  night date,
  check_out date,
  seen_day date,
  seen_at timestamptz,
  now_cents integer,
  prev_cents integer,
  drop_pct numeric,
  prior_low_cents integer,
  prior_days integer,
  prior_avg_cents integer,
  provider_slug text,
  provider_name text,
  provider_direct boolean,
  offers integer,
  confirmed boolean,
  posted_on date,
  platforms text[]
)
language sql
stable
security definer
set search_path = ''
as $$
  with recent as (
    select p.*
      from public.posted_drops p
     where p.posted_on <= p_today
       and p.posted_on > p_today - least(greatest(p_days, 1), 14)
       and p.night > p_today
  ),
  latest as (
    select distinct on (r.hotel_id, r.night, r.check_out) r.*
      from recent r
     order by r.hotel_id, r.night, r.check_out, r.posted_on desc, r.created_at desc
  ),
  plats as (
    select r.hotel_id as hid, r.night as n, r.check_out as co,
           array_agg(distinct r.platform order by r.platform) as platforms
      from recent r
     group by r.hotel_id, r.night, r.check_out
  )
  select l.hotel_id, h.slug, h.name, ci.slug, ci.name_de, ci.name_en,
         l.night, l.check_out, l.seen_day, l.seen_at, l.now_cents, l.prev_cents, l.drop_pct,
         l.prior_low_cents, l.prior_days, l.prior_avg_cents,
         l.provider_slug, coalesce(pr.name, l.provider_slug), coalesce(pr.is_direct, false),
         l.offers, l.confirmed, l.posted_on, pl.platforms
    from latest l
    join plats pl on pl.hid = l.hotel_id and pl.n = l.night and pl.co = l.check_out
    join public.hotels h on h.id = l.hotel_id and h.active
    join public.cities ci on ci.id = h.city_id
    left join public.providers pr on pr.slug = l.provider_slug
   order by l.posted_on desc, l.created_at desc
   limit 12;
$$;

revoke all on function public.posted_drops_recent(date, integer) from public;
grant execute on function public.posted_drops_recent(date, integer) to anon, authenticated, service_role;
