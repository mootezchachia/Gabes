/**
 * Hand-written minimal types for tables the /app shell touches.
 *
 * These are intentionally narrow. Full DB-generated types should be produced
 * later via `supabase gen types typescript --project-id <id> > lib/supabase/types.generated.ts`
 * and merged in.
 *
 * PostGIS `geography(Point, 4326)` columns are serialized by postgrest as
 * GeoJSON strings OR as objects depending on the client config. We treat
 * them as opaque strings in TypeScript and parse lazily where needed.
 */

export type UserRole = "admin" | "supervisor" | "user";
export type Locale = "fr" | "ar" | "en";
export type PanelStatus = "planned" | "deploying" | "active" | "removed";
export type SensorType =
  | "so2"
  | "no2"
  | "pm25"
  | "pm10"
  | "ph"
  | "turbidity"
  | "chlorophyll_a"
  | "temperature";
export type ZoneKind =
  | "school"
  | "hospital"
  | "residential"
  | "industrial"
  | "marine_protected"
  | "coastal"
  | "oasis";
export type PlacementStatus = "draft" | "approved" | "rejected" | "deployed";
export type ForecastTarget = "panel" | "placement";
export type EventSeverity = "info" | "warning" | "critical";

/** A WGS84 point. We accept either GeoJSON Point or a plain [lng,lat] tuple. */
export type GeoPoint = { type: "Point"; coordinates: [number, number] } | string;
export type GeoPolygon = { type: "Polygon"; coordinates: number[][][] } | string;

export interface Org {
  id: string;
  slug: string;
  name: string;
  logo_path: string | null;
  primary_color: string | null;
  default_map_center: GeoPoint | null;
  default_map_zoom: number | null;
  timezone: string | null;
  sim_interval_minutes: number | null;
  ai_weights: Record<string, number> | null;
  ai_quota_monthly: number | null;
  created_at: string;
}

export interface Profile {
  user_id: string;
  org_id: string;
  role: UserRole;
  full_name: string | null;
  home_location: GeoPoint | null;
  school_location: GeoPoint | null;
  preferred_locale: Locale | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface AlgaePanel {
  id: string;
  org_id: string;
  location: GeoPoint;
  area_m2: number;
  algae_species: string | null;
  material_notes: string | null;
  status: PanelStatus;
  deployed_at: string | null;
  removed_at: string | null;
  expected_p_uptake_kg_per_year: number | null;
  actual_p_uptake_kg_per_year: number | null;
  source_placement_id: string | null;
  created_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface Sensor {
  id: string;
  org_id: string;
  location: GeoPoint;
  panel_id: string | null;
  type: SensorType;
  unit: string;
  thresholds: Record<string, number> | null;
  active: boolean;
  source: string;
  device_id: string | null;
  metadata: Record<string, unknown> | null;
  installed_at: string | null;
  created_at: string;
}

export interface SensorReading {
  id: number;
  sensor_id: string;
  value: number;
  taken_at: string;
  source: string;
}

export interface Zone {
  id: string;
  org_id: string;
  kind: ZoneKind;
  name: string;
  geometry: GeoPolygon;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface AiPlacement {
  id: string;
  org_id: string;
  run_id: string;
  proposed_location: GeoPoint;
  proposed_area_m2: number;
  rationale_md: string | null;
  score: number;
  score_components: Record<string, number>;
  status: PlacementStatus;
  strategy: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  model_name: string;
  created_at: string;
}

export interface AiForecast {
  id: string;
  org_id: string;
  target_kind: ForecastTarget;
  target_id: string;
  horizon_years: number;
  projections: Array<Record<string, number>>;
  assumptions: Record<string, unknown>;
  brief_md: string | null;
  model_name: string | null;
  input_hash: string | null;
  created_at: string;
}

export interface Layer {
  id: string;
  org_id: string;
  key: string;
  label: string;
  visible_for: Record<UserRole, boolean>;
  display_order: number;
  created_at: string;
}

export interface NewsEvent {
  id: string;
  org_id: string;
  title: string;
  body_md: string | null;
  happened_at: string;
  severity: EventSeverity;
  link: string | null;
  image_path: string | null;
  location: GeoPoint | null;
  created_by: string | null;
  created_at: string;
}

/** Narrow Database shape so the client is typed even without generated types. */
export interface Database {
  public: {
    Tables: {
      orgs: { Row: Org; Insert: Partial<Org>; Update: Partial<Org> };
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> };
      algae_panels: {
        Row: AlgaePanel;
        Insert: Partial<AlgaePanel>;
        Update: Partial<AlgaePanel>;
      };
      sensors: { Row: Sensor; Insert: Partial<Sensor>; Update: Partial<Sensor> };
      sensor_readings: {
        Row: SensorReading;
        Insert: Partial<SensorReading>;
        Update: Partial<SensorReading>;
      };
      zones: { Row: Zone; Insert: Partial<Zone>; Update: Partial<Zone> };
      ai_placements: {
        Row: AiPlacement;
        Insert: Partial<AiPlacement>;
        Update: Partial<AiPlacement>;
      };
      ai_forecasts: {
        Row: AiForecast;
        Insert: Partial<AiForecast>;
        Update: Partial<AiForecast>;
      };
      layers: { Row: Layer; Insert: Partial<Layer>; Update: Partial<Layer> };
      news_events: {
        Row: NewsEvent;
        Insert: Partial<NewsEvent>;
        Update: Partial<NewsEvent>;
      };
    };
  };
}
