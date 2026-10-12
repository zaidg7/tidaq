-- Collector bookkeeping (C-013): one row per DataForSEO task, run metadata, idempotent snapshots.

alter table public.collector_runs
  add column kind text not null default 'morning'
    check (kind in ('morning', 'evening', 'collect', 'manual')),
  add column env text not null default 'production' check (env in ('production', 'staging')),
  add column tasks_skipped integer not null default 0,
  add column budget_reason text check (budget_reason in ('ok', 'daily_cap', 'monthly_budget'));

-- Every task we post. Collect runs poll `status = 'posted'`; the id makes collecting idempotent.
create table public.collector_tasks (
  id text primary key,                        -- DataForSEO task id
  run_id bigint not null references public.collector_runs (id),
  stay_id bigint not null references public.tracked_stays (id),
  posted_at timestamptz not null default now(),
  cost_usd numeric not null default 0,
  status text not null default 'posted'
    check (status in ('posted', 'done', 'no_results', 'failed')),
  collected_at timestamptz,
  error text
);
create index collector_tasks_open_idx on public.collector_tasks (posted_at) where status = 'posted';
create index collector_tasks_run_id_idx on public.collector_tasks (run_id);
create index collector_tasks_stay_id_idx on public.collector_tasks (stay_id);

alter table public.collector_tasks enable row level security;
revoke all on public.collector_tasks from anon, authenticated;

-- Idempotency (C-013 step 4): a task's offers are stored once per provider.
alter table public.price_snapshots add column task_id text references public.collector_tasks (id);
create unique index price_snapshots_task_provider_key
  on public.price_snapshots (task_id, provider_id) where task_id is not null;
