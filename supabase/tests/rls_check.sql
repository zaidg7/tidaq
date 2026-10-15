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
  not has_function_privilege('anon', 'public.admin_health(integer)', 'execute')
    as anon_cannot_read_admin_health,
  not has_function_privilege('authenticated', 'public.admin_health(integer)', 'execute')
    as auth_cannot_read_admin_health,
  not has_function_privilege('anon', 'public.collector_ingest(jsonb)', 'execute')
    as anon_cannot_ingest,
  not has_function_privilege('anon', 'public.rebuild_stay_daily(bigint[])', 'execute')
    as anon_cannot_rebuild_daily,
  -- The one write the public site may do (C-022c1): validated and capped inside the function.
  has_function_privilege('anon', 'public.request_stay(text,date,date,integer)', 'execute')
    as anon_can_request_stay,
  (select prosecdef and proconfig @> array['search_path=""'] from pg_proc
    where oid = 'public.request_stay(text,date,date,integer)'::regprocedure)
    as request_stay_pinned_search_path,
  not has_table_privilege('anon', 'public.tracked_stays', 'insert') as anon_cannot_insert_stays,
  -- C-070c: accuracy aggregates are public (writes: no RLS policy), computing them is the
  -- collector's job.
  has_table_privilege('anon', 'public.night_accuracy', 'select') as anon_can_read_night_accuracy,
  not has_function_privilege('anon', 'public.night_accuracy_record(date)', 'execute')
    as anon_cannot_record_night_accuracy,
  -- C-070d: the stay page asks whether a hotel's nights are reliable; the raw pairs stay private.
  has_function_privilege('anon', 'public.night_reliability(date,integer)', 'execute')
    as anon_can_read_night_reliability,
  not has_function_privilege('anon', 'public.night_accuracy_pairs(date)', 'execute')
    as anon_cannot_read_night_pairs,
  -- C-034: public provider facts are aggregates only; single checkout tests stay private.
  has_function_privilege('anon', 'public.provider_facts()', 'execute') as anon_can_read_provider_facts,
  -- C-030a/C-031: everything with addresses or alerts is service role only.
  not has_function_privilege('anon', 'public.alert_inputs(date)', 'execute')
    as anon_cannot_read_alert_inputs,
  not has_function_privilege('anon', 'public.alert_offers(uuid,date)', 'execute')
    as anon_cannot_read_alert_offers,
  -- C-041c: website errors are written and read by the service role only.
  not has_table_privilege('anon', 'public.web_errors', 'select') as anon_cannot_read_web_errors,
  not has_function_privilege('anon', 'public.log_web_error(text,text,text)', 'execute')
    as anon_cannot_log_web_errors,
  not has_function_privilege('anon', 'public.web_error_digest(text,timestamptz)', 'execute')
    as anon_cannot_read_web_error_digest,
  (select count(*) = 0 from pg_tables where schemaname = 'public' and not rowsecurity)
    as all_tables_have_rls;
