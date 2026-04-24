-- Run this manually in Supabase SQL Editor after the function is deployed.
-- Required first:
-- 1. Enable pg_cron and pg_net in Database > Extensions.
-- 2. Set the same DAILY_WINNER_CRON_SECRET in the Edge Function secrets.
-- 3. Replace the placeholders below.

select
  cron.schedule(
    'snapshot-daily-winners-zurich',
    '5,20,35,50 * * * *', -- every 15 minutes, function is idempotent
    $$
    select
      net.http_post(
        url:='https://<PROJECT-REF>.supabase.co/functions/v1/snapshot-daily-winners',
        headers:=jsonb_build_object(
          'Content-Type', 'application/json',
          'x-cron-secret', '<DAILY_WINNER_CRON_SECRET>'
        ),
        body:='{}'::jsonb,
        timeout_milliseconds:=10000
      ) as request_id;
    $$
  );

-- This intentionally runs several times per hour.
-- The function snapshots the previous Zurich day only if that day
-- does not already have a winner row, so repeated runs are safe and
-- avoid daylight-saving-time scheduling drift.
