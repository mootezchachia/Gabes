-- =========================================================================
-- RLS cross-tenant isolation test
--
-- Seeds two orgs (A and B) with one admin each, then verifies that
-- admin A cannot SELECT/INSERT/UPDATE into org B's rows and vice versa.
--
-- Run in the Supabase SQL editor, or via:
--   psql <conn> -f supabase/tests/rls.spec.sql
--
-- Cleans up at the end, so this can be run repeatedly. If any assertion
-- fails (RAISE EXCEPTION), the test aborts with a descriptive error.
-- =========================================================================

BEGIN;

-- ---- seed two orgs + two admins ----------------------------------------
DO $$
DECLARE
  v_org_a uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_org_b uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  v_usr_a uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-0000000000aa';
  v_usr_b uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-0000000000bb';
BEGIN
  INSERT INTO orgs (id, slug, name) VALUES (v_org_a, 'testorg-a', 'Test Org A')
  ON CONFLICT (slug) DO NOTHING;
  INSERT INTO orgs (id, slug, name) VALUES (v_org_b, 'testorg-b', 'Test Org B')
  ON CONFLICT (slug) DO NOTHING;

  -- Stub auth.users rows (no password — we won't go through supabase auth
  -- in this test; we only use user IDs to inject JWT claims below).
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at, raw_app_meta_data,
    is_super_admin, confirmation_token, email_change, email_change_token_new, recovery_token)
  VALUES
    (v_usr_a, '00000000-0000-0000-0000-000000000000', 'authenticated','authenticated',
     'admin-a@test.local','',now(),now(),now(),
     jsonb_build_object('org_id', v_org_a::text, 'role','admin'),
     false,'','','','')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at, raw_app_meta_data,
    is_super_admin, confirmation_token, email_change, email_change_token_new, recovery_token)
  VALUES
    (v_usr_b, '00000000-0000-0000-0000-000000000000', 'authenticated','authenticated',
     'admin-b@test.local','',now(),now(),now(),
     jsonb_build_object('org_id', v_org_b::text, 'role','admin'),
     false,'','','','')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO profiles (user_id, org_id, role, full_name)
  VALUES (v_usr_a, v_org_a, 'admin', 'Admin A')
  ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO profiles (user_id, org_id, role, full_name)
  VALUES (v_usr_b, v_org_b, 'admin', 'Admin B')
  ON CONFLICT (user_id) DO NOTHING;

  -- One panel per org, for cross-org read tests.
  INSERT INTO algae_panels (id, org_id, location, area_m2, status)
  VALUES
    ('ccccccc1-0000-0000-0000-000000000001', v_org_a,
     ST_GeogFromText('SRID=4326;POINT(10.10 33.90)'), 500, 'planned')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO algae_panels (id, org_id, location, area_m2, status)
  VALUES
    ('ccccccc2-0000-0000-0000-000000000002', v_org_b,
     ST_GeogFromText('SRID=4326;POINT(10.20 33.95)'), 600, 'planned')
  ON CONFLICT (id) DO NOTHING;
END $$;

-- ---- Act as admin A ----------------------------------------------------
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-0000000000aa","app_metadata":{"org_id":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"admin"}}';

-- admin A must see org A's panel (1 row)
DO $$
DECLARE v_count int;
BEGIN
  SELECT COUNT(*) INTO v_count FROM algae_panels WHERE id = 'ccccccc1-0000-0000-0000-000000000001';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'FAIL: admin A cannot see own org panel (count=%)', v_count;
  END IF;
END $$;

-- admin A must NOT see org B's panel
DO $$
DECLARE v_count int;
BEGIN
  SELECT COUNT(*) INTO v_count FROM algae_panels WHERE id = 'ccccccc2-0000-0000-0000-000000000002';
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'FAIL: admin A saw org B panel (count=%)', v_count;
  END IF;
END $$;

-- admin A must NOT be able to INSERT a panel into org B
DO $$
BEGIN
  BEGIN
    INSERT INTO algae_panels (org_id, location, area_m2, status)
    VALUES (
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      ST_GeogFromText('SRID=4326;POINT(10.21 33.96)'),
      400, 'planned'
    );
    RAISE EXCEPTION 'FAIL: admin A inserted row into org B';
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN
    -- expected: RLS rejection
    NULL;
  END;
END $$;

-- admin A must NOT be able to UPDATE org B's panel
DO $$
DECLARE v_affected int;
BEGIN
  UPDATE algae_panels SET area_m2 = 9999
  WHERE id = 'ccccccc2-0000-0000-0000-000000000002';
  GET DIAGNOSTICS v_affected = ROW_COUNT;
  IF v_affected > 0 THEN
    RAISE EXCEPTION 'FAIL: admin A updated org B panel (rows=%)', v_affected;
  END IF;
END $$;

-- ---- Switch to admin B -------------------------------------------------
RESET ROLE;
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims = '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-0000000000bb","app_metadata":{"org_id":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"admin"}}';

DO $$
DECLARE v_count int;
BEGIN
  SELECT COUNT(*) INTO v_count FROM algae_panels WHERE id = 'ccccccc1-0000-0000-0000-000000000001';
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'FAIL: admin B saw org A panel (count=%)', v_count;
  END IF;
END $$;

DO $$ BEGIN
  RAISE NOTICE 'RLS cross-org isolation tests PASSED';
END $$;

ROLLBACK; -- discard test seed
