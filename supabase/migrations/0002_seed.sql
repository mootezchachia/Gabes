-- =========================================================================
-- NAFAS V2 — Seed migration
-- Seeds org 'gabes', initial admin, default layers, realistic zones, and
-- 12 standalone air-quality sensors in 3 concentric rings around the GCT
-- complex (10.1178, 33.9312).
--
-- DEFAULT ADMIN CREDENTIALS (rotate after first login):
--   email:    admin@nafas.tn
--   password: changeme123!
-- =========================================================================

-- ---------------- 1. ORG --------------------------------------------------
INSERT INTO orgs (id, slug, name, default_map_center, default_map_zoom)
VALUES (
  '00000000-0000-0000-0000-0000000000a1',
  'gabes',
  'Municipalité de Gabès',
  ST_SetSRID(ST_MakePoint(10.0982, 33.8815), 4326)::geography,
  11.2
)
ON CONFLICT (slug) DO NOTHING;

-- ---------------- 2. ADMIN USER ------------------------------------------
-- Insert directly into auth.users with bcrypt-hashed password. Idempotent.
DO $$
DECLARE
  v_user_id uuid := '00000000-0000-0000-0000-0000000000b1';
  v_org_id  uuid := '00000000-0000-0000-0000-0000000000a1';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@nafas.tn') THEN
    INSERT INTO auth.users (
      id, instance_id, aud, role, email,
      encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      is_super_admin, confirmation_token, email_change, email_change_token_new, recovery_token
    )
    VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated', 'admin@nafas.tn',
      crypt('changeme123!', gen_salt('bf')),
      now(), now(), now(),
      jsonb_build_object(
        'provider','email','providers',ARRAY['email'],
        'org_id', v_org_id::text, 'role','admin'
      ),
      jsonb_build_object('full_name','Administrateur NAFAS'),
      false, '', '', '', ''
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM profiles WHERE user_id = v_user_id) THEN
    INSERT INTO profiles (user_id, org_id, role, full_name, preferred_locale)
    VALUES (v_user_id, v_org_id, 'admin', 'Administrateur NAFAS', 'fr');
  END IF;
END $$;

-- ---------------- 3. DEFAULT LAYERS --------------------------------------
INSERT INTO layers (org_id, key, label, visible_for, display_order) VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'sensors',             'Capteurs',              '{"admin":true,"supervisor":true,"user":true}'::jsonb,  10),
  ('00000000-0000-0000-0000-0000000000a1', 'panels',              'Panneaux à algues',     '{"admin":true,"supervisor":true,"user":true}'::jsonb,  20),
  ('00000000-0000-0000-0000-0000000000a1', 'plume_so2',           'Panache SO₂',           '{"admin":true,"supervisor":true,"user":false}'::jsonb, 30),
  ('00000000-0000-0000-0000-0000000000a1', 'plume_no2',           'Panache NO₂',           '{"admin":true,"supervisor":true,"user":false}'::jsonb, 31),
  ('00000000-0000-0000-0000-0000000000a1', 'plume_pm25',          'Panache PM2.5',         '{"admin":true,"supervisor":true,"user":false}'::jsonb, 32),
  ('00000000-0000-0000-0000-0000000000a1', 'zones_school',        'Écoles',                '{"admin":true,"supervisor":true,"user":true}'::jsonb,  40),
  ('00000000-0000-0000-0000-0000000000a1', 'zones_hospital',      'Hôpitaux',              '{"admin":true,"supervisor":true,"user":true}'::jsonb,  41),
  ('00000000-0000-0000-0000-0000000000a1', 'zones_residential',   'Résidentiel',           '{"admin":true,"supervisor":true,"user":false}'::jsonb, 42),
  ('00000000-0000-0000-0000-0000000000a1', 'zones_industrial',    'Industriel',            '{"admin":true,"supervisor":true,"user":false}'::jsonb, 43),
  ('00000000-0000-0000-0000-0000000000a1', 'zones_marine_protected','Aire marine protégée','{"admin":true,"supervisor":true,"user":true}'::jsonb,  44),
  ('00000000-0000-0000-0000-0000000000a1', 'bathymetry',          'Bathymétrie',           '{"admin":true,"supervisor":true,"user":false}'::jsonb, 50),
  ('00000000-0000-0000-0000-0000000000a1', 'news_events',         'Actualités',            '{"admin":true,"supervisor":true,"user":true}'::jsonb,  60)
ON CONFLICT (org_id, key) DO NOTHING;

-- ---------------- 4. ZONES ------------------------------------------------
-- Hand-drawn approximate polygons for Gabès. Coordinates in (lon, lat) order.
INSERT INTO zones (org_id, kind, name, slug, geometry, metadata)
VALUES
  -- Ghannouch industrial complex (around GCT)
  ('00000000-0000-0000-0000-0000000000a1','industrial','Complexe industriel de Ghannouch','ghannouch',
   ST_GeogFromText('SRID=4326;POLYGON((10.1050 33.9260, 10.1320 33.9260, 10.1320 33.9380, 10.1050 33.9380, 10.1050 33.9260))'),
   '{"operator":"GCT","notes":"Complexe chimique phosphates — Groupe Chimique Tunisien"}'::jsonb),
  -- Chatt Essalam school / residential
  ('00000000-0000-0000-0000-0000000000a1','school','École Chatt Essalam','chattessalam',
   ST_GeogFromText('SRID=4326;POLYGON((10.1034 33.9108, 10.1078 33.9108, 10.1078 33.9140, 10.1034 33.9140, 10.1034 33.9108))'),
   '{"student_count":420,"notes":"École primaire Chatt Essalam — incident Oct 14 2025"}'::jsonb),
  -- Habib Bourguiba hospital
  ('00000000-0000-0000-0000-0000000000a1','hospital','Hôpital régional Habib Bourguiba','hopital-habib-bourguiba',
   ST_GeogFromText('SRID=4326;POLYGON((10.0960 33.8820, 10.1010 33.8820, 10.1010 33.8860, 10.0960 33.8860, 10.0960 33.8820))'),
   '{"beds":320,"notes":"Hôpital régional de Gabès"}'::jsonb),
  -- Gulf coastal strip
  ('00000000-0000-0000-0000-0000000000a1','coastal','Littoral Golfe de Gabès','littoral-gabes',
   ST_GeogFromText('SRID=4326;POLYGON((10.0800 33.8500, 10.1500 33.8500, 10.1500 33.9500, 10.0800 33.9500, 10.0800 33.8500))'),
   '{"notes":"Bande côtière du Golfe"}'::jsonb),
  -- Marine protected band (offshore, historical Posidonia meadow)
  ('00000000-0000-0000-0000-0000000000a1','marine_protected','Aire marine Posidonia','aire-marine-posidonia',
   ST_GeogFromText('SRID=4326;POLYGON((10.1500 33.8200, 10.2600 33.8200, 10.2600 33.9000, 10.1500 33.9000, 10.1500 33.8200))'),
   '{"historical_posidonia_cover_pct":62,"notes":"Herbier de Posidonies historique"}'::jsonb),
  -- Central residential
  ('00000000-0000-0000-0000-0000000000a1','residential','Centre-ville de Gabès','centre-ville',
   ST_GeogFromText('SRID=4326;POLYGON((10.0890 33.8780, 10.1080 33.8780, 10.1080 33.8880, 10.0890 33.8880, 10.0890 33.8780))'),
   '{"population_estimate":42000}'::jsonb)
ON CONFLICT DO NOTHING;

-- ---------------- 5. SENSORS (12 standalone, 3 rings around GCT) ---------
-- GCT complex center: (10.1178, 33.9312). Rings at ~600m / 1.2km / 2.0km.
-- Each sensor hosts SO2 by default (primary pollutant for GCT). Thresholds
-- use WHO/Tunisian guidance: SO2 warning=100 µg/m³, critical=300.
-- Baseline is used by the Pasquill simulator as a floor; diurnal profile
-- encodes dawn/noon multipliers.
INSERT INTO sensors (org_id, location, type, unit, label, thresholds, metadata)
VALUES
  -- Ring 1 (~600 m around GCT)
  ('00000000-0000-0000-0000-0000000000a1', ST_GeogFromText('SRID=4326;POINT(10.1235 33.9358)'), 'so2','µg/m³','GCT Nord-Est (ring 1)',    '{"warning":100,"critical":300}',  '{"ring":1,"baseline":18,"diurnal_peak":"dawn"}'),
  ('00000000-0000-0000-0000-0000000000a1', ST_GeogFromText('SRID=4326;POINT(10.1121 33.9358)'), 'so2','µg/m³','GCT Nord-Ouest (ring 1)',  '{"warning":100,"critical":300}',  '{"ring":1,"baseline":16,"diurnal_peak":"dawn"}'),
  ('00000000-0000-0000-0000-0000000000a1', ST_GeogFromText('SRID=4326;POINT(10.1121 33.9267)'), 'so2','µg/m³','GCT Sud-Ouest (ring 1)',   '{"warning":100,"critical":300}',  '{"ring":1,"baseline":20,"diurnal_peak":"dawn"}'),
  ('00000000-0000-0000-0000-0000000000a1', ST_GeogFromText('SRID=4326;POINT(10.1235 33.9267)'), 'so2','µg/m³','GCT Sud-Est (ring 1)',     '{"warning":100,"critical":300}',  '{"ring":1,"baseline":19,"diurnal_peak":"dawn"}'),
  -- Ring 2 (~1.2 km around GCT)
  ('00000000-0000-0000-0000-0000000000a1', ST_GeogFromText('SRID=4326;POINT(10.1296 33.9420)'), 'so2','µg/m³','Ghannouch NE (ring 2)',    '{"warning":100,"critical":300}',  '{"ring":2,"baseline":12,"diurnal_peak":"dawn"}'),
  ('00000000-0000-0000-0000-0000000000a1', ST_GeogFromText('SRID=4326;POINT(10.1060 33.9420)'), 'so2','µg/m³','Ghannouch NW (ring 2)',    '{"warning":100,"critical":300}',  '{"ring":2,"baseline":11,"diurnal_peak":"dawn"}'),
  ('00000000-0000-0000-0000-0000000000a1', ST_GeogFromText('SRID=4326;POINT(10.1060 33.9204)'), 'so2','µg/m³','Chatt Essalam (ring 2)',   '{"warning":100,"critical":300}',  '{"ring":2,"baseline":22,"diurnal_peak":"dawn","note":"Site incident Oct 2025"}'),
  ('00000000-0000-0000-0000-0000000000a1', ST_GeogFromText('SRID=4326;POINT(10.1296 33.9204)'), 'so2','µg/m³','Côte Ghannouch (ring 2)',  '{"warning":100,"critical":300}',  '{"ring":2,"baseline":14,"diurnal_peak":"dawn"}'),
  -- Ring 3 (~2.0 km around GCT)
  ('00000000-0000-0000-0000-0000000000a1', ST_GeogFromText('SRID=4326;POINT(10.1394 33.9492)'), 'so2','µg/m³','Métouia Sud (ring 3)',     '{"warning":100,"critical":300}',  '{"ring":3,"baseline":9,"diurnal_peak":"dawn"}'),
  ('00000000-0000-0000-0000-0000000000a1', ST_GeogFromText('SRID=4326;POINT(10.0962 33.9492)'), 'so2','µg/m³','Nord Gabès (ring 3)',      '{"warning":100,"critical":300}',  '{"ring":3,"baseline":9,"diurnal_peak":"dawn"}'),
  ('00000000-0000-0000-0000-0000000000a1', ST_GeogFromText('SRID=4326;POINT(10.0962 33.9132)'), 'so2','µg/m³','Gabès Centre N (ring 3)',  '{"warning":100,"critical":300}',  '{"ring":3,"baseline":15,"diurnal_peak":"dawn"}'),
  ('00000000-0000-0000-0000-0000000000a1', ST_GeogFromText('SRID=4326;POINT(10.1394 33.9132)'), 'so2','µg/m³','Côte sud GCT (ring 3)',    '{"warning":100,"critical":300}',  '{"ring":3,"baseline":12,"diurnal_peak":"dawn"}')
ON CONFLICT DO NOTHING;

-- Example additional PM2.5 sensor on the Chatt Essalam school (co-located)
INSERT INTO sensors (org_id, location, type, unit, label, thresholds, metadata)
VALUES
  ('00000000-0000-0000-0000-0000000000a1', ST_GeogFromText('SRID=4326;POINT(10.1054 33.9121)'), 'pm25','µg/m³','Chatt Essalam PM2.5', '{"warning":35,"critical":100}', '{"ring":2,"baseline":12,"diurnal_peak":"dawn","note":"Co-located school sensor"}')
ON CONFLICT DO NOTHING;

-- ---------------- 6. NEWS EVENTS -----------------------------------------
INSERT INTO news_events (org_id, title, body_md, happened_at, severity, location)
VALUES
  ('00000000-0000-0000-0000-0000000000a1',
   'Intoxication à l''école Chatt Essalam',
   '# Incident du 14 octobre 2025\n\nPlusieurs dizaines d''élèves ont été pris en charge après inhalation de fumées issues du complexe GCT. Pics de SO₂ relevés à 340 µg/m³ dans les environs immédiats.\n\n**Actions :**\n- Fermeture temporaire de l''école\n- Saisine de la Municipalité de Gabès',
   '2025-10-14 07:40:00+01', 'critical',
   ST_GeogFromText('SRID=4326;POINT(10.1054 33.9121)')),
  ('00000000-0000-0000-0000-0000000000a1',
   'Mobilisation citoyenne — décembre 2025',
   '# Revival du mouvement *Stop Pollution*\n\nRassemblement pacifique à Gabès centre. La Municipalité annonce la plateforme NAFAS comme réponse technologique à la surveillance continue.',
   '2025-12-06 14:00:00+01', 'info',
   ST_GeogFromText('SRID=4326;POINT(10.0982 33.8815)'))
ON CONFLICT DO NOTHING;

-- =========================================================================
-- end 0002_seed.sql
-- =========================================================================
