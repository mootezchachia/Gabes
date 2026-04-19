import { distanceMeters, lerpPoint, orthogonalDetour } from "./geo";
import { DEFAULT_THRESHOLDS, severityForReading } from "./severity";
import type { LonLat, Reading, Sensor } from "./types";

export interface RouteSample {
  point: LonLat;
  exposure: number; // 0..1 normalised
}

export interface RouteResult {
  label: string;
  distanceMeters: number;
  exposureIndex: number; // lower is better; 0..1
  polyline: LonLat[];
  samples: RouteSample[];
}

export type Recommendation =
  | "trajet_normal"
  | "evite_rue_nord"
  | "reste_interieur";

export interface RouteRecommendation {
  recommendation: Recommendation;
  message: string;
  primary: RouteResult;
  alternative: RouteResult;
}

/**
 * Exposure weight per pollutant type. Air > water for a walking trajet;
 * water pollutants contribute near-zero unless the route is coastal.
 */
const EXPOSURE_WEIGHT: Record<string, number> = {
  so2: 1.0,
  no2: 0.7,
  pm25: 1.0,
  pm10: 0.5,
  ph: 0.0,
  turbidity: 0.0,
  chlorophyll_a: 0.0,
  temperature: 0.1,
};

/**
 * Influence kernel: a reading's contribution falls off with distance^2
 * clamped to zero beyond `maxInfluence` metres.
 */
function influenceAt(distanceM: number, maxInfluenceM: number): number {
  if (distanceM >= maxInfluenceM) return 0;
  const t = 1 - distanceM / maxInfluenceM;
  return t * t;
}

/** Normalise a raw reading to [0, 1] using its thresholds. */
function normalizeReading(r: Reading): number {
  const t =
    r.thresholds.critical ??
    DEFAULT_THRESHOLDS[r.type]?.critical ??
    r.thresholds.warning ??
    DEFAULT_THRESHOLDS[r.type]?.warning ??
    1;
  if (t <= 0) return 0;
  return Math.max(0, Math.min(1, r.value / t));
}

function sampleExposure(
  point: LonLat,
  latestBySensor: Map<string, Reading>,
  sensorsById: Map<string, Sensor>,
  influenceRadiusM: number,
): number {
  // Accumulate *contribution* (not a weighted mean). A sample that is far
  // from every sensor returns 0; a sample sitting on top of a critical
  // sensor returns the normalised reading (possibly >1). This gives us a
  // spatial "exposure field" that rewards detours through clean areas.
  let contribution = 0;
  for (const [sensorId, r] of latestBySensor) {
    const s = sensorsById.get(sensorId);
    if (!s) continue;
    const d = distanceMeters(point, s.location);
    const inf = influenceAt(d, influenceRadiusM);
    if (inf === 0) continue;
    const typeWeight = EXPOSURE_WEIGHT[r.type] ?? 0.2;
    contribution += inf * typeWeight * normalizeReading(r);
  }
  return Math.max(0, Math.min(1, contribution));
}

export interface ScoreRouteOptions {
  sampleCount?: number;
  influenceRadiusMeters?: number;
}

function scorePolyline(
  polyline: LonLat[],
  sensors: Sensor[],
  readings: Reading[],
  options: ScoreRouteOptions,
): { exposure: number; samples: RouteSample[] } {
  const sensorsById = new Map(sensors.map((s) => [s.id, s] as const));
  // Keep only the latest reading per sensor.
  const latest = new Map<string, Reading>();
  for (const r of readings) {
    const cur = latest.get(r.sensorId);
    if (!cur || new Date(r.takenAt) > new Date(cur.takenAt)) {
      latest.set(r.sensorId, r);
    }
  }

  const n = Math.max(3, options.sampleCount ?? 12);
  const samples: RouteSample[] = [];
  let agg = 0;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    // Walk the polyline in equal param space.
    const segments = polyline.length - 1;
    const segFloat = t * segments;
    const segIdx = Math.min(segments - 1, Math.floor(segFloat));
    const segT = segFloat - segIdx;
    const pt = lerpPoint(polyline[segIdx], polyline[segIdx + 1], segT);
    const e = sampleExposure(
      pt,
      latest,
      sensorsById,
      options.influenceRadiusMeters ?? 600,
    );
    samples.push({ point: pt, exposure: e });
    agg += e;
  }
  return { exposure: agg / samples.length, samples };
}

function polylineDistanceMeters(polyline: LonLat[]): number {
  let d = 0;
  for (let i = 1; i < polyline.length; i++) {
    d += distanceMeters(polyline[i - 1], polyline[i]);
  }
  return d;
}

/**
 * Deterministic route recommender.
 *
 * Builds two synthetic candidate polylines between `home` and `dest`:
 *   - primary: straight line (4 waypoints for sampling).
 *   - alternative: midpoint pushed ~300 m orthogonally.
 *
 * Scores each by sampling current readings along its length. Returns the
 * recommendation verbatim for the Trajet card copy.
 *
 * Pure. No IO. Deterministic given identical inputs.
 */
export function recommendRoute(
  home: LonLat,
  dest: LonLat,
  sensors: Sensor[],
  readings: Reading[],
  options: ScoreRouteOptions = {},
): RouteRecommendation {
  const primaryLine: LonLat[] = [
    home,
    lerpPoint(home, dest, 1 / 3),
    lerpPoint(home, dest, 2 / 3),
    dest,
  ];
  const detourMid = orthogonalDetour(home, dest, 300);
  const alternativeLine: LonLat[] = [
    home,
    lerpPoint(home, detourMid, 0.5),
    detourMid,
    lerpPoint(detourMid, dest, 0.5),
    dest,
  ];

  const p = scorePolyline(primaryLine, sensors, readings, options);
  const a = scorePolyline(alternativeLine, sensors, readings, options);

  const primary: RouteResult = {
    label: "Trajet habituel",
    polyline: primaryLine,
    distanceMeters: polylineDistanceMeters(primaryLine),
    exposureIndex: round3(p.exposure),
    samples: p.samples,
  };
  const alternative: RouteResult = {
    label: "Détour proposé",
    polyline: alternativeLine,
    distanceMeters: polylineDistanceMeters(alternativeLine),
    exposureIndex: round3(a.exposure),
    samples: a.samples,
  };

  const bestExposure = Math.min(primary.exposureIndex, alternative.exposureIndex);

  let recommendation: Recommendation;
  let message: string;
  if (bestExposure >= 1) {
    recommendation = "reste_interieur";
    message = "Reste à l’intérieur — exposition critique sur tous les trajets.";
  } else if (alternative.exposureIndex < primary.exposureIndex - 0.05) {
    recommendation = "evite_rue_nord";
    message =
      "Prends le détour — exposition réduite de " +
      Math.round(
        ((primary.exposureIndex - alternative.exposureIndex) /
          Math.max(0.0001, primary.exposureIndex)) *
          100,
      ) +
      "%.";
  } else {
    recommendation = "trajet_normal";
    message = "Trajet normal — l’air est respirable aujourd’hui.";
  }

  return { recommendation, message, primary, alternative };
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
