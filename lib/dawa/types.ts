/**
 * Shared type definitions for the /dawa PWA.
 *
 * These mirror the Supabase schema from §3 of the NAFAS V2 design doc
 * but are local so we don't depend on generated DB types that another
 * agent is producing in parallel.
 */

export type Severity = "ok" | "warning" | "critical";

export type SensorKind =
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

export type EventSeverity = "info" | "warning" | "critical";

/** A lat/lon tuple in [lon, lat] order to match the Gabès tokens + GeoJSON. */
export type LonLat = readonly [number, number];

export interface Threshold {
  warning?: number;
  critical?: number;
}

export interface Sensor {
  id: string;
  type: SensorKind;
  unit: string;
  location: LonLat;
  thresholds: Threshold;
  label?: string;
}

export interface Reading {
  sensorId: string;
  type: SensorKind;
  unit: string;
  value: number;
  takenAt: string; // ISO
  thresholds: Threshold;
  sensorLabel?: string;
}

export interface Zone {
  id: string;
  slug: string;
  kind: ZoneKind;
  name: string;
  /** Zone centroid — sufficient for closest-zone queries on the client. */
  centroid: LonLat;
}

export interface Profile {
  userId: string;
  fullName: string | null;
  homeLocation: LonLat | null;
  schoolLocation: LonLat | null;
  preferredLocale: "fr" | "ar" | "en";
}

export interface NewsEvent {
  id: string;
  title: string;
  body_md?: string | null;
  happenedAt: string;
  severity: EventSeverity;
  link?: string | null;
  location?: LonLat | null;
}

export interface Weather {
  temperatureC: number | null;
  windspeedMps: number | null;
  winddirectionDeg: number | null;
  humidityPct?: number | null;
  fetchedAt: string;
}

/** Derived alert feed item (client-side union of readings + news). */
export type AlertKind = "air" | "eau" | "trajet" | "officiel";

export interface AlertItem {
  id: string;
  kind: AlertKind;
  severity: EventSeverity;
  title: string;
  body: string;
  at: string; // ISO
  href?: string;
}
