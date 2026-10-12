-- RLS and privilege check for the public roles. Read-only: run it with the Supabase MCP
-- `execute_sql` tool or psql after every schema change. Every column must be `true`.
select
  not has_table_privilege('anon', 'public.watchers', 'select') as anon_cannot_read_watchers,
  not has_table_privilege('anon', 'public.watches', 'select') as anon_cannot_read_watches,
  not has_table_privilege('anon', 'public.alerts_sent', 'select') as anon_cannot_read_alerts,
  not has_table_privilege('anon', 'public.trust_tests', 'select') as anon_cannot_read_trust_tests,
  not has_table_privilege('anon', 'public.collector_runs', 'select') as anon_cannot_read_runs,
  not has_table_privilege('anon', 'public.events', 'select') as anon_cannot_read_events,
  not has_table_privilege('anon', 'public.events', 'insert') as anon_cannot_write_events,
  not has_table_privilege('anon', 'public.hotels', 'insert') as anon_cannot_write_hotels,
  not has_table_privilege('authenticated', 'public.watchers', 'select') as auth_cannot_read_watchers,
  has_table_privilege('anon', 'public.hotels', 'select') as anon_can_read_hotels,
  has_table_privilege('anon', 'public.v_stay_public', 'select') as anon_can_read_v_stay_public,
  not has_function_privilege('anon', 'public.prune_raw_snapshots(interval)', 'execute')
    as anon_cannot_prune,
  (select count(*) = 0 from pg_tables where schemaname = 'public' and not rowsecurity)
    as all_tables_have_rls;
