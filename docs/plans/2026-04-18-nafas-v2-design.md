# NAFAS V2 — Design Document

**Status:** Validated design, ready for implementation.
**Date:** 2026-04-18
**Supersedes:** `docs/plans/2026-04-17-nafas-simulator.md` (hackathon plan — archived).

---

## 0. Goal & scope

Transform NAFAS from a static-data demo (landing + `/monitor3d` Cesium scene) into a real, authenticated, multi-role platform for the Municipalité de Gabès, backed by Supabase, with simulated sensor readings, AI-assisted algae panel placement, mechanistic forecasting, and a citizen-facing PWA.

**In scope (V2):**
- Role-based auth (admin / supervisor / user) with Supabase Auth.
- 10-table Postgres schema with PostGIS + RLS.
- `/app` shell (Carte + Objets + Analytique + Paramètres) for admin + supervisor.
- `/dawa` PWA for citizens (`user` role), with ntfy.sh push notifications.
- Simulated sensor readings via cron edge function using Pasquill-Gifford dispersion.
- AI pipeline: rule-based placement scorer + OpenRouter free-tier LLM narration.
- Mechanistic forecast simulation + optional LLM policy brief.
- Supabase Realtime for live sensor updates on Carte and /dawa.
- Scenario-compare (do-nothing vs ORACLE plan) in Analytique.

**Out of scope (V3+):**
- Real hardware sensor deployment (but ingestion API is future-proofed).
- Multi-tenant cross-city god-mode.
- Automated SMS/WhatsApp dispatch.
- Hospital capacity feeds, GCT transparency portal integration.
- Audit log, API keys, public developer platform.
- RTL Arabic locale full polish (basic FR/EN/AR strings; full RTL layout deferred).

---

## 1. Locked decisions (from brainstorming, 2026-04-18)

| Fork | Choice | Reasoning |
|---|---|---|
| Target horizon | **B — Post-hackathon V2** | Real product, properly designed. |
| Role semantics | **M1 — Institutional** | Municipalité owns it; researchers observe; citizens consume. Matches dossier framing. |
| Admin scope | **S2 minus interventions (replaced by single algae panel object)** | One intervention type: algae panel built from Fosfo waste, houses natural algae, embeds sensors. |
| AI architecture | **AI-C hybrid** | Rule-based scorer + mechanistic forecast own numbers; LLM owns voice. |
| Admin UI shape | **U3 split shell** | Map-first (Carte) + escape hatch tables (Objets) + dashboards (Analytique) + settings (Paramètres). |
| Citizen UX | **A3 hybrid** | Separate `/dawa` PWA for user role, `/app/carte` accessible to all authenticated. |
| Sensor pipeline | **SP1 (simulated only)** with future-proofed schema | `source` column defaults to `'simulated'`; hardware can plug in later without migration. |
| LLM provider | **OpenRouter (free models)** | `qwen/qwen3-235b-a22b:free` primary, `llama-3.3-70b:free` + `gemma-2-9b:free` fallback chain. |

---

## 2. Architecture overview

### 2.1 Stack (additions to existing repo)

- **Next.js 16** + **React 19** (already in repo).
- **Supabase**: Auth, Postgres (with PostGIS extension), Realtime, Edge Functions, pg_cron.
- **`@supabase/ssr`** — SSR cookie-aware client for App Router.
- **`@tanstack/react-query`** — client-side cache + query invalidation glue.
- **`next-pwa`** — PWA manifest + service worker for `/dawa`.
- **shadcn/ui** — DataTable, Form, Dialog, Sheet, Tabs, Command (already in repo).
- **Recharts** — time-series charts in Analytique.
- **Cesium** — the existing 3D scene (unchanged core, wrapped with admin tools).
- **OpenAI SDK** pointed at OpenRouter — for LLM calls.

### 2.2 Final route map

| Route | Audience | Description |
|---|---|---|
| `/` | Public | Landing (existing). Updated CTAs link to `/app` (or `/login` if unauthenticated). |
| `/login` | Public | Supabase Auth: email+password + magic link. |
| `/monitor3d` | Public (deprecated after V2 launch) | Read-only preview. Banner: "Se connecter pour accéder au moniteur complet." Redirected to `/app/carte` in V2.1. |
| `/app` | Authenticated | Redirect router: `admin`/`supervisor` → `/app/carte`, `user` → `/dawa`. |
| `/app/carte` | Auth | Cesium scene + admin tool rail when `role=admin`. |
| `/app/objets/panneaux` | Auth | DataTable of algae_panels. |
| `/app/objets/capteurs` | Auth | DataTable of sensors. |
| `/app/objets/zones` | Auth | DataTable of zones. |
| `/app/objets/actualites` | Auth | DataTable of news_events. |
| `/app/analytique` | Auth | KPIs + trends + AI history + scenario compare + PDF export. |
| `/app/parametres/utilisateurs` | Admin | Invites, role changes. |
| `/app/parametres/couches` | Admin | Layer visibility grid. |
| `/app/parametres/organisation` | Admin | Org branding + defaults + dangerous zone. |
| `/app/parametres/moi` | Auth | Self-profile edit. |
| `/dawa` | Auth, default for `user` | PWA, status ring + alerts + trajet + settings. |
| `/api/ingest/v1` | Machine (HMAC) | Sensor ingestion endpoint (simulator posts here; future hardware too). |
| `/api/ai/placement` | Admin only (auth-checked) | Scorer + LLM narration. |
| `/api/ai/forecast` | Admin+Supervisor | Sim + LLM brief. |
| `/api/dawa/route` | Auth user | Trajet recommendation. |

### 2.3 Environment variables

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # server-only, never exposed to client

# LLM
OPENROUTER_API_KEY=sk-or-...

# Map/3D (existing)
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ...
NEXT_PUBLIC_CESIUM_ION_TOKEN=eyJ...

# ntfy.sh (V2) — public instance free; self-host later if privacy required
NTFY_URL=https://ntfy.sh
NTFY_AUTH_TOKEN=                                      # optional, only if using auth tier
NEXT_PUBLIC_NTFY_URL=https://ntfy.sh                  # client-side for deep-links
NEXT_PUBLIC_NTFY_TOPIC_PREFIX=nafas-gabes             # per-org topic prefix
```

---

## 3. Data model

### 3.1 Tables

All tables:
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()` unless noted.
- `org_id UUID NOT NULL REFERENCES orgs(id)` unless noted.
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()` and `updated_at TIMESTAMPTZ` with trigger.
- PostGIS columns use `geography(Point, 4326)` or `geography(Polygon, 4326)`.

```sql
-- 1. Organizations (multi-tenant from day one, seeded with 'gabes')
CREATE TABLE orgs (
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

-- 2. User profiles (extends auth.users)
CREATE TYPE user_role AS ENUM ('admin', 'supervisor', 'user');
CREATE TYPE locale AS ENUM ('fr', 'ar', 'en');

CREATE TABLE profiles (
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

-- 3. Algae panels (the single intervention type)
CREATE TYPE panel_status AS ENUM ('planned', 'deploying', 'active', 'removed');

CREATE TABLE algae_panels (
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
  source_placement_id UUID, -- nullable FK to ai_placements if this panel came from an AI approval
  created_by UUID REFERENCES profiles(user_id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);
CREATE INDEX ON algae_panels USING GIST (location);
CREATE INDEX ON algae_panels (org_id, status);

-- 4. Sensors (air + water; attached to panel or standalone)
CREATE TYPE sensor_type AS ENUM ('so2','no2','pm25','pm10','ph','turbidity','chlorophyll_a','temperature');

CREATE TABLE sensors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id),
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  panel_id UUID REFERENCES algae_panels(id) ON DELETE SET NULL,
  type sensor_type NOT NULL,
  unit TEXT NOT NULL,
  thresholds JSONB DEFAULT '{}'::jsonb, -- e.g. {"warning":100,"critical":300}
  active BOOLEAN NOT NULL DEFAULT true,
  source TEXT NOT NULL DEFAULT 'simulated', -- 'simulated' | 'hardware'
  device_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb, -- baseline values for water simulators, diurnal profile, etc.
  installed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON sensors USING GIST (location);
CREATE INDEX ON sensors (org_id, active);

-- 5. Sensor readings (append-only time-series)
CREATE TABLE sensor_readings (
  id BIGSERIAL PRIMARY KEY,
  sensor_id UUID NOT NULL REFERENCES sensors(id) ON DELETE CASCADE,
  value NUMERIC NOT NULL,
  taken_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT NOT NULL DEFAULT 'simulated'
);
CREATE INDEX ON sensor_readings (sensor_id, taken_at DESC);

-- 6. Zones of interest
CREATE TYPE zone_kind AS ENUM ('school','hospital','residential','industrial','marine_protected','coastal','oasis');

CREATE TABLE zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id),
  kind zone_kind NOT NULL,
  name TEXT NOT NULL,
  geometry GEOGRAPHY(POLYGON, 4326) NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON zones USING GIST (geometry);
CREATE INDEX ON zones (org_id, kind);

-- 7. AI placements
CREATE TYPE placement_status AS ENUM ('draft','approved','rejected','deployed');

CREATE TABLE ai_placements (
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
CREATE INDEX ON ai_placements (org_id, run_id);
CREATE INDEX ON ai_placements USING GIST (proposed_location);

-- 8. AI forecasts
CREATE TYPE forecast_target AS ENUM ('panel', 'placement');

CREATE TABLE ai_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id),
  target_kind forecast_target NOT NULL,
  target_id UUID NOT NULL,
  horizon_years INT NOT NULL DEFAULT 10,
  projections JSONB NOT NULL, -- [{year, p_removed_kg, posidonia_cover_pct, chlorophyll_mg_m3, fish_index}]
  assumptions JSONB NOT NULL,
  brief_md TEXT,
  model_name TEXT,
  input_hash TEXT, -- for caching idempotent forecasts
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON ai_forecasts (org_id, target_kind, target_id);
CREATE INDEX ON ai_forecasts (input_hash);

-- 9. Layers (visibility per role)
CREATE TABLE layers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id),
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  visible_for JSONB NOT NULL DEFAULT '{"admin":true,"supervisor":true,"user":false}'::jsonb,
  display_order INT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, key)
);

-- 10. News events
CREATE TYPE event_severity AS ENUM ('info','warning','critical');

CREATE TABLE news_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id),
  title TEXT NOT NULL,
  body_md TEXT,
  happened_at TIMESTAMPTZ NOT NULL,
  severity event_severity NOT NULL DEFAULT 'info',
  link TEXT,
  image_path TEXT, -- Supabase Storage path
  location GEOGRAPHY(POINT, 4326),
  created_by UUID REFERENCES profiles(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON news_events (org_id, happened_at DESC);

-- Auxiliary: ntfy topic subscriptions per user (what topics this user should follow)
-- NOTE: the actual ntfy subscription happens in the ntfy app on the user's phone.
-- This table just tracks which topics the app should suggest/auto-subscribe for this user
-- based on their home_location and school_location.
CREATE TABLE user_ntfy_topics (
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, topic)
);

-- Auxiliary: anti-spam log for threshold-crossing alerts
CREATE TABLE ntfy_alert_log (
  id BIGSERIAL PRIMARY KEY,
  sensor_id UUID NOT NULL REFERENCES sensors(id) ON DELETE CASCADE,
  threshold_key TEXT NOT NULL,    -- 'warning' | 'critical'
  topic TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON ntfy_alert_log (sensor_id, threshold_key, sent_at DESC);

-- Auxiliary: devices (for future hardware; empty in V2 but ready)
CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id),
  label TEXT NOT NULL,
  secret_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'provisioned',
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auxiliary: weather cache (15 min TTL)
CREATE TABLE weather_cache (
  org_id UUID PRIMARY KEY REFERENCES orgs(id),
  windspeed_mps NUMERIC,
  winddirection_deg NUMERIC,
  temperature_c NUMERIC,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 3.2 Updated_at trigger (applied to all mutable tables)

```sql
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- apply to algae_panels, sensors, profiles (and any others with updated_at)
CREATE TRIGGER trg_algae_panels_updated BEFORE UPDATE ON algae_panels
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
-- repeat for each table
```

### 3.3 JWT custom claims (role + org_id in JWT)

```sql
CREATE OR REPLACE FUNCTION sync_user_metadata() RETURNS trigger AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = raw_app_meta_data
    || jsonb_build_object('org_id', NEW.org_id::text, 'role', NEW.role::text)
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_profiles_sync_meta
  AFTER INSERT OR UPDATE OF org_id, role ON profiles
  FOR EACH ROW EXECUTE FUNCTION sync_user_metadata();
```

Claim accessors used by RLS:

```sql
CREATE OR REPLACE FUNCTION auth.org_id() RETURNS UUID AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION auth.user_role() RETURNS TEXT AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'role')
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION auth.is_admin() RETURNS BOOLEAN AS $$
  SELECT auth.user_role() = 'admin'
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION auth.is_supervisor_or_admin() RETURNS BOOLEAN AS $$
  SELECT auth.user_role() IN ('admin', 'supervisor')
$$ LANGUAGE SQL STABLE;
```

### 3.4 RLS policies (representative samples)

All tables have `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`.

**`orgs`:**
```sql
CREATE POLICY orgs_select ON orgs FOR SELECT USING (id = auth.org_id());
CREATE POLICY orgs_update ON orgs FOR UPDATE USING (id = auth.org_id() AND auth.is_admin());
```

**`profiles`:**
```sql
CREATE POLICY profiles_select ON profiles FOR SELECT
  USING (org_id = auth.org_id());
CREATE POLICY profiles_update_self ON profiles FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND org_id = (SELECT org_id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY profiles_admin_manage ON profiles FOR ALL
  USING (org_id = auth.org_id() AND auth.is_admin());
```

**`algae_panels`:**
```sql
CREATE POLICY panels_select ON algae_panels FOR SELECT
  USING (org_id = auth.org_id());
CREATE POLICY panels_insert ON algae_panels FOR INSERT
  WITH CHECK (org_id = auth.org_id() AND auth.is_admin());
CREATE POLICY panels_update ON algae_panels FOR UPDATE
  USING (org_id = auth.org_id() AND auth.is_admin());
-- No DELETE policy — deletions go through status='removed' (soft delete).
```

**`sensors` / `zones` / `layers` / `ai_placements` / `ai_forecasts` / `news_events`:** same pattern — SELECT for org, INSERT/UPDATE for admin.

**`sensor_readings`:**
```sql
CREATE POLICY readings_select ON sensor_readings FOR SELECT
  USING (EXISTS (SELECT 1 FROM sensors s WHERE s.id = sensor_readings.sensor_id AND s.org_id = auth.org_id()));
-- INSERTs happen via service role (edge function) or via HMAC ingestion endpoint. No user RLS insert policy.
```

**`user_ntfy_topics`:**
```sql
CREATE POLICY ntfy_topics_self ON user_ntfy_topics FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
```

**`ntfy_alert_log`:**
```sql
-- Service role writes; no user read access (operational telemetry).
-- Admin can read via a SECURITY DEFINER function if needed.
```

---

## 4. Auth & onboarding

### 4.1 Seeded admin bootstrap

Migration `0002_seed.sql` creates:
1. `orgs` row with `slug='gabes', name='Municipalité de Gabès'`.
2. An `auth.users` row for `admin@nafas.tn` with a known initial password (documented in `README` under a sealed section; must be rotated on first login).
3. A `profiles` row linking that user to the gabes org with `role='admin'`.

The first admin changes their password on first login via Supabase Auth's password reset flow.

### 4.2 Invite flow for supervisor / user

Admin goes to `/app/parametres/utilisateurs` → clicks `[+ Inviter]` → fills email + role + full_name → server action calls `supabase.auth.admin.inviteUserByEmail(email, { data: { invited_role, invited_org_id } })`. Supabase sends a magic-link email.

On invite acceptance:
- Next.js middleware sees `new user, no profile row yet` → redirects to `/welcome` page which creates the `profiles` row using the `invited_role` and `invited_org_id` from the invite metadata, then prompts the user to set a password.

### 4.3 Middleware

`middleware.ts` at repo root:
- Reads Supabase session via `@supabase/ssr`.
- Refreshes token if expired.
- On protected routes (`/app/*`, `/dawa`, `/api/ai/*`):
  - No session → 302 `/login?next=<original>`.
  - Has session but no `profile` → 302 `/welcome`.
  - Has session + profile:
    - `/app/*` allows `admin | supervisor` (user gets 302 `/dawa`).
    - `/dawa` allows all three.
    - `/api/ai/placement`, `/api/parametres/*` allows `admin` only.

### 4.4 Session persistence

`@supabase/ssr` cookie-based session. HTTPS-only cookies. PKCE flow. Refresh happens automatically in middleware on every request.

---

## 5. `/app` shell

### 5.1 Layout

`app/app/layout.tsx`:
- Top bar (48px): org logo + name (from `orgs.logo_path`, `orgs.name`), global search (Command palette via `cmdk` — jumps to any panel/sensor/zone by name), user menu (avatar, role badge, `Voir comme Amina` button opens `/dawa`, Logout).
- Left rail (72px collapsed, 240px expanded): 4 tabs (Carte / Objets / Analytique / Paramètres) with Lucide icons + labels.
- Main area: tab content (full viewport minus chrome).
- Mobile (`<md`): left rail becomes bottom tab bar; top bar collapses to just org mark + user avatar.

### 5.2 Carte tab

See §7 for admin tool rail details.

### 5.3 Objets tab

`app/app/objets/[entity]/page.tsx` (dynamic segment): single implementation parameterized by `entity ∈ {panneaux, capteurs, zones, actualites}`.

Each page loads its config from `lib/app/objets/<entity>.ts`:

```ts
// example: lib/app/objets/panneaux.ts
export const panneauxConfig: EntityConfig<AlgaePanel> = {
  table: 'algae_panels',
  label: 'Panneaux à algues',
  icon: 'leaf',
  columns: [
    { key: 'status', label: 'État', render: StatusBadge, filter: 'select' },
    { key: 'location', label: 'Position', render: LatLngCell },
    { key: 'area_m2', label: 'Surface', render: (v) => `${v} m²` },
    { key: 'algae_species', label: 'Espèce' },
    { key: 'deployed_at', label: 'Déployé', render: DateCell },
    { key: 'actual_p_uptake_kg_per_year', label: 'P retiré (kg/an)' },
  ],
  form: PanneauForm,
  mapIcon: 'panel',
  viewOnMap: (row) => `/app/carte?focus=panel:${row.id}`,
};
```

DataTable features:
- Search by name/notes.
- Column filter dropdowns per filter-marked column.
- Sort by any column header.
- Bulk select (checkbox column) + bulk actions (change status, delete soft).
- `[+ Nouveau]` opens a dialog with the entity's form.
- `[Importer GeoJSON]` + `[Exporter GeoJSON]`.
- Inline action column: Edit (opens dialog), Duplicate, `[Voir sur carte]`.

### 5.4 Analytique tab

`app/app/analytique/page.tsx`: single page, 3 sections.

**KPI strip** (top): 6 `<KpiCard>` components. Each queries Supabase on mount, caches via React Query.

**Tendances capteurs** (left card): `<SensorTrendsChart>` — multi-line chart via Recharts. Legend with per-sensor toggles and color swatches. Threshold bands dashed. CSV export button.

**Historique IA** (right card): tabs for `Scans de placement` and `Prévisions`. Each renders a list; click a row opens a drawer with full detail.

**Compare scenarios button** (top right of Historique IA tab): opens a fullscreen `<ScenarioCompare>` dialog. User picks two forecasts; dialog renders side-by-side projections with a year scrubber synced across both mini-maps.

### 5.5 Paramètres tab

4 subtabs: `Utilisateurs | Couches | Organisation | Moi`.

**Utilisateurs:** DataTable of profiles in current org. Admin-only. `[+ Inviter]`. Inline role dropdown. Inline `Voir dernière connexion` (read from `auth.users.last_sign_in_at` via a SECURITY DEFINER function).

**Couches:** Grid of layers with 3 toggle columns. Drag handle per row to reorder (writes to `display_order`). `[+ Nouvelle couche]` if we expose custom layers (deferred to V2.1; v2 has only the default layers seeded).

**Organisation:** Single form. Upload logo to Storage bucket `branding/<org_id>/logo.<ext>`. Color picker for `primary_color`. Map center (click-to-set). AI weights tuning sliders.

**Moi:** Self-profile: full_name, home, school, language. Available to all roles. Useful for admins to test the `/dawa` experience with their own pinned home.

---

## 6. `/dawa` PWA

### 6.1 Layout

Route group `app/(dawa)/dawa/layout.tsx` — no /app chrome.

Page is a single `<main>` with mobile-first max-width, stacked sections:

1. **Header** — greeting + time + weather from `weather_cache` + gear.
2. **Hero status ring** — large SVG ring.
3. **Alerts feed** — scroll zone, infinite scroll.
4. **Trajet du jour** — fixed card just above bottom tab bar.

Bottom tab bar: 3 tabs (`Statut | Alertes | Moi`) — `Statut` is the default and shows everything above; `Alertes` opens a fullscreen alerts list; `Moi` opens the settings sheet as a full page.

### 6.2 Status ring

SVG ring, 240px diameter on mobile, 320px on tablet. Driven by the worst severity across saved locations' closest sensors. Three states:
- Green (`#3EC99A`) — "Respire" — all readings < warning threshold.
- Amber (`#EF9F27`) — "Attention" — at least one reading ≥ warning.
- Red (`#E24B4A`) — "Évite" — at least one reading ≥ critical.

Animation: subtle 360° rotation over 120s (very slow, just-alive feeling). `prefers-reduced-motion` → static. On severity change, morphs color over 0.6s.

### 6.3 Alerts feed

Virtualized list (react-virtuoso or tanstack virtual). Each card is pre-laid-out 88px tall (consistent for virtualization). Filter chips above (`Tous | Air | Eau | Trajet | Officiel`). Pull-to-refresh on mobile.

### 6.4 Trajet card

When both `home_location` and `school_location` set: shows today's routing recommendation. Compact (60px) by default; tap expands to reveal map mini-view with two polylines (normal vs alternative) and exposure-index numbers.

### 6.5 Settings sheet

Bottom sheet on mobile / dialog on desktop:
- Home location picker (modal mini-map).
- School location picker.
- Language (FR/AR/EN).
- Notifications ntfy section (see §6.8): shows "Installer ntfy" deep-link (App Store / Play Store / web) + list of topics this user is auto-subscribed to (with copy-topic buttons). Once installed, user taps `Ouvrir dans ntfy` deep-links to subscribe with one tap.
- `Voir la carte complète` — links to `/app/carte` (works for any authenticated role).
- Logout.

### 6.6 PWA specifics

`public/manifest.webmanifest`:
```json
{
  "name": "NAFAS · Dawa'",
  "short_name": "Dawa'",
  "start_url": "/dawa",
  "display": "standalone",
  "background_color": "#0A0F14",
  "theme_color": "#1D9E75",
  "icons": [
    { "src": "/icons/dawa-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/dawa-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/dawa-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

`next-pwa` config in `next.config.ts`:
- Precache: app shell (minimal `/dawa` HTML + CSS + JS chunks).
- Runtime cache: Supabase REST GETs with stale-while-revalidate (5 min).
- Offline fallback: shows "Dernière mise à jour il y a X" banner + cached last state.

Service worker `public/sw.js` (custom, generated by next-pwa but extended):
- Listens for `push` events → parses payload → shows native notification.
- `notificationclick` → opens `/dawa` (or a deep link).

### 6.7 Realtime subscription

On mount, `/dawa`:
1. Reads `profile.home_location` and `profile.school_location`.
2. Queries sensors within 2km of those points (returns ~5-10 sensor IDs).
3. Subscribes to `sensor_readings` via Supabase Realtime, filtered by `sensor_id IN (...)` client-side.
4. On new reading: recomputes severity, updates ring, prepends an alert card if threshold crossed.

### 6.8 Notifications via ntfy.sh

**Why ntfy:** free, dead-simple HTTP POST to send, works on iOS + Android + web via the free ntfy app, no VAPID keys, no service worker Web Push boilerplate, no Apple developer account. The public instance `ntfy.sh` is good enough for V2; self-host later if privacy demands it.

**Topic taxonomy.** Topics are namespaced by org prefix (`NEXT_PUBLIC_NTFY_TOPIC_PREFIX=nafas-gabes`). Three kinds:

1. **Zone topics** — one per `zones` row where `kind IN ('school','hospital','residential','coastal')`. Format: `nafas-gabes-zone-<zone_slug>`. e.g. `nafas-gabes-zone-chattessalam`, `nafas-gabes-zone-ghannouch`.
2. **General topic** — `nafas-gabes-general` — city-wide critical events (sent for severity=`critical` everywhere).
3. **Personal topic** (optional, deferred V2.1) — `nafas-gabes-user-<short_hash>` — derived from user_id; for authenticated per-person alerts. Requires ntfy auth tier; skip for V2.

**Topic assignment (when user saves home/school in /dawa settings):**
1. Client computes distance from `home_location` and `school_location` to every `zones` WHERE `kind IN (...)`.
2. Closest 2-3 zones → user's recommended subscription list, written to `user_ntfy_topics`.
3. UI shows those topics with a big "Ouvrir dans ntfy" button that deep-links to `ntfy://subscribe/<topic>` (or `https://ntfy.sh/<topic>` as fallback if ntfy app not installed).
4. Auto-subscribe to `nafas-gabes-general` always.

**Server-side trigger (Supabase edge function `notify_threshold_cross`):**

1. `AFTER INSERT` trigger on `sensor_readings` checks if `value` crosses a threshold in the sensor's `thresholds` jsonb.
2. Anti-spam: queries `ntfy_alert_log` — if an alert for this `(sensor_id, threshold_key)` was sent in the last 30 min, skip.
3. Finds all zones containing or within 2km of the sensor's `location`.
4. For each zone: POSTs to `https://ntfy.sh/nafas-gabes-zone-<zone_slug>` with headers:
   ```
   Title: SO₂ élevé — Chatt Essalam
   Priority: urgent        # or 'high'/'default' per severity
   Tags: warning,sensor,air
   Click: https://nafas.tn/dawa?focus=sensor:<id>
   Actions: view, Voir sur la carte, https://nafas.tn/app/carte?focus=sensor:<id>
   ```
   Body: ``SO₂ {value} µg/m³ au capteur {sensor_label}. Seuil OMS: 40 µg/m³. Évitez les déplacements en extérieur.``
5. If severity=`critical`, also POST to `nafas-gabes-general`.
6. Insert an `ntfy_alert_log` row.

**Auth (optional).** If we want only the backend to publish (to prevent pranks), set an ACL on ntfy.sh (requires paid tier) or self-host ntfy with `auth-default-access: deny-all`. For V2 public instance, topics are publicly publishable by anyone — acceptable because the topic names aren't easy to guess and the content is low-stakes.

**Client library:** none needed. Server uses `fetch()` with a simple POST — ~15 lines of code in `supabase/functions/notify_threshold_cross/index.ts`.

**iOS reality check.** iOS users install the free ntfy app from the App Store once, grant notification permission, paste/tap-subscribe to the topic. Quality of life: in `/dawa` settings we show the ntfy app store links + the list of suggested topics with tap-to-copy and tap-to-open-in-ntfy buttons. Works on all iOS versions via the native app — no PWA install prerequisite.

---

## 7. `/app/carte` admin tools

### 7.1 Tool rail

Left edge of viewport, 48px wide, vertical stack of 5 buttons. Only visible when `role=admin`.

1. **Pan/Sélectionner** (default; keyboard `V`).
2. **Placer un panneau** (`P`).
3. **Placer un capteur** (`S`).
4. **Tracer une zone** (`Z`).
5. **Placement IA** (`I`).

Each button has a Lucide icon + FR tooltip. Active tool has accent-colored background.

### 7.2 Place-panel flow

- User clicks **Placer un panneau** (or presses `P`).
- Cesium scene's mouse becomes a crosshair.
- User clicks a location on the map.
- A side drawer slides in from the right (350px) with a form:
  - Location (auto-filled, read-only, click "Modifier" to re-pick).
  - Area (m²) — required, default 500.
  - Algae species — select (ulva_lactuca default).
  - Material notes — textarea.
  - Status — select (default `planned`).
  - Expected P uptake — auto-computed from area × 45 kg/ha/yr; user can override.
- `[Créer]` → POST to Supabase, closes drawer, the new panel appears as a Cesium entity with the panel icon.
- Escape key or clicking outside cancels.

### 7.3 Place-sensor flow

Similar to place-panel. If clicked within 50m of an existing panel, the form pre-fills `panel_id`; otherwise standalone. Type dropdown includes air + water.

### 7.4 Draw-zone flow

Polygon builder using Cesium's `PolygonHierarchy`:
1. Click tool → cursor becomes crosshair.
2. Each click adds a vertex; a temporary preview polygon fills as you go.
3. Double-click (or press Enter) to close; drawer opens for `kind` + `name` + optional metadata.
4. `[Créer]` writes to `zones`.

### 7.5 Placement IA flow

- User clicks **Placement IA**.
- Modal dialog: "Stratégie" dropdown (`phosphate_recovery` / `school_protection` / `biodiversity`), `Nombre de zones` (default 5), `[Lancer le scan]`.
- Click launch → POST `/api/ai/placement` with a run_id, streaming response.
- Dialog shows progress: "Analyse de 2 034 candidates... (300ms)" → "Top-20 sélectionnés... (diversification spatiale)" → "Génération des rationales...".
- As each placement's rationale streams back, it's rendered below.
- When all 5 complete, dialog closes, 5 polygons appear on the map with a pulse animation + stagger.
- Click any placement → side drawer: score components bar chart + markdown rationale + `[Approuver & déployer]` + `[Rejeter]` + `[Prévoir impact]`.
- Approve → UPDATE placement set status=`approved`, INSERT algae_panels (status=`planned`, source_placement_id=placement.id), placement becomes `deployed` after admin then marks the panel active.

### 7.6 Select / edit existing entity

Click any map entity → side drawer with its full details + edit form. `[Enregistrer]` persists. `[Supprimer]` (soft) for panels/sensors.

### 7.7 Supervisor view

Tool rail visible but all buttons disabled with tooltip. Can click entities → read-only drawer. Later: can add annotations (V2.1).

### 7.8 Focus via URL

`/app/carte?focus=panel:<id>` (or `sensor:`, `zone:`, `placement:`) — Cesium flies to that entity and opens its drawer. Used by Objets tables.

---

## 8. AI pipeline

### 8.1 `/api/ai/placement`

Supabase edge function (Deno). Flow:

1. **Verify caller role** — check JWT, ensure `role=admin`. 403 otherwise.
2. **Parse body** — `{ strategy, target_count }`.
3. **Generate candidates** — SQL using PostGIS:
   ```sql
   SELECT
     ST_Centroid(hex.geom)::geography AS location,
     ST_Area(hex.geom::geography) AS area_m2
   FROM ST_HexagonGrid(250, ST_MakeEnvelope(9.80, 33.75, 10.35, 34.10, 4326)::geometry) hex
   WHERE ST_Intersects(hex.geom, <gulf polygon>)
     AND ST_Distance(hex.geom::geography, <coast>::geography) BETWEEN 200 AND 2000;
   ```
4. **Score each candidate** — call a SQL function `score_placement(candidate geography, strategy text) RETURNS (score numeric, components jsonb)` that computes weighted sum per §6 of design (pollution severity, depth fit, meadow overlap, shipping lane, school downwind, phosphate plume).
5. **Spatial diversification** — greedy farthest-point selection from top-100, pick `target_count` spread ≥ 500m apart.
6. **LLM narration** — for each chosen candidate, call OpenRouter with qwen3 (fallback chain), streaming 60-word FR rationale. Use SSE to stream back to the client.
7. **Persist** — insert 5 rows into `ai_placements` sharing a `run_id`.
8. **Return** — `{ run_id, placements: [...] }`.

**Fallback chain for LLM:**
```ts
const MODELS = [
  "qwen/qwen3-235b-a22b:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemma-2-9b-it:free",
];
for (const model of MODELS) {
  try {
    return await callOpenRouter(model, prompt);
  } catch (err) {
    if (err.status === 429 || err.status >= 500) continue;
    throw err;
  }
}
// All fallbacks failed → rationale = null, UI shows "Rationale indisponible."
```

### 8.2 `/api/ai/forecast`

Supabase edge function. Flow:

1. **Verify caller** — admin or supervisor.
2. **Parse body** — `{ target_kind, target_id, horizon_years, with_brief }`.
3. **Check cache** — compute `input_hash = sha256(target_id + horizon + weights_hash)`. If row exists in `ai_forecasts` with same hash and created < 24h ago, return it.
4. **Resolve target** — load location + area + species (for panels) or location + area_m2 + strategy (for placements).
5. **Run sim** — 40×40 grid centered on target, timestep 1 month, horizon × 12 steps. Update rules in `lib/sim/reaction_diffusion.ts`. Coefficients in `lib/sim/coefficients.ts`.
6. **Aggregate** — mean/sum per grid, per year → `projections`.
7. **If with_brief** — call OpenRouter with `projections` as context, template prompt for 200-word FR policy brief. Fallback chain.
8. **Persist** — insert into `ai_forecasts` with `input_hash`.
9. **Return** — `{ forecast_id, projections, brief_md }`.

### 8.3 Prompts

**Placement rationale prompt:**
```
Tu es ORACLE, assistant scientifique de la plateforme NAFAS (Golfe de Gabès).
Un score de placement a été calculé par un algorithme multi-critères :
{score_components_json}

Écris une justification en français de 60 mots MAXIMUM pour cette zone.
Cite au moins DEUX chiffres précis du JSON dans ta réponse.
Si le score est inférieur à 0.6, ajoute une phrase de mise en garde.
N'invente aucune donnée absente du JSON.
```

**Forecast brief prompt:**
```
Tu es ORACLE. Voici la projection décennale pour un panneau à algues dans le Golfe de Gabès :
{projections_json}
{panel_metadata}

Rédige une note d'orientation en français de 200 mots MAXIMUM destinée à la Municipalité de Gabès :
- Contexte (1 phrase)
- Principal impact attendu (avec chiffre clé)
- 3 impacts quantifiés secondaires (liste à puces)
- 1 limite méthodologique

Cite uniquement les chiffres présents dans les projections.
```

---

## 9. Sensor simulator + realtime

### 9.1 `simulate_sensors` edge function

Runs every 2 min via `pg_cron`:

```sql
SELECT cron.schedule('simulate-sensors', '*/2 * * * *',
  $$ SELECT net.http_post(
       url := '<project>.supabase.co/functions/v1/simulate_sensors',
       headers := '{"Authorization":"Bearer <service_role>"}'::jsonb,
       body := '{}'::jsonb
     ) $$);
```

Function code (Deno):
1. Fetch current Gabès wind from Open-Meteo (cache 15 min via `weather_cache`).
2. Load all `sensors WHERE source='simulated' AND active=true`.
3. For each sensor, compute a reading per type (air → Pasquill-Gifford from GCT, water → baseline + panel bias + noise).
4. Batch-insert into `sensor_readings`.

### 9.2 Pasquill-Gifford implementation

`lib/sim/pasquill.ts` — pure function `computeAirReading(sensor, wind, gct, noise)`:
- `x, y` = rotated local coords (sensor relative to GCT, rotated into wind frame).
- Briggs `σy, σz` for Pasquill class D (neutral).
- Classic Gaussian plume formula with double reflection at ground.
- `Q` (emission rate) tuned per pollutant type to hit October 2025 peaks historically.
- Diurnal multiplier: higher at dawn (inversion layer), lower at noon.

### 9.3 Water sensor baseline simulation

`lib/sim/water.ts` — pure function `computeWaterReading(sensor, activePanels, tick)`:
- Baseline from `sensor.metadata.baseline`.
- Seasonal sinusoid (annual period) + random walk (drift).
- Bias from panels within 100m of sensor (depends on panel status and area).
- Chlorophyll-a bumps up near active algae panels; pH slightly drifts alkaline.

### 9.4 Realtime feed

Supabase Realtime broadcasts `sensor_readings` INSERT events.
- `/app/carte`: subscription debounced at 250ms, updates Cesium sensor primitives.
- `/dawa`: subscription filtered client-side to sensors within 2km of saved locations.
- `/app/analytique`: **polling** at 30s for charts (realtime would be too chatty).

### 9.5 Historical backfill

Migration `0003_seed_readings.sql` runs the simulator loop 7×24×30 ≈ 5040 ticks in a single transaction to backfill 7 days of readings.

---

## 10. Migration strategy

### 10.1 Zero-downtime cutover

Every data-consuming component gets a thin adapter:

```ts
// lib/data/useSensors.ts
export function useSensors() {
  const { session } = useAuth();
  const useLive = session && FEATURE_FLAGS.useSupabase;
  return useLive ? useSensorsFromSupabase() : useSensorsFromJson();
}
```

This runs both paths in parallel while building, letting us merge PRs without breaking `/monitor3d`.

### 10.2 JSON → Supabase seed

`supabase/migrations/0002_seed.sql` contains hand-written INSERT statements generated from the current `public/data/*.json` files. A helper script `scripts/json-to-seed.ts` produces this SQL. Re-run when static data changes during the build.

### 10.3 Deprecation plan

- **V2.0 ship:** `/monitor3d` remains public; landing CTA prefers `/login` but `/monitor3d` link still works.
- **V2.1:** `/monitor3d` → 301 redirect to `/login?next=/app/carte`.
- **V2.2:** Delete `/monitor3d` code entirely.

---

## 11. Build order

**Phase 0 — Supabase foundation** (~1.5 days solo)
1. Create Supabase project (user does this manually).
2. Enable PostGIS + pg_cron extensions.
3. Migrations: `0001_init.sql`, `0002_seed.sql`, `0003_seed_readings.sql`.
4. `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/admin.ts` (service role, server-only).
5. `middleware.ts` for session refresh + route gating.

**Phase 1 — Auth + shell + Carte admin tools** (~4-5 days)
1. `/login` page (email/password + magic link tabs).
2. `/welcome` page (new user profile setup).
3. `app/app/layout.tsx` (AppShell with left rail).
4. `app/app/page.tsx` (redirect router by role).
5. `app/app/carte/page.tsx` (wraps `/monitor3d` Cesium scene).
6. Admin tool rail component + 4 flows (panel, sensor, zone, placement IA placeholder).
7. Supabase-backed CRUD for entities created via map clicks.

**Phase 2 — Objets tables** (~2-3 days)
1. Shared `EntityPage` component reading `EntityConfig`.
2. 4 configs: `panneaux`, `capteurs`, `zones`, `actualites`.
3. Forms (shadcn Form + Zod validation).
4. GeoJSON import/export utilities.

**Phase 3 — Simulator + realtime** (~2 days)
1. `supabase/functions/simulate_sensors/index.ts`.
2. `lib/sim/pasquill.ts`, `lib/sim/water.ts`, `lib/sim/coefficients.ts`.
3. `pg_cron` job schedule.
4. Historical backfill migration.
5. Client-side Realtime subscription hooks (`useSensorReadings`, `useLatestReading`).

**Phase 4 — AI pipeline** (~3-4 days)
1. `supabase/functions/ai_placement/index.ts` (scorer + LLM narration).
2. `supabase/functions/ai_forecast/index.ts` (sim + brief).
3. `lib/sim/reaction_diffusion.ts` + `lib/scoring/placement.ts`.
4. OpenRouter fallback helper `lib/llm/openrouter.ts`.
5. Wire into `/app/carte` Placement IA flow; wire into Objets `[Prévoir]` per panel.

**Phase 5 — Analytique** (~2 days)
1. KPI strip + queries.
2. Sensor trends chart.
3. AI history (placements + forecasts).
4. Scenario compare.
5. PDF export via `@react-pdf/renderer`.

**Phase 6 — /dawa PWA** (~3-4 days)
1. Route group + layout.
2. Status ring + alerts feed + trajet + settings.
3. PWA manifest + `next-pwa` config + service worker.
4. ntfy notifications: `notify_threshold_cross` edge function (AFTER INSERT trigger on sensor_readings → POST to ntfy.sh topic), `user_ntfy_topics` + `ntfy_alert_log` tables, /dawa settings UI showing suggested topics + ntfy app deep-links.
5. iOS install hint card.

**Phase 7 — Paramètres + polish** (~2 days)
1. Users + invites.
2. Layers visibility grid.
3. Organisation form.
4. Copy pass FR/AR.
5. A11y sweep + Lighthouse PWA score.

**Total: ~19-22 working days solo, parallelizable.**

---

## 12. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Supabase free-tier Realtime 200-connection limit | Monitor; upgrade to Pro ($25/mo) at ~50 active users. |
| PostGIS raster (bathymetry) setup friction | Plan B: ship bathymetry as depth-band polygons in `zones` with `kind='bathymetry'`. Same scoring math. |
| OpenRouter free-tier daily cap mid-demo | Top up $5 and switch to paid model string (same model, 10× limits). |
| ntfy public instance outage | Self-host ntfy (Docker, one container) — same HTTP API, swap `NTFY_URL`. |
| Topic names guessable, anyone can publish | Low-stakes content; V2.1 moves to auth-tier or self-hosted ACL if abuse observed. |
| Reaction-diffusion numeric blowup | Bounded clamps `[0, K]` on all state vars; unit tests verify stability for 120 steps. |
| Cesium bundle size regression with admin tools | Lazy-load admin tool rail behind role check; non-admins don't download it. |
| Migration of hand-curated JSON drift | Auto-generate `0002_seed.sql` from JSON via `scripts/json-to-seed.ts`; re-run on JSON edits during transition. |
| RLS policy mistakes exposing data across orgs | Multi-org RLS test suite in `supabase/tests/rls.spec.sql` — seeds 2 orgs, tries cross-org queries, expects 0 rows. |
| Weather API outage breaking simulator | `weather_cache` falls back to last known values if fetch fails; simulator continues. |
| LLM generates rationale with invented numbers | Prompt constrains to JSON chips; post-processing strips numerics not in `score_components`. |

---

## 13. Success criteria

**Phase 0 done when:** first admin can log in, middleware routes correctly, PostGIS query works.
**Phase 1 done when:** admin places a panel by clicking the map, it persists, page refresh shows it, user with `role=user` cannot see admin tools.
**Phase 2 done when:** admin can CRUD all 4 entity types via Objets; `Voir sur carte` navigates correctly.
**Phase 3 done when:** sensor readings stream in every 2 min and Carte's sensor dots pulse live; 7 days of history renders a sensible chart.
**Phase 4 done when:** admin clicks Placement IA, gets 5 zones with streaming FR rationales, approves one, panel is created; forecasts a panel and sees a brief.
**Phase 5 done when:** admin exports a PDF brief of the ORACLE plan including two-scenario compare.
**Phase 6 done when:** a tester installs the ntfy app + `/dawa` PWA on their phone, subscribes to their zone topic via the /dawa settings deep-link, and receives a live ntfy notification within 30s of a simulated threshold crossing.
**Phase 7 done when:** admin invites a supervisor via email, supervisor logs in, can read everything but edits are disabled; FR copy is audited for tone; Lighthouse PWA score ≥ 90 on `/dawa`.

**Overall V2 done when:** a non-technical person from the Municipalité can log in as admin, place a panel and a sensor on the map, run an ORACLE scan, approve one, forecast its impact, and explain to a colleague what they did — without a manual.
