-- =========================================================================
-- NAFAS V2 — Security fixes from backend code review
--
-- 1. Close privilege escalation in profiles_update_self: without this,
--    a user could UPDATE their own profile row to set role='admin' and
--    change org_id to any org, then (via sync_user_metadata trigger)
--    get admin JWT claims on next token refresh.
-- 2. Tighten zones_near_sensor SECURITY DEFINER function with an explicit
--    org check so a brute-force UUID guess on another org cannot leak
--    that org's zone list.
-- =========================================================================

BEGIN;

-- ---- 1. profiles_update_self: freeze org_id + role on self-update ------
DROP POLICY IF EXISTS profiles_update_self ON profiles;

CREATE POLICY profiles_update_self ON profiles FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND org_id = (SELECT org_id FROM profiles WHERE user_id = auth.uid())
    AND role   = (SELECT role   FROM profiles WHERE user_id = auth.uid())
  );

-- Admin promotion/demotion still works via profiles_admin_all (org-scoped).

-- ---- 2. zones_near_sensor: scope the sensor lookup to caller's org -----
DROP FUNCTION IF EXISTS public.zones_near_sensor(UUID, NUMERIC);
CREATE FUNCTION public.zones_near_sensor(
  p_sensor_id UUID,
  p_distance_m NUMERIC DEFAULT 2000
) RETURNS TABLE (
  zone_id UUID,
  slug TEXT,
  name TEXT,
  kind zone_kind
) LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT z.id, z.slug, z.name, z.kind
  FROM zones z
  JOIN sensors s ON s.id = p_sensor_id
  WHERE z.org_id = s.org_id
    AND s.org_id = public.org_id()           -- NEW: org scoping enforced
    AND (
      ST_Intersects(z.geometry, s.location)
      OR ST_DWithin(z.geometry, s.location, p_distance_m)
    );
$$;

COMMIT;
