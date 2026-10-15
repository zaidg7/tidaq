-- C-041c: server errors of the website for the admins' daily check email. No personal data:
-- a source label ("stay unavailable") and the error message only, never URLs with tokens,
-- emails or IPs. A ring buffer of 5,000 rows (the oldest slot is overwritten), so the table
-- stays small without deletes; at most 1,000 entries per environment and day. Service role only.
create sequence public.web_errors_seq;

create table public.web_errors (
  slot integer primary key check (slot >= 0 and slot < 5000),
  at timestamptz not null default now(),
  env text not null check (env in ('production', 'staging', 'development')),
  source text not null check (length(source) between 1 and 120),
  message text not null check (length(message) <= 500)
);
create index web_errors_env_at_idx on public.web_errors (env, at);
alter table public.web_errors enable row level security;

create or replace function public.log_web_error(p_env text, p_source text, p_message text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_env not in ('production', 'staging', 'development') then return; end if;
  if (select count(*) from public.web_errors
       where env = p_env and at > now() - interval '1 day') >= 1000 then
    return;
  end if;
  insert into public.web_errors as w (slot, at, env, source, message)
  values ((nextval('public.web_errors_seq') % 5000)::integer, now(), p_env,
          left(coalesce(nullif(p_source, ''), 'unknown'), 120),
          left(coalesce(p_message, ''), 500))
  on conflict (slot) do update
    set at = excluded.at, env = excluded.env, source = excluded.source,
        message = excluded.message;
end;
$$;

-- The most frequent errors since p_since, for the daily check (collector).
create or replace function public.web_error_digest(p_env text, p_since timestamptz)
returns table (source text, message text, n integer, last_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select e.source, e.message, count(*)::integer, max(e.at)
    from public.web_errors e
   where e.env = p_env and e.at >= p_since
   group by e.source, e.message
   order by count(*) desc, max(e.at) desc
   limit 20;
$$;

revoke all on table public.web_errors from anon, authenticated;
revoke all on sequence public.web_errors_seq from anon, authenticated;
revoke all on function public.log_web_error(text, text, text) from public, anon, authenticated;
revoke all on function public.web_error_digest(text, timestamptz) from public, anon, authenticated;
grant execute on function public.log_web_error(text, text, text) to service_role;
grant execute on function public.web_error_digest(text, timestamptz) to service_role;
