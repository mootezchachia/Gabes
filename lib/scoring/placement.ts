/**
 * Placement candidate scoring — weighted sum of 6 normalized components,
 * for vegetal-panel installation on buildings in Gabès city.
 *
 * All components are in [0, 1]. Higher score = better placement.
 */

export type Strategy = "air_quality" | "vulnerable_pop" | "heat_resilience";

export interface BuildingProps {
  id: string;
  name: string;
  type: BuildingType;
  surface_m2: number;
  occupants: number;
  ndvi: number;
  heat_island_c: number;
}

export type BuildingType =
  | "school"
  | "hospital"
  | "university"
  | "housing"
  | "office"
  | "mosque"
  | "hotel"
  | "mall"
  | "industrial";

export interface Candidate {
  location: { lon: number; lat: number };
  props: BuildingProps;
}

export interface ScoreComponents {
  /** air exposure — proximity to GCT + downwind bonus (0..1). */
  ae: number;
  /** building surface for panels, normalized (0..1). */
  bs: number;
  /** daily occupants served, normalized (0..1). */
  po: number;
  /** vulnerability by type — school/hospital > housing > office (0..1). */
  vu: number;
  /** urban heat-island severity, normalized (0..1). */
  hi: number;
  /** greenery gap (1 − NDVI) — low existing greenery = high need (0..1). */
  gr: number;
}

export interface ScoreResult {
  score: number;
  components: ScoreComponents;
}

/** Strategy-specific weights. Sum need not equal 1; score is normalized. */
export const STRATEGY_WEIGHTS: Record<Strategy, ScoreComponents> = {
  air_quality:     { ae: 1.4, bs: 0.9, po: 1.0, vu: 0.6, hi: 0.5, gr: 0.6 },
  vulnerable_pop:  { ae: 1.0, bs: 0.6, po: 1.0, vu: 1.5, hi: 0.4, gr: 0.5 },
  heat_resilience: { ae: 0.5, bs: 0.9, po: 0.8, vu: 0.3, hi: 1.5, gr: 1.2 },
};

/** GCT phosphate complex — pollution source. */
const GCT = { lon: 10.1178, lat: 33.9312 };

/** Vulnerability weight per building type. */
const TYPE_VULNERABILITY: Record<BuildingType, number> = {
  school: 1.0,
  hospital: 0.95,
  university: 0.7,
  mosque: 0.55,
  housing: 0.55,
  mall: 0.35,
  hotel: 0.3,
  office: 0.3,
  industrial: 0.1,
};

/** Surface normalization — buildings above this count as "large". */
const MAX_SURFACE_M2 = 4000;
/** Occupants normalization — buildings above this count as "dense". */
const MAX_OCCUPANTS = 3000;
/** Heat-island normalization cap (°C above city mean). */
const MAX_HEAT_C = 6;

/**
 * Air exposure:
 *   — linear decay with distance to GCT (maxes out at 3.5 km)
 *   — plus a downwind bonus for buildings roughly south/southwest of GCT
 *     (prevailing winds in the Gulf of Gabès push the plume inland that way)
 */
function airExposure(loc: { lon: number; lat: number }): number {
  const d = haversine(loc, GCT);
  const proximity = clamp01(1 - d / 3500);

  // Downwind cone: true if the building is south/southwest of GCT
  // (lat less than GCT's, roughly within ±30° from due south).
  const dLat = loc.lat - GCT.lat;
  const dLon = loc.lon - GCT.lon;
  let downwind = 0.3;
  if (dLat < 0) {
    // bearing in the south half-plane — we want roughly -180° (due south)
    // which in atan2 terms is atan2(dLon, dLat). Since dLat<0 that's close to ±π.
    const bearingFromSouth = Math.abs(Math.atan2(dLon, dLat) - Math.PI);
    // Unwrap to [0, π]
    const theta = Math.min(bearingFromSouth, Math.abs(bearingFromSouth - 2 * Math.PI));
    // 0 = perfectly downwind, π = opposite. Bonus out to ~60° off-axis.
    downwind = clamp01(1 - theta / (Math.PI / 3));
  }
  return clamp01(0.6 * proximity + 0.4 * downwind);
}

/**
 * scoreCandidate — weighted sum of 6 normalized components.
 * Returns normalized components suitable for `ai_placements.score_components::jsonb`.
 */
export function scoreCandidate(
  candidate: Candidate,
  strategy: Strategy,
): ScoreResult {
  const w = STRATEGY_WEIGHTS[strategy];
  const p = candidate.props;

  const components: ScoreComponents = {
    ae: airExposure(candidate.location),
    bs: clamp01(p.surface_m2 / MAX_SURFACE_M2),
    po: clamp01(p.occupants / MAX_OCCUPANTS),
    vu: clamp01(TYPE_VULNERABILITY[p.type] ?? 0.3),
    hi: clamp01(p.heat_island_c / MAX_HEAT_C),
    gr: clamp01(1 - p.ndvi),
  };

  const weightedSum =
    w.ae * components.ae +
    w.bs * components.bs +
    w.po * components.po +
    w.vu * components.vu +
    w.hi * components.hi +
    w.gr * components.gr;

  const wTotal = w.ae + w.bs + w.po + w.vu + w.hi + w.gr;

  return { score: weightedSum / wTotal, components };
}

/**
 * farthestPointSelection — greedy spatial diversification so the picked
 * buildings aren't clustered in one neighbourhood. Uses haversine distance.
 */
export function farthestPointSelection<T extends { location: { lon: number; lat: number } }>(
  ranked: T[],
  k: number,
  minDistanceM: number,
): T[] {
  const chosen: T[] = [];
  for (const cand of ranked) {
    if (chosen.length >= k) break;
    const tooClose = chosen.some(
      (c) => haversine(c.location, cand.location) < minDistanceM,
    );
    if (!tooClose) chosen.push(cand);
  }
  return chosen;
}

function haversine(
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

function clamp01(v: number): number {
  if (!isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}
