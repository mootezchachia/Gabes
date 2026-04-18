// @ts-nocheck — Deno edge function
/**
 * Edge-function-local mirror of lib/sim/pasquill.ts + lib/sim/water.ts.
 *
 * Kept in sync by hand — these files must stay functionally identical.
 * We duplicate rather than symlinking because Supabase's function bundler
 * (esbuild/Deno) resolves only paths under `supabase/functions/`.
 *
 * If you change this file, also update lib/sim/pasquill.ts + water.ts, and
 * bump CALIBRATION_VERSION in lib/sim/coefficients.ts.
 */

export interface SensorLike {
  id?: string;
  location: { lon: number; lat: number } | [number, number];
  type: string;
  metadata?: { baseline?: number; [k: string]: unknown };
}

export interface Wind {
  speed_mps: number;
  direction_deg: number;
}

export const GCT_SOURCE = {
  lon: 10.1178,
  lat: 33.9312,
  stack_h_m: 40,
  q_g_s: 220,
} as const;

const Q_FACTOR: Record<string, number> = {
  so2: 1.0, no2: 0.35, pm25: 0.18, pm10: 0.28,
};

function coords(loc: SensorLike["location"]) {
  return Array.isArray(loc) ? { lon: loc[0], lat: loc[1] } : loc;
}

export function metersFrom(
  o: { lon: number; lat: number },
  t: { lon: number; lat: number },
) {
  return {
    dx: (t.lon - o.lon) * 111320 * Math.cos((o.lat * Math.PI) / 180),
    dy: (t.lat - o.lat) * 110540,
  };
}

export function briggsSigmas(x: number) {
  const xx = Math.max(x, 1);
  return {
    sy: (0.08 * xx) / Math.sqrt(1 + 0.0001 * xx),
    sz: (0.06 * xx) / Math.sqrt(1 + 0.0015 * xx),
  };
}

export function diurnalMultiplier(hour: number): number {
  if (hour >= 5 && hour <= 8) return 1.6;
  if (hour >= 9 && hour <= 11) return 1.1;
  if (hour >= 12 && hour <= 15) return 0.7;
  if (hour >= 16 && hour <= 18) return 0.9;
  if (hour >= 19 && hour <= 21) return 1.2;
  return 1.3;
}

export function computeAirReading(
  sensor: SensorLike,
  wind: Wind,
  at: Date = new Date(),
): number {
  const baseline = Number(sensor.metadata?.baseline ?? 15);
  const s = coords(sensor.location);
  const { dx, dy } = metersFrom(
    { lon: GCT_SOURCE.lon, lat: GCT_SOURCE.lat },
    s,
  );
  const theta = ((wind.direction_deg + 180) * Math.PI) / 180;
  const x = dx * Math.cos(theta) + dy * Math.sin(theta);
  const y = -dx * Math.sin(theta) + dy * Math.cos(theta);
  const u = Math.max(wind.speed_mps, 0.5);
  if (x <= 20) return Math.max(baseline * (1 + (Math.random() - 0.5) * 0.2), 1);
  const { sy, sz } = briggsSigmas(x);
  const q = GCT_SOURCE.q_g_s * (Q_FACTOR[sensor.type] ?? 1);
  const H = GCT_SOURCE.stack_h_m;
  const c = (q / (Math.PI * u * sy * sz))
    * Math.exp(-(y * y) / (2 * sy * sy))
    * Math.exp(-(H * H) / (2 * sz * sz));
  const cUg = c * 1e6;
  const diurnal = diurnalMultiplier(at.getHours());
  const noise = 1 + (Math.random() - 0.5) * 0.3;
  return Math.max(baseline + cUg * diurnal * noise, 1);
}

export interface PanelLike {
  id?: string;
  location: { lon: number; lat: number } | [number, number];
  area_m2: number;
  status: string;
}

export function haversine(
  a: { lon: number; lat: number },
  b: { lon: number; lat: number },
) {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function computeWaterReading(
  sensor: SensorLike,
  activePanelsNearby: PanelLike[],
  tickSec: number,
): number {
  const defaults: Record<string, number> = {
    ph: 8.1, turbidity: 3.0, chlorophyll_a: 0.8, temperature: 19.0,
  };
  const baseline = Number(sensor.metadata?.baseline ?? defaults[sensor.type] ?? 0);
  const sLoc = coords(sensor.location);
  const doySec = tickSec % (365.25 * 86400);
  const season = Math.sin((2 * Math.PI * (doySec / 86400 - 80)) / 365.25);
  const walk = Math.sin(tickSec * 0.0011) * 0.5 + Math.sin(tickSec * 0.00037) * 0.5;

  let bias = 0;
  for (const p of activePanelsNearby) {
    if (p.status !== "active") continue;
    const d = haversine(sLoc, coords(p.location));
    if (d > 100) continue;
    bias += (1 - d / 100) * Math.log10(Math.max(p.area_m2, 10));
  }
  switch (sensor.type) {
    case "ph": return Math.max(6.5, Math.min(9.5, baseline + 0.15 * season + 0.1 * walk + 0.05 * bias));
    case "turbidity": return Math.max(0.1, baseline + 1.5 * season + 0.8 * walk - 0.15 * bias);
    case "chlorophyll_a": return Math.max(0.05, baseline + 0.4 * season + 0.2 * walk + 0.25 * bias);
    case "temperature": return baseline + 6 * season + 0.5 * walk;
    default: return baseline;
  }
}
