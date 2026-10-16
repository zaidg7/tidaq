-- C-148: exact final prices for Price Drops (Zaid, 16 Oct: "We can't allow ourselves estimates").
-- Xotelo's prices are base rates without taxes and fees; Google Hotels via DataForSEO, asked from
-- Germany, returns what the sites charge (docs/research/exact-prices.md). The collector asks
-- DataForSEO for every live drop's exact trip and stores each site's price here; the radar only
-- shows drops whose site is in a fresh quote, with the quoted price and link. A re-quote keeps the
-- last offers until the new answer arrives.

create table public.drop_quotes (
  hotel_id integer not null references public.hotels (id) on delete cascade,
  night date not null,
  check_out date not null,
  task_id text,
  posted_at timestamptz,
  status text not null default 'posted' check (status in ('posted', 'done', 'failed')),
  quoted_at timestamptz,
  -- [{ "slug", "name", "nightly_cents", "total_cents", "url", "official" }], cheapest first.
  offers jsonb,
  primary key (hotel_id, night, check_out)
);
alter table public.drop_quotes enable row level security;
revoke all on public.drop_quotes from anon, authenticated;
create index drop_quotes_task_idx on public.drop_quotes (task_id);

-- Every paid task, for the budget guard (hard rule 4): one row per DataForSEO task posted.
create table public.drop_quote_log (
  task_id text primary key,
  hotel_id integer not null,
  night date not null,
  check_out date not null,
  posted_at timestamptz not null default now(),
  cost_usd numeric(10, 6) not null default 0.0008
);
alter table public.drop_quote_log enable row level security;
revoke all on public.drop_quote_log from anon, authenticated;
create index drop_quote_log_posted_idx on public.drop_quote_log (posted_at);

-- Drops that need a quote: confirmed live by the Xotelo check (C-139) within the hour, hotel has
-- a Google id, and no quote yet, an old one, or a post that never came back. Biggest drops first.
create or replace function public.drop_quote_jobs(p_today date, p_max_age_minutes integer, p_limit integer)
returns table (hotel_id integer, hotel_identifier text, night date, check_out date)
language sql
stable
security definer
set search_path = ''
as $$
  with latest as (
    select max(x.today) as today from public.trip_drops x
     where x.today <= p_today + 1 and x.today >= p_today - 1
  ),
  trips as (
    select distinct on (t.hotel_id, t.night, t.check_out)
           t.hotel_id, h.dfs_hotel_identifier, t.night, t.check_out, t.drop_pct
      from public.trip_drops t
      join latest l on t.today = l.today
      join public.hotels h on h.id = t.hotel_id
      join public.drop_checks c
        on c.hotel_id = t.hotel_id and c.night = t.night and c.check_out = t.check_out
       and c.provider_slug = t.provider_slug
     where t.night > p_today
       and h.dfs_hotel_identifier is not null
       and c.live and c.checked_at > now() - interval '60 minutes'
     order by t.hotel_id, t.night, t.check_out, t.drop_pct desc
  )
  select tr.hotel_id, tr.dfs_hotel_identifier, tr.night, tr.check_out
    from trips tr
    left join public.drop_quotes q
      on q.hotel_id = tr.hotel_id and q.night = tr.night and q.check_out = tr.check_out
   where q.hotel_id is null
      or (q.status = 'done' and q.quoted_at < now() - make_interval(mins => p_max_age_minutes))
      or (q.status in ('posted', 'failed') and q.posted_at < now() - interval '60 minutes')
   order by (q.hotel_id is null) desc, tr.drop_pct desc
   limit p_limit;
$$;
revoke all on function public.drop_quote_jobs(date, integer, integer) from public, anon, authenticated;
grant execute on function public.drop_quote_jobs(date, integer, integer) to service_role;

-- Tasks posted at least a minute ago and not collected yet (an hour later they count as lost).
create or replace function public.drop_quote_pending(p_limit integer)
returns table (task_id text, hotel_id integer, night date, check_out date, posted_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select q.task_id, q.hotel_id, q.night, q.check_out, q.posted_at
    from public.drop_quotes q
   where q.status = 'posted' and q.task_id is not null
     and q.posted_at < now() - interval '1 minute'
     and q.posted_at > now() - interval '60 minutes'
   order by q.posted_at
   limit p_limit;
$$;
revoke all on function public.drop_quote_pending(integer) from public, anon, authenticated;
grant execute on function public.drop_quote_pending(integer) to service_role;

-- Tasks and spend for the budget guard: today (UTC) and this month.
create or replace function public.drop_quote_usage(p_today date)
returns table (posted_today integer, spent_month_usd numeric)
language sql
stable
security definer
set search_path = ''
as $$
  select
    count(*) filter (where l.posted_at >= p_today::timestamptz)::integer,
    coalesce(sum(l.cost_usd), 0)
  from public.drop_quote_log l
  where l.posted_at >= date_trunc('month', p_today::timestamptz);
$$;
revoke all on function public.drop_quote_usage(date) from public, anon, authenticated;
grant execute on function public.drop_quote_usage(date) to service_role;
