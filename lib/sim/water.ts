/**
 * Water quality simulator — baseline + seasonal sinusoid + random walk,
 * with a positive bias from nearby active algae panels.
 *
 * Works for pH, turbidity (NTU), chlorophyll-a (µg/L), temperature (°C).
 */

export interface PanelLike {
  id?: string;
  location: { lon: number; lat: number } | [number, number];
  area_m2: number;
  status: "planned" | "deploying" | "active" | "removed" | string;
}

export interface WaterSensorLike {
  id?: string;
  location: { lon: number; lat: number } | [number, number];
  type: "ph" | "turbidity" | "chlorophyll_a" | "temperature";
  metadata?: { baseline?: number; [k: string]: unknown };
}

function asCoords(
  loc: WaterSensorLike["location"],
): { lon: number; lat: number } {
  if (Array.isArray(loc)) return { lon: loc[0], lat: loc[1] };
  return loc;
}

/** Haversine distance in meters. */
export function haversine(
  a: { lon: number; lat: number },
  b: { lon: number; lat: number },
): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const BASELINE_DEFAULTS: Record<WaterSensorLike["type"], number> = {
  ph: 8.1,
  turbidity: 3.0,
  chlorophyll_a: 0.8,
  temperature: 19.0,
};

/**
 * computeWaterReading — returns a single value for the sensor.
 *
 * @param sensor              the sensor definition (includes metadata.baseline)
 * @param activePanelsNearby  candidate nearby panels (we filter within 100m)
 * @param tickSecondsSinceEpoch  timestamp in seconds (controls seasonal + walk)
 */
export function computeWaterReading(
  sensor: WaterSensorLike,
  activePanelsNearby: PanelLike[],
  tickSecondsSinceEpoch: number,
): number {
  const baseline =
    Number(sensor.metadata?.baseline ?? BASELINE_DEFAULTS[sensor.type] ?? 0);

  const sLoc = asCoords(sensor.location);

  // Seasonal sinusoid — 1-year period, phase offset by ~doy 80 (spring peak).
  const doySeconds = tickSecondsSinceEpoch % (365.25 * 86400);
  const season = Math.sin(
    (2 * Math.PI * (doySeconds / 86400 - 80)) / 365.25,
  );

  // Random walk — derived from tick so it's deterministic per-tick.
  const walk = Math.sin(tickSecondsSinceEpoch * 0.0011) * 0.5 +
    Math.sin(tickSecondsSinceEpoch * 0.00037) * 0.5;

  let panelBias = 0;
  for (const p of activePanelsNearby) {
    if (p.status !== "active") continue;
    const d = haversine(sLoc, asCoords(p.location));
    if (d > 100) continue;
    // linear falloff 0..100m
    const proximity = 1 - d / 100;
    // scaled by area (log) to prevent absurdly large panels from dominating
    const strength = proximity * Math.log10(Math.max(p.area_m2, 10));
    panelBias += strength;
  }

  switch (sensor.type) {
    case "ph": {
      // chlorophyll-rich zones drift alkaline
      const v = baseline + 0.15 * season + 0.10 * walk + 0.05 * panelBias;
      return clamp(v, 6.5, 9.5);
    }
    case "turbidity": {
      const v = baseline + 1.5 * season + 0.8 * walk - 0.15 * panelBias;
      return Math.max(0.1, v);
    }
    case "chlorophyll_a": {
      // panels boost chlorophyll explicitly
      const v = baseline + 0.4 * season + 0.2 * walk + 0.25 * panelBias;
      return Math.max(0.05, v);
    }
    case "temperature": {
      const v = baseline + 6 * season + 0.5 * walk;
      return v;
    }
    default:
      return baseline;
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
