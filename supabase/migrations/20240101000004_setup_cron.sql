-- ============================================================
-- setup_cron: Enable pg_cron and schedule stock updates
-- ============================================================

-- 1. Enable the pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Grant access to the cron schema for the service_role
GRANT USAGE ON SCHEMA cron TO postgres;

-- 3. Schedule the update-stock-prices job
-- Runs every 5 minutes (*/5 * * * *)
-- Calls the Edge Function via pg_net
SELECT cron.schedule(
  'update-stock-prices',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://qdaqskqpgwflnramneyd.supabase.co/functions/v1/update-stock-prices',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkYXFza3FwZ3dmbG5yYW1uZXlkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzQ1MTMxOCwiZXhwIjoyMDkzMDI3MzE4fQ.LrQ4hNFKx2BiN9XtyYRRV5TH2I0IbUFBLNUsg8YvKeM"}'::jsonb
  );
  $$
);
