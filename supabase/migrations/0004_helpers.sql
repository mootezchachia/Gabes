-- =========================================================================
-- NAFAS V2 — DB helpers
--   - zones_near_sensor(sensor_id, radius_m) RPC
--   - schedule simulate_sensors every 2 min via pg_cron (commented; edit
--     the project URL + service role key before uncommenting)
-- =========================================================================

CREATE OR REPLACE FUNCTION zones_near_sensor(
  sensor_id_in UUID,
  radius_m NUMERIC DEFAULT 2000
) RETURNS TABLE (
  id UUID, slug TEXT, name TEXT, kind zone_kind
) LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT z.id, z.slug, z.name, z.kind
  FROM sensors s
  JOIN zones z
    ON z.org_id = s.org_id
   AND (
     ST_Intersects(s.location, z.geometry)
     OR ST_DWithin(s.location, z.geometry, radius_m)
   )
  WHERE s.id = sensor_id_in
$$;

-- Grant usage to authenticated role (admins who inspect alerts) and to
-- the service role that the edge function uses.
GRANT EXECUTE ON FUNCTION zones_near_sensor(UUID, NUMERIC) TO authenticated, service_role;

-- -----------------------------------------------------------------------
-- pg_cron schedule for the sensor simulator.
-- IMPORTANT: edit <project-ref> and <service-role-jwt> before enabling.
-- Supabase CLI normally substitutes env vars at deploy time; you can also
-- run this block manually from the SQL editor once secrets are set.
-- -----------------------------------------------------------------------
--
-- SELECT cron.schedule(
--   'simulate-sensors',
--   '*/2 * * * *',
--   $$
--     SELECT net.http_post(
--       url := 'https://<project-ref>.supabase.co/functions/v1/simulate_sensors',
--       headers := jsonb_build_object(
--         'Authorization', 'Bearer <service-role-jwt>',
--         'Content-Type', 'application/json'
--       ),
--       body := '{}'::jsonb
--     );
--   $$
-- );
--
-- =========================================================================
-- end 0004_helpers.sql
-- =========================================================================
