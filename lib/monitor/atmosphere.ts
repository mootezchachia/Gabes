import { ColumnLayer, LineLayer, ScatterplotLayer } from "@deck.gl/layers";
import { HeatmapLayer } from "@deck.gl/aggregation-layers";
import type { Sensor } from "./layers";

/* -------------------------------------------------------------------------- */
/*  Wind direction                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Derive a synthetic wind vector for Gabès from the hour of day.
 * Morning: east wind (onshore), midday: calm, afternoon: north-west (continental),
 * evening: south (offshore). Returns unit-ish vector in lon/lat space.
 */
export function windVectorForHour(hour: number): { u: number; v: number; speed: number; bearingDeg: number } {
  // Primary synthetic cycle: mapped against known prevailing patterns for Gabès.
  // Bearing in compass degrees (meteorological convention: FROM direction).
  // We return direction TO which the wind blows.
  const t = (hour / 24) * Math.PI * 2;
  // Start (0h): wind FROM ESE → blowing WNW
  // 8h: wind FROM NE → blowing SW (morning sea breeze onset)
  // 14h: wind FROM W → blowing E (afternoon inversion)
  // 20h: wind FROM S → blowing N (evening offshore)
  const bearingRad = Math.PI * 1.5 + Math.sin(t - 0.7) * 0.9 + Math.cos(t) * 0.4;
  const speed = 0.55 + 0.35 * Math.abs(Math.sin(t * 0.5 + 0.4));
  const u = Math.sin(bearingRad) * speed; // east component
  const v = Math.cos(bearingRad) * speed; // north component
  const bearingDeg = ((bearingRad * 180) / Math.PI + 360) % 360;
  return { u, v, speed, bearingDeg };
}

/* -------------------------------------------------------------------------- */
/*  Wind particle field                                                       */
/* -------------------------------------------------------------------------- */

/** Seeded 2D hash. Deterministic per particle id. */
function hash2(i: number, seed: number): number {
  let h = (i * 2654435761 + seed * 16777619) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return (h / 0xffffffff) % 1;
}

export interface WindParticle {
  id: number;
  lon: number;
  lat: number;
  age: number;   // 0..1 lifespan progress
  seed: number;
}

interface BoxLngLat {
  minLon: number;
  maxLon: number;
  minLat: number;
  maxLat: number;
}

/** Gabès-scoped particle field. 400 particles drifting with the wind vector. */
export function stepWindField(
  particles: WindParticle[],
  u: number,
  v: number,
  dt: number,
  bbox: BoxLngLat,
  count = 360,
): WindParticle[] {
  const out: WindParticle[] = particles.length === count ? particles : new Array(count);
  const stepLon = u * 0.00028 * dt * 60;
  const stepLat = v * 0.00028 * dt * 60;
  const span = bbox.maxLon - bbox.minLon;
  const spanLat = bbox.maxLat - bbox.minLat;

  for (let i = 0; i < count; i++) {
    const prev = out[i];
    if (!prev) {
      out[i] = {
        id: i,
        lon: bbox.minLon + hash2(i, 1) * span,
        lat: bbox.minLat + hash2(i, 2) * spanLat,
        age: hash2(i, 3),
        seed: hash2(i, 4),
      };
      continue;
    }
    let { lon, lat, age } = prev;
    lon += stepLon * (0.6 + prev.seed * 0.8);
    lat += stepLat * (0.6 + prev.seed * 0.8);
    age += dt * (0.22 + prev.seed * 0.2);

    if (
      age > 1 ||
      lon < bbox.minLon - 0.02 ||
      lon > bbox.maxLon + 0.02 ||
      lat < bbox.minLat - 0.02 ||
      lat > bbox.maxLat + 0.02
    ) {
      // Respawn on upwind edge with fresh seed
      const s = hash2(i + Math.floor(age * 1e6), 7);
      const startOffset = 0.04;
      lon = u >= 0 ? bbox.minLon - startOffset * 0.5 : bbox.maxLon + startOffset * 0.5;
      lat = bbox.minLat + hash2(i, 11 + Math.floor(age * 97)) * spanLat;
      age = 0;
      out[i] = { id: i, lon, lat, age, seed: s };
    } else {
      out[i] = { id: i, lon, lat, age, seed: prev.seed };
    }
  }
  return out;
}

/** Wind streaks — short LineLayer segments behind each particle. */
export function windStreakLayer(
  particles: WindParticle[],
  u: number,
  v: number,
  visible = true,
) {
  const len = 0.008; // degrees, tuned for Gabès zoom
  return new LineLayer<WindParticle>({
    id: "wind-streaks",
    data: particles,
    visible,
    getSourcePosition: (p) => [p.lon - u * len, p.lat - v * len],
    getTargetPosition: (p) => [p.lon, p.lat],
    getColor: (p) => {
      // Fade in and out across lifespan; tint shifts from warm to cool
      const a = Math.sin(p.age * Math.PI);
      const alpha = Math.round(a * 150);
      return [210, 220, 235, alpha];
    },
    getWidth: (p) => 0.5 + (1 - p.age) * 1.2,
    widthUnits: "pixels",
    widthMinPixels: 0.5,
    widthMaxPixels: 2.2,
    updateTriggers: { getColor: particles, getSourcePosition: [u, v] },
  });
}

/** Dim dot at the head of each particle — sells motion. */
export function windHeadLayer(particles: WindParticle[], visible = true) {
  return new ScatterplotLayer<WindParticle>({
    id: "wind-heads",
    data: particles,
    visible,
    getPosition: (p) => [p.lon, p.lat],
    getRadius: (p) => 30 + (1 - p.age) * 80,
    radiusUnits: "meters",
    radiusMinPixels: 0.6,
    radiusMaxPixels: 2.2,
    stroked: false,
    getFillColor: (p) => {
      const a = Math.sin(p.age * Math.PI);
      return [220, 232, 245, Math.round(a * 140)];
    },
    updateTriggers: { getFillColor: particles },
  });
}

/* -------------------------------------------------------------------------- */
/*  Volumetric plume — a 3-layer stack for smoke-like softness                */
/*                                                                            */
/*  The plume is NOT one ColumnLayer. Readability and "haze" come from        */
/*  compositing three layers that each render a different slice of the gas:  */
/*                                                                            */
/*   1. Ground haze   — HeatmapLayer, soft amber puddle under the column     */
/*                       stack. Sells diffusion and connects columns to      */
/*                       the landscape. 0 elevation.                          */
/*   2. Mid glow       — ScatterplotLayer, a warm-amber disc at each cell    */
/*                       base. Fills the gaps between columns, blurring      */
/*                       the column grid into a continuous wash.              */
/*   3. Column stack  — ColumnLayer, extruded polygonal columns with          */
/*                       high diskResolution so the faceting reads as        */
/*                       rounded. Smaller radius + lower alpha than before.  */
/* -------------------------------------------------------------------------- */

export interface PlumeCell {
  lon: number;
  lat: number;
  intensity: number;
  height: number;
  jitter: number;
}

interface VolumetricPlumeOpts {
  source: [number, number];
  u: number;
  v: number;
  pulse: number;
  intensityScale?: number;
}

/**
 * Build a denser radial grid of plume cells extending DOWNWIND from GCT.
 * Denser grid (17 × 13) + tighter spacing lets us use a smaller column
 * radius while still covering the cone without visible gaps. Per-frame
 * jitter on position breaks the grid pattern.
 */
export function buildPlumeField({
  source,
  u,
  v,
  pulse,
  intensityScale = 1,
}: VolumetricPlumeOpts): PlumeCell[] {
  const speed = Math.hypot(u, v) || 0.0001;
  const ux = u / speed;
  const vy = v / speed;
  // crosswind basis (perpendicular in lon/lat)
  const cx = -vy;
  const cy = ux;

  const cells: PlumeCell[] = [];
  const ANGLES = 17;       // cross-wind half-width slots (was 11)
  const DISTANCES = 13;    // along-wind steps (was 9)
  const DIST_STEP = 0.0038; // ~340m per step (was 0.0055)

  for (let di = 1; di <= DISTANCES; di++) {
    const d = di * DIST_STEP;
    const along = d;
    // Gaussian cross-wind sigma grows with distance
    const sigma = 0.0018 + d * 0.18;
    for (let ai = -Math.floor(ANGLES / 2); ai <= Math.floor(ANGLES / 2); ai++) {
      const crossFrac = ai / Math.floor(ANGLES / 2);
      const cross = crossFrac * sigma * 3;

      // per-cell seeded jitter, animated by pulse — softens grid regularity
      const jSeed = di * 31 + ai * 7;
      const jLon = (hash2(jSeed, 3) - 0.5) * 0.0012;
      const jLat = (hash2(jSeed, 11) - 0.5) * 0.0012;
      const jitterPulse = Math.sin(pulse * 0.6 + jSeed * 0.21) * 0.0004;

      const lon = source[0] + ux * along + cx * cross + jLon + jitterPulse;
      const lat = source[1] + vy * along + cy * cross + jLat + jitterPulse * 0.7;

      // decay along-wind (exponential) × crosswind Gaussian
      const alongDecay = Math.exp(-d * 5.2);
      const crossDecay = Math.exp(-(cross * cross) / (2 * sigma * sigma));
      // breathing modulation, per-cell phase
      const breathe = 0.82 + 0.18 * Math.sin(pulse * 0.8 + di * 0.4 + ai * 0.12);
      const intensity = alongDecay * crossDecay * breathe * intensityScale;
      const height = 60 + intensity * 340; // meters (was 80+420)

      if (intensity > 0.03) {
        cells.push({ lon, lat, intensity, height, jitter: hash2(jSeed, 17) });
      }
    }
  }
  return cells;
}

/**
 * Ground haze — HeatmapLayer driven by the same plume cells.
 * Sits at elevation 0. THIS is the plume body. Big radius, mid alpha.
 * It connects the drift cone into a continuous cloud.
 */
export function plumeGroundHazeLayer(cells: PlumeCell[], visible = true) {
  return new HeatmapLayer<PlumeCell>({
    id: "plume-ground-haze",
    data: cells,
    visible,
    getPosition: (c) => [c.lon, c.lat],
    getWeight: (c) => c.intensity,
    radiusPixels: 150,
    intensity: 1.8,
    threshold: 0.03,
    // Warm amber → desaturated red. Stronger alpha so haze carries
    // the plume visually without needing column extrusion to do it.
    colorRange: [
      [239, 159, 39, 0],
      [239, 159, 39, 55],
      [232, 120, 50, 110],
      [210, 90, 58, 160],
      [170, 60, 55, 190],
      [122, 40, 48, 220],
    ],
    updateTriggers: { getWeight: cells },
  });
}

/**
 * Mid-glow — large filled discs at each cell base. Bigger than before.
 * Does most of the plume "body" work in 2D so the ColumnLayer can be
 * very sparse. Fills gaps + softens edges of the heatmap.
 */
export function plumeMidGlowLayer(cells: PlumeCell[], visible = true) {
  return new ScatterplotLayer<PlumeCell>({
    id: "plume-mid-glow",
    data: cells,
    visible,
    getPosition: (c) => [c.lon, c.lat],
    getRadius: (c) => 320 + c.intensity * 280,
    radiusUnits: "meters",
    radiusMinPixels: 10,
    stroked: false,
    filled: true,
    getFillColor: (c) => {
      const t = Math.min(1, c.intensity * 1.3);
      const r = Math.round(239 + (200 - 239) * t);
      const g = Math.round(159 + (78 - 159) * t);
      const b = Math.round(52 + (48 - 52) * t);
      const a = Math.round(30 + t * 55);
      return [r, g, b, a];
    },
    updateTriggers: { getFillColor: cells, getRadius: cells },
  });
}

/**
 * Column stack — SPARSE vertical emphasis only.
 *
 * Previously the column grid tried to BE the plume. That read as a
 * hexagonal cylinder farm. Now: we only extrude the top ~18% most
 * intense cells, so the columns become a few tall plumes rising from
 * the center of the amber cloud rather than a field of bars.
 *
 * The 2D layers (ground heatmap + mid-glow discs) carry the plume body.
 */
export function volumetricPlumeLayer(cells: PlumeCell[], visible = true) {
  // Keep only the top-intensity cells. Threshold tuned so we get ~15-25
  // columns of real vertical emphasis, not 200.
  const vertical = cells.filter((c) => c.intensity > 0.38);

  return new ColumnLayer<PlumeCell>({
    id: "plume-volumetric",
    data: vertical,
    visible,
    getPosition: (c) => [c.lon, c.lat],
    radius: 140,
    radiusUnits: "meters",
    diskResolution: 48,
    extruded: true,
    getElevation: (c) => c.height * 1.6, // amplified since we only keep the tallest
    getFillColor: (c) => {
      const t = Math.min(1, c.intensity * 1.1);
      const r = Math.round(239 + (200 - 239) * t);
      const g = Math.round(159 + (70 - 159) * t);
      const b = Math.round(50 + (50 - 50) * t);
      const a = Math.round(28 + t * 45); // 28..73 — very soft
      return [r, g, b, a];
    },
    material: false,
    pickable: false,
    updateTriggers: {
      getElevation: cells,
      getFillColor: cells,
    },
  });
}

/* -------------------------------------------------------------------------- */
/*  Source glow — soft amber wash right over the GCT centroid                 */
/*                                                                            */
/*  Sits underneath everything else. Anchors the plume visually to its        */
/*  source so the cone doesn't feel orphaned when the wind blows it off.     */
/* -------------------------------------------------------------------------- */

export function sourceGlowLayer(
  source: [number, number],
  pulse: number,
  visible = true,
) {
  const breathe = 0.9 + 0.1 * Math.sin(pulse * 0.35);
  // Two stacked discs: wide outer wash + concentrated inner core.
  // Anchors the plume visually to GCT at any zoom.
  return [
    new ScatterplotLayer<{ lon: number; lat: number }>({
      id: "plume-source-glow-outer",
      data: [{ lon: source[0], lat: source[1] }],
      visible,
      getPosition: (d) => [d.lon, d.lat],
      getRadius: 1800 * breathe,
      radiusUnits: "meters",
      stroked: false,
      filled: true,
      getFillColor: [239, 159, 39, 42],
      updateTriggers: { getRadius: pulse },
    }),
    new ScatterplotLayer<{ lon: number; lat: number }>({
      id: "plume-source-glow-inner",
      data: [{ lon: source[0], lat: source[1] }],
      visible,
      getPosition: (d) => [d.lon, d.lat],
      getRadius: 650 * breathe,
      radiusUnits: "meters",
      stroked: false,
      filled: true,
      getFillColor: [255, 200, 100, 85],
      updateTriggers: { getRadius: pulse },
    }),
  ];
}

/* -------------------------------------------------------------------------- */
/*  Critical sensor halo — outermost slow pulse ring for >200 µg/m³           */
/* -------------------------------------------------------------------------- */

export function criticalHaloLayer(data: Sensor[], pulse: number, visible = true) {
  const critical = data.filter((d) => d.so2 > 200);
  return new ScatterplotLayer<Sensor>({
    id: "sensors-critical-halo",
    data: critical,
    visible,
    getPosition: (d) => [d.lon, d.lat],
    getRadius: (d) => {
      const breathe = 540 + Math.sin(pulse * 0.55 + d.id * 0.3) * 180;
      return breathe + d.so2 * 0.4;
    },
    radiusUnits: "meters",
    radiusMinPixels: 16,
    stroked: true,
    filled: false,
    lineWidthMinPixels: 0.8,
    getLineColor: (d) => {
      const fade = 0.5 + 0.5 * Math.sin(pulse * 0.55 + d.id * 0.3);
      return [226, 75, 74, Math.round(110 + fade * 60)];
    },
    updateTriggers: { getRadius: pulse, getLineColor: pulse },
  });
}
