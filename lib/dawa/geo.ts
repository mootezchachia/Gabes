import type { LonLat } from "./types";

/**
 * Haversine distance in metres between two [lon, lat] points.
 * Good enough for the small Gabès bbox (<50 km across) — errors < 0.1%.
 */
export function distanceMeters(a: LonLat, b: LonLat): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const [lon1, lat1] = a;
  const [lon2, lat2] = b;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** Linear interpolation between two lon/lat points. */
export function lerpPoint(a: LonLat, b: LonLat, t: number): LonLat {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t] as const;
}

/**
 * Simple orthogonal detour: midpoint offset by a signed orthogonal distance
 * in metres. Used to synthesize an alternative route when we don't have a
 * real routing engine wired up yet.
 */
export function orthogonalDetour(
  from: LonLat,
  to: LonLat,
  offsetMeters: number,
): LonLat {
  const mid = lerpPoint(from, to, 0.5);
  const dLon = to[0] - from[0];
  const dLat = to[1] - from[1];
  // Orthogonal in lon/lat space; convert metres to degrees approximately.
  const latDegPerMeter = 1 / 111_320;
  const lonDegPerMeter = 1 / (111_320 * Math.cos((mid[1] * Math.PI) / 180));
  const len = Math.sqrt(dLon * dLon + dLat * dLat) || 1;
  const ox = -dLat / len;
  const oy = dLon / len;
  return [
    mid[0] + ox * offsetMeters * lonDegPerMeter,
    mid[1] + oy * offsetMeters * latDegPerMeter,
  ] as const;
}
