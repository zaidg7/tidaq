-- C-165 (measurement only, not used for prices): one correction per booking site, the median of
-- exact price / (checked base rate x hotel tax factor). A fresh test on 21 Oct 2026 (45 hotels,
-- 11 to 16 Nov) showed no steady offset per site (Trip.com 1.04, Agoda 1.01, Booking.com 1.08)
-- but a wide spread (median error about 10 % on every site), so no page multiplies by it. Kept
-- for the accuracy page (C-166). No cron job.
create table public.provider_price_bias (
  provider_id integer primary key,
  bias numeric(5, 4) not null check (bias between 0.85 and 1.40),
  samples integer not null check (samples >= 8),
  updated_at timestamptz not null default now()
);
alter table public.provider_price_bias enable row level security;
revoke all on table public.provider_price_bias from anon, authenticated;

create or replace function public.provider_price_biases()
returns table (provider_id integer, bias numeric)
language sql
stable
security definer
set search_path = ''
as $$
  select b.provider_id, b.bias from public.provider_price_bias b;
$$;
revoke all on function public.provider_price_biases() from public;
grant execute on function public.provider_price_biases() to anon, authenticated, service_role;
