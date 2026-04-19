-- =========================================================================
-- NAFAS V2 — AFTER INSERT webhook on sensor_readings
--
-- Fires notify_threshold_cross edge function whenever a new sensor reading
-- lands in the DB. The edge function does its own threshold + anti-spam
-- check, then POSTs to ntfy.sh per zone.
--
-- Same mechanism Supabase Dashboard → Database → Webhooks uses under the
-- hood, just expressed as pure SQL so we don't need Management API access.
-- =========================================================================

CREATE OR REPLACE FUNCTION public.notify_threshold_cross_trigger()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_url TEXT := 'https://urxfbusdgpnrhoojefey.supabase.co/functions/v1/notify_threshold_cross';
  v_auth TEXT := 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVyeGZidXNkZ3Bucmhvb2plZmV5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjUyNTU5OCwiZXhwIjoyMDkyMTAxNTk4fQ.ZkSfPPvv3xScAtAqm7_hTCdyYKDYaZLQHbCJ5Ebc-ec';
BEGIN
  -- Fire-and-forget. pg_net handles the POST asynchronously so this trigger
  -- doesn't block the INSERT. The edge function decides whether to actually
  -- notify based on threshold + anti-spam state.
  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', v_auth
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'sensor_readings',
      'record', row_to_json(NEW),
      'schema', 'public'
    )
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sensor_readings_notify ON sensor_readings;

CREATE TRIGGER trg_sensor_readings_notify
  AFTER INSERT ON sensor_readings
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_threshold_cross_trigger();
