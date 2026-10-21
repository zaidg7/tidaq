-- C-169: Price Drops were empty from 19 Oct. refresh_trip_drops (every 15 min) took longer than
-- the 2-minute statement timeout once the night grid covered 444 hotels x 270 days, so every run
-- was cancelled and trip_drops kept no rows for today. The job now runs with a 10-minute timeout.
-- Making compute_trip_drops itself faster is C-170.
select cron.alter_job(
  (select jobid from cron.job where jobname = 'refresh-trip-drops'),
  command := $cmd$set statement_timeout = '10min'; select public.refresh_trip_drops()$cmd$
);
