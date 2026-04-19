-- =========================================================================
-- NAFAS V2 — Init migration
-- Multi-tenant municipal pollution monitoring + remediation platform.
-- Reference: docs/plans/2026-04-18-nafas-v2-design.md  §3 (data model), §4 (auth)
-- =========================================================================

-- ---- Extensions --------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ---- Enums -------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin','supervisor','user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE locale AS ENUM ('fr','ar','en');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE panel_status AS ENUM ('planned','deploying','active','removed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE sensor_type AS ENUM ('so2','no2','pm25','pm10','ph','turbidity','chlorophyll_a','temperature');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE zone_kind AS ENUM ('school','hospital','residential','industrial','marine_protected','coastal','oasis');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE placement_status AS ENUM ('draft','approved','rejected','deployed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE forecast_target AS ENUM ('panel','placement');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE event_severity AS ENUM ('info','warning','critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---- Tables ------------------------------------------------------------

-- 1. orgs
CREATE TABLE IF NOT EXISTS orgs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  logo_path TEXT,
  primary_color TEXT DEFAULT '#1D9E75',
  default_map_center GEOGRAPHY(POINT, 4326),
  default_map_zoom NUMERIC DEFAULT 11.2,
  timezone TEXT DEFAULT 'Africa/Tunis',
  sim_interval_minutes INT DEFAULT 2,
  ai_weights JSONB DEFAULT '{"w1":1.0,"w2":0.8,"w3":1.2,"w4":0.6,"w5":0.5,"w6":1.0}'::jsonb,
  ai_quota_monthly INT DEFAULT 500,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. profiles
CREATE TABLE IF NOT EXISTS profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES orgs(id),
  role user_role NOT NULL DEFAULT 'user',
  full_name TEXT,
  home_location GEOGRAPHY(POINT, 4326),
  school_location GEOGRAPHY(POINT, 4326),
  preferred_locale locale DEFAULT 'fr',
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS profiles_org_role_idx ON profiles (org_id, role);

-- 3. algae_panels
CREATE TABLE IF NOT EXISTS algae_panels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id),
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  area_m2 NUMERIC NOT NULL CHECK (area_m2 > 0),
  algae_species TEXT DEFAULT 'ulva_lactuca',
  material_notes TEXT,
  status panel_status NOT NULL DEFAULT 'planned',
  deployed_at DATE,
  removed_at DATE,
  expected_p_uptake_kg_per_year NUMERIC,
  actual_p_uptake_kg_per_year NUMERIC,
  source_placement_id UUID,
  created_by UUID REFERENCES profiles(user_id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS algae_panels_loc_gix ON algae_panels USING GIST (location);
CREATE INDEX IF NOT EXISTS algae_panels_org_status_idx ON algae_panels (org_id, status);

-- 4. sensors
CREATE TABLE IF NOT EXISTS sensors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id),
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  panel_id UUID REFERENCES algae_panels(id) ON DELETE SET NULL,
  type sensor_type NOT NULL,
  unit TEXT NOT NULL,
  label TEXT,
  thresholds JSONB DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  source TEXT NOT NULL DEFAULT 'simulated',
  device_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  installed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sensors_loc_gix ON sensors USING GIST (location);
CREATE INDEX IF NOT EXISTS sensors_org_active_idx ON sensors (org_id, active);

-- 5. sensor_readings
CREATE TABLE IF NOT EXISTS sensor_readings (
  id BIGSERIAL PRIMARY KEY,
  sensor_id UUID NOT NULL REFERENCES sensors(id) ON DELETE CASCADE,
  value NUMERIC NOT NULL,
  taken_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT NOT NULL DEFAULT 'simulated'
);
CREATE INDEX IF NOT EXISTS sensor_readings_sensor_taken_idx ON sensor_readings (sensor_id, taken_at DESC);

-- 6. zones
CREATE TABLE IF NOT EXISTS zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id),
  kind zone_kind NOT NULL,
  name TEXT NOT NULL,
  slug TEXT,
  geometry GEOGRAPHY(POLYGON, 4326) NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS zones_geom_gix ON zones USING GIST (geometry);
CREATE INDEX IF NOT EXISTS zones_org_kind_idx ON zones (org_id, kind);
CREATE UNIQUE INDEX IF NOT EXISTS zones_org_slug_uk ON zones (org_id, slug) WHERE slug IS NOT NULL;

-- 7. ai_placements
CREATE TABLE IF NOT EXISTS ai_placements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id),
  run_id UUID NOT NULL,
  proposed_location GEOGRAPHY(POINT, 4326) NOT NULL,
  proposed_area_m2 NUMERIC NOT NULL,
  rationale_md TEXT,
  score NUMERIC NOT NULL,
  score_components JSONB NOT NULL,
  status placement_status NOT NULL DEFAULT 'draft',
  strategy TEXT NOT NULL DEFAULT 'phosphate_recovery',
  reviewed_by UUID REFERENCES profiles(user_id),
  reviewed_at TIMESTAMPTZ,
  model_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_placements_run_idx ON ai_placements (org_id, run_id);
CREATE INDEX IF NOT EXISTS ai_placements_loc_gix ON ai_placements USING GIST (proposed_location);

-- add FK algae_panels.source_placement_id -> ai_placements.id now that ai_placements exists
DO $$ BEGIN
  ALTER TABLE algae_panels
    ADD CONSTRAINT algae_panels_source_placement_fk
    FOREIGN KEY (source_placement_id) REFERENCES ai_placements(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 8. ai_forecasts
CREATE TABLE IF NOT EXISTS ai_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id),
  target_kind forecast_target NOT NULL,
  target_id UUID NOT NULL,
  horizon_years INT NOT NULL DEFAULT 10,
  projections JSONB NOT NULL,
  assumptions JSONB NOT NULL,
  brief_md TEXT,
  model_name TEXT,
  input_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_forecasts_target_idx ON ai_forecasts (org_id, target_kind, target_id);
CREATE INDEX IF NOT EXISTS ai_forecasts_hash_idx ON ai_forecasts (input_hash);

-- 9. layers
CREATE TABLE IF NOT EXISTS layers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id),
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  visible_for JSONB NOT NULL DEFAULT '{"admin":true,"supervisor":true,"user":false}'::jsonb,
  display_order INT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, key)
);

-- 10. news_events
CREATE TABLE IF NOT EXISTS news_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id),
  title TEXT NOT NULL,
  body_md TEXT,
  happened_at TIMESTAMPTZ NOT NULL,
  severity event_severity NOT NULL DEFAULT 'info',
  link TEXT,
  image_path TEXT,
  location GEOGRAPHY(POINT, 4326),
  created_by UUID REFERENCES profiles(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS news_events_org_date_idx ON news_events (org_id, happened_at DESC);

-- Auxiliary: user_ntfy_topics
CREATE TABLE IF NOT EXISTS user_ntfy_topics (
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, topic)
);

-- Auxiliary: ntfy_alert_log
CREATE TABLE IF NOT EXISTS ntfy_alert_log (
  id BIGSERIAL PRIMARY KEY,
  sensor_id UUID NOT NULL REFERENCES sensors(id) ON DELETE CASCADE,
  threshold_key TEXT NOT NULL,
  topic TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ntfy_alert_log_lookup_idx ON ntfy_alert_log (sensor_id, threshold_key, sent_at DESC);

-- Auxiliary: devices (future hardware ingestion)
CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id),
  label TEXT NOT NULL,
  secret_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'provisioned',
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auxiliary: weather_cache (15 min TTL, one row per org)
CREATE TABLE IF NOT EXISTS weather_cache (
  org_id UUID PRIMARY KEY REFERENCES orgs(id),
  windspeed_mps NUMERIC,
  winddirection_deg NUMERIC,
  temperature_c NUMERIC,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---- updated_at trigger ------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_algae_panels_updated BEFORE UPDATE ON algae_panels
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---- JWT custom-claims sync --------------------------------------------
CREATE OR REPLACE FUNCTION sync_user_metadata() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object('org_id', NEW.org_id::text, 'role', NEW.role::text)
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  CREATE TRIGGER trg_profiles_sync_meta
    AFTER INSERT OR UPDATE OF org_id, role ON profiles
    FOR EACH ROW EXECUTE FUNCTION sync_user_metadata();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---- Auth helper functions --------------------------------------------
CREATE OR REPLACE FUNCTION public.org_id() RETURNS UUID
LANGUAGE SQL STABLE AS $$
  SELECT NULLIF(
    COALESCE(
      current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'org_id',
      auth.jwt() -> 'app_metadata' ->> 'org_id'
    ),
    ''
  )::uuid
$$;

CREATE OR REPLACE FUNCTION public.user_role() RETURNS TEXT
LANGUAGE SQL STABLE AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role',
    auth.jwt() -> 'app_metadata' ->> 'role'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin() RETURNS BOOLEAN
LANGUAGE SQL STABLE AS $$
  SELECT public.user_role() = 'admin'
$$;

CREATE OR REPLACE FUNCTION public.is_supervisor_or_admin() RETURNS BOOLEAN
LANGUAGE SQL STABLE AS $$
  SELECT public.user_role() IN ('admin','supervisor')
$$;

-- ---- Enable RLS on every tenant-scoped table ---------------------------
ALTER TABLE orgs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE algae_panels      ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensors           ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_readings   ENABLE ROW LEVEL SECURITY;
ALTER TABLE zones             ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_placements     ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_forecasts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE layers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ntfy_topics  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ntfy_alert_log    ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices           ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_cache     ENABLE ROW LEVEL SECURITY;

-- ---- RLS policies -------------------------------------------------------
-- orgs
DROP POLICY IF EXISTS orgs_select ON orgs;
CREATE POLICY orgs_select ON orgs FOR SELECT USING (id = public.org_id());

DROP POLICY IF EXISTS orgs_update ON orgs;
CREATE POLICY orgs_update ON orgs FOR UPDATE
  USING (id = public.org_id() AND public.is_admin())
  WITH CHECK (id = public.org_id() AND public.is_admin());

-- profiles
DROP POLICY IF EXISTS profiles_select ON profiles;
CREATE POLICY profiles_select ON profiles FOR SELECT
  USING (org_id = public.org_id());

DROP POLICY IF EXISTS profiles_update_self ON profiles;
CREATE POLICY profiles_update_self ON profiles FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS profiles_admin_all ON profiles;
CREATE POLICY profiles_admin_all ON profiles FOR ALL
  USING (org_id = public.org_id() AND public.is_admin())
  WITH CHECK (org_id = public.org_id() AND public.is_admin());

-- algae_panels
DROP POLICY IF EXISTS panels_select ON algae_panels;
CREATE POLICY panels_select ON algae_panels FOR SELECT
  USING (org_id = public.org_id());

DROP POLICY IF EXISTS panels_insert_admin ON algae_panels;
CREATE POLICY panels_insert_admin ON algae_panels FOR INSERT
  WITH CHECK (org_id = public.org_id() AND public.is_admin());

DROP POLICY IF EXISTS panels_update_admin ON algae_panels;
CREATE POLICY panels_update_admin ON algae_panels FOR UPDATE
  USING (org_id = public.org_id() AND public.is_admin())
  WITH CHECK (org_id = public.org_id() AND public.is_admin());

-- sensors
DROP POLICY IF EXISTS sensors_select ON sensors;
CREATE POLICY sensors_select ON sensors FOR SELECT
  USING (org_id = public.org_id());

DROP POLICY IF EXISTS sensors_insert_admin ON sensors;
CREATE POLICY sensors_insert_admin ON sensors FOR INSERT
  WITH CHECK (org_id = public.org_id() AND public.is_admin());

DROP POLICY IF EXISTS sensors_update_admin ON sensors;
CREATE POLICY sensors_update_admin ON sensors FOR UPDATE
  USING (org_id = public.org_id() AND public.is_admin())
  WITH CHECK (org_id = public.org_id() AND public.is_admin());

-- sensor_readings (read via sensor org; writes via service role only)
DROP POLICY IF EXISTS readings_select ON sensor_readings;
CREATE POLICY readings_select ON sensor_readings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM sensors s
    WHERE s.id = sensor_readings.sensor_id
      AND s.org_id = public.org_id()
  ));

-- zones
DROP POLICY IF EXISTS zones_select ON zones;
CREATE POLICY zones_select ON zones FOR SELECT
  USING (org_id = public.org_id());

DROP POLICY IF EXISTS zones_insert_admin ON zones;
CREATE POLICY zones_insert_admin ON zones FOR INSERT
  WITH CHECK (org_id = public.org_id() AND public.is_admin());

DROP POLICY IF EXISTS zones_update_admin ON zones;
CREATE POLICY zones_update_admin ON zones FOR UPDATE
  USING (org_id = public.org_id() AND public.is_admin())
  WITH CHECK (org_id = public.org_id() AND public.is_admin());

-- ai_placements (admin creates/edits; everyone in org reads)
DROP POLICY IF EXISTS ai_placements_select ON ai_placements;
CREATE POLICY ai_placements_select ON ai_placements FOR SELECT
  USING (org_id = public.org_id());

DROP POLICY IF EXISTS ai_placements_write_admin ON ai_placements;
CREATE POLICY ai_placements_write_admin ON ai_placements FOR ALL
  USING (org_id = public.org_id() AND public.is_admin())
  WITH CHECK (org_id = public.org_id() AND public.is_admin());

-- ai_forecasts (admin+supervisor can create; everyone in org reads)
DROP POLICY IF EXISTS ai_forecasts_select ON ai_forecasts;
CREATE POLICY ai_forecasts_select ON ai_forecasts FOR SELECT
  USING (org_id = public.org_id());

DROP POLICY IF EXISTS ai_forecasts_write_admin_supervisor ON ai_forecasts;
CREATE POLICY ai_forecasts_write_admin_supervisor ON ai_forecasts FOR ALL
  USING (org_id = public.org_id() AND public.is_supervisor_or_admin())
  WITH CHECK (org_id = public.org_id() AND public.is_supervisor_or_admin());

-- layers
DROP POLICY IF EXISTS layers_select ON layers;
CREATE POLICY layers_select ON layers FOR SELECT
  USING (org_id = public.org_id());

DROP POLICY IF EXISTS layers_write_admin ON layers;
CREATE POLICY layers_write_admin ON layers FOR ALL
  USING (org_id = public.org_id() AND public.is_admin())
  WITH CHECK (org_id = public.org_id() AND public.is_admin());

-- news_events
DROP POLICY IF EXISTS news_events_select ON news_events;
CREATE POLICY news_events_select ON news_events FOR SELECT
  USING (org_id = public.org_id());

DROP POLICY IF EXISTS news_events_write_admin ON news_events;
CREATE POLICY news_events_write_admin ON news_events FOR ALL
  USING (org_id = public.org_id() AND public.is_admin())
  WITH CHECK (org_id = public.org_id() AND public.is_admin());

-- user_ntfy_topics
DROP POLICY IF EXISTS ntfy_topics_self ON user_ntfy_topics;
CREATE POLICY ntfy_topics_self ON user_ntfy_topics FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ntfy_alert_log (service role only; no user policies means no access)
-- Deliberately no policies; admins can read via SECURITY DEFINER helper if needed.

-- devices (admin only)
DROP POLICY IF EXISTS devices_admin_all ON devices;
CREATE POLICY devices_admin_all ON devices FOR ALL
  USING (org_id = public.org_id() AND public.is_admin())
  WITH CHECK (org_id = public.org_id() AND public.is_admin());

-- weather_cache (read for any authed in org; writes via service role)
DROP POLICY IF EXISTS weather_cache_select ON weather_cache;
CREATE POLICY weather_cache_select ON weather_cache FOR SELECT
  USING (org_id = public.org_id());

-- ---- Helper: score_placement (scaffold, real logic in edge function) ---
-- Produces a default zero-score + empty components. The edge function
-- computes real scores; this SQL helper exists so §8.1 step 4 can be
-- expressed as a single query if we ever move scoring into Postgres.
CREATE OR REPLACE FUNCTION score_placement(candidate GEOGRAPHY, strategy TEXT)
RETURNS TABLE (score NUMERIC, components JSONB)
LANGUAGE SQL STABLE AS $$
  SELECT 0.0::NUMERIC, '{}'::JSONB
$$;

-- =========================================================================
-- end 0001_init.sql
-- =========================================================================
