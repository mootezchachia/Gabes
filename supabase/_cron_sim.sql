SELECT cron.schedule(
  'nafas-simulate-sensors',
  '*/2 * * * *',
  $cron$
SELECT net.http_post(
  url := 'https://urxfbusdgpnrhoojefey.supabase.co/functions/v1/simulate_sensors',
  headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVyeGZidXNkZ3Bucmhvb2plZmV5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjUyNTU5OCwiZXhwIjoyMDkyMTAxNTk4fQ.ZkSfPPvv3xScAtAqm7_hTCdyYKDYaZLQHbCJ5Ebc-ec"}'::jsonb,
  body := '{}'::jsonb
);
  $cron$
);
