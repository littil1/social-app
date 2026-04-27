-- Run this manually in Supabase SQL Editor after the migration that creates
-- public.run_snapshot_daily_winners(date) has been applied.
-- Required first:
-- 1. Enable pg_cron in Database > Extensions.

select
  cron.schedule(
    'snapshot-daily-winners-zurich',
    '5,20,35,50 * * * *', -- every 15 minutes, function is idempotent
    $$
    select public.run_snapshot_daily_winners();
    $$
  );

-- This intentionally runs several times per hour.
-- The function snapshots the previous Zurich day only if that day does not
-- already have a winner row, so repeated runs are safe and avoid
-- daylight-saving-time scheduling drift.
