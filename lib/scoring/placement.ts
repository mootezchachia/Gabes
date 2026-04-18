/**
 * Placement candidate scoring — weighted sum of 6 normalized components,
 * per §6 of the brainstorming doc. Output is used by the AI placement
 * edge function to rank hexagonal grid candidates.
 *
 * All components are in [0, 1]. Higher score = better placement.
 */

export type Strategy =
  | "phosphate_recovery"
  | "school_protection"
  | "biodiversity";

export interface Candidate {
  location: { lon: number; lat: number };
  area_m2: number;
}

export interface ScoringContext {
  /** Current pollution magnitude at the candidate location, normalized 0..1
   *  (e.g., mean SO2 over recent readings divided by the 99th percentile). */
  pollution_severity: number;

  /** Bathymetric depth in meters at the candidate location. */
  depth_m: number;

  /** Fraction of nearby (within 200m) cells historically covered by
   *  Posidonia oceanica, 0..1. Higher = more valuable to protect. */
  meadow_overlap: number;

  /** Distance to nearest shipping lane in meters (higher is better). */
  shipping_lane_distance_m: number;

  /** Fraction of candidate area that is downwind of a school (0..1). */
  school_downwind_coverage: number;

  /** Overlap with GCT phosphate plume, 0..1. */
  phosphate_plume_overlap: number;
}

export interface ScoreComponents {
  pollution_severity: number;
  depth_fit: number;
  meadow_overlap: number;
  shipping_lane: number;
  school_downwind: number;
  phosphate_plume: number;
}

export interface ScoreResult {
  score: number;
  components: ScoreComponents;
}

/** Strategy-specific weights. Sum need not equal 1; score is normalized. */
export const STRATEGY_WEIGHTS: Record<Strategy, ScoreComponents> = {
  phosphate_recovery: {
    pollution_severity: 1.2,
    depth_fit: 0.8,
    meadow_overlap: 0.5,
    shipping_lane: 0.6,
    school_downwind: 0.4,
    phosphate_plume: 1.3,
  },
  school_protection: {
    pollution_severity: 1.0,
    depth_fit: 0.6,
    meadow_overlap: 0.3,
    shipping_lane: 0.4,
    school_downwind: 1.5,
    phosphate_plume: 1.1,
  },
  biodiversity: {
    pollution_severity: 0.7,
    depth_fit: 0.9,
    meadow_overlap: 1.4,
    shipping_lane: 1.0,
    school_downwind: 0.3,
    phosphate_plume: 0.8,
  },
};

/** ideal depth range for algae panels: 3-8 m. triangular membership. */
export function depthFit(depth: number): number {
  if (depth <= 0) return 0;
  if (depth < 3) return depth / 3;
  if (depth <= 8) return 1;
  if (depth < 15) return (15 - depth) / 7;
  return 0;
}

/** shipping lane distance → 0..1, saturates at 1000m. */
export function shippingLaneScore(distM: number): number {
  return clamp01(distM / 1000);
}

/**
 * scoreCandidate — weighted sum of 6 normalized components.
 * The returned `components` are the normalized 0..1 values (not weighted),
 * suitable for storage in `ai_placements.score_components::jsonb`.
 */
export function scoreCandidate(
  _candidate: Candidate,
  strategy: Strategy,
  ctx: ScoringContext,
): ScoreResult {
  const w = STRATEGY_WEIGHTS[strategy];

  const components: ScoreComponents = {
    pollution_severity: clamp01(ctx.pollution_severity),
    depth_fit: clamp01(depthFit(ctx.depth_m)),
    meadow_overlap: clamp01(ctx.meadow_overlap),
    shipping_lane: clamp01(shippingLaneScore(ctx.shipping_lane_distance_m)),
    school_downwind: clamp01(ctx.school_downwind_coverage),
    phosphate_plume: clamp01(ctx.phosphate_plume_overlap),
  };

  const weightedSum =
    w.pollution_severity * components.pollution_severity +
    w.depth_fit * components.depth_fit +
    w.meadow_overlap * components.meadow_overlap +
    w.shipping_lane * components.shipping_lane +
    w.school_downwind * components.school_downwind +
    w.phosphate_plume * components.phosphate_plume;

  const wTotal =
    w.pollution_severity +
    w.depth_fit +
    w.meadow_overlap +
    w.shipping_lane +
    w.school_downwind +
    w.phosphate_plume;

  return {
    score: weightedSum / wTotal,
    components,
  };
}

/**
 * farthestPointSelection — greedy spatial diversification.
 * Given a ranked list of candidates (best first), pick `k` that are at
 * least `minDistanceM` apart. Uses haversine distance.
 */
export function farthestPointSelection<T extends Candidate>(
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
