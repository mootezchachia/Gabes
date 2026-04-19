import type { GeoPoint } from "@/lib/supabase/types";

/**
 * Utilities for converting between our internal `[lng, lat]` tuples, GeoJSON,
 * and the WKT / EWKT strings PostGIS likes on writes.
 *
 * We keep all geo logic here so the rest of the shell can stay blissfully
 * unaware of projection semantics.
 */

export type LngLat = [number, number];

export function pointToLngLat(point: GeoPoint | null | undefined): LngLat | null {
  if (!point) return null;
  if (typeof point === "string") {
    // GeoJSON-as-string ("{ ""type"":""Point""... }") or WKT ("POINT(lng lat)")
    const trimmed = point.trim();
    if (trimmed.startsWith("{")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed?.type === "Point" && Array.isArray(parsed.coordinates)) {
          return [parsed.coordinates[0], parsed.coordinates[1]];
        }
      } catch {
        return null;
      }
    }
    const wkt = trimmed.match(/POINT\s*\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)/i);
    if (wkt) return [parseFloat(wkt[1]!), parseFloat(wkt[2]!)];
    return null;
  }
  if (point.type === "Point" && Array.isArray(point.coordinates)) {
    return [point.coordinates[0], point.coordinates[1]];
  }
  return null;
}

export function lngLatToWkt([lng, lat]: LngLat): string {
  return `SRID=4326;POINT(${lng} ${lat})`;
}

export function lngLatToGeoJson([lng, lat]: LngLat): GeoPoint {
  return { type: "Point", coordinates: [lng, lat] };
}

export function formatLngLat(ll: LngLat | null, digits = 4): string {
  if (!ll) return "—";
  return `${ll[1].toFixed(digits)}°N, ${ll[0].toFixed(digits)}°E`;
}

/** Great-circle distance, meters, via haversine. */
export function haversine(a: LngLat, b: LngLat): number {
  const R = 6371000;
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
