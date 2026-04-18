import { ColumnLayer, LineLayer, ScatterplotLayer } from "@deck.gl/layers";
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
      const alpha = Math.round(a * 180);
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
    radiusMaxPixels: 2.5,
    stroked: false,
    getFillColor: (p) => {
      const a = Math.sin(p.age * Math.PI);
      return [220, 232, 245, Math.round(a * 160)];
    },
    updateTriggers: { getFillColor: particles },
  });
}

/* -------------------------------------------------------------------------- */
/*  Volumetric plume (column stack downwind of GCT)                           */
/* -------------------------------------------------------------------------- */

export interface PlumeCell {
  lon: number;
  lat: number;
  intensity: number;
  height: number;
}

interface VolumetricPlumeOpts {
  source: [number, number];
  u: number;
  v: number;
  pulse: number;
  intensityScale?: number;
}

/**
 * Build a radial grid of plume cells extending DOWNWIND from GCT. Each cell's
 * intensity decays with along-wind distance and a Gaussian cross-wind falloff,
 * modulated by a slow breathing pulse. Suitable for a ColumnLayer.
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
  const ANGLES = 11; // cross-wind half-width slots
  const DISTANCES = 9; // along-wind steps
  const DIST_STEP = 0.0055; // ~500m per step

  for (let di = 1; di <= DISTANCES; di++) {
    const d = di * DIST_STEP;
    const along = d;
    // Gaussian cross-wind sigma grows with distance
    const sigma = 0.0018 + d * 0.18;
    for (let ai = -Math.floor(ANGLES / 2); ai <= Math.floor(ANGLES / 2); ai++) {
      const crossFrac = ai / Math.floor(ANGLES / 2);
      const cross = crossFrac * sigma * 3;
      const lon = source[0] + ux * along + cx * cross;
      const lat = source[1] + vy * along + cy * cross;

      // decay along-wind (exponential) × crosswind Gaussian
      const alongDecay = Math.exp(-d * 5.6);
      const crossDecay = Math.exp(-(cross * cross) / (2 * sigma * sigma));
      // slight breathing modulation
      const breathe = 0.85 + 0.15 * Math.sin(pulse * 0.8 + di * 0.4);
      const intensity = alongDecay * crossDecay * breathe * intensityScale;
      const height = 80 + intensity * 420; // meters

      if (intensity > 0.04) {
        cells.push({ lon, lat, intensity, height });
      }
    }
  }
  return cells;
}

export function volumetricPlumeLayer(cells: PlumeCell[], visible = true) {
  return new ColumnLayer<PlumeCell>({
    id: "plume-volumetric",
    data: cells,
    visible,
    getPosition: (c) => [c.lon, c.lat],
    radius: 260,
    radiusUnits: "meters",
    diskResolution: 16,
    extruded: true,
    getElevation: (c) => c.height,
    getFillColor: (c) => {
      // Hot at low intensity fringe → deep red at core
      const t = Math.min(1, c.intensity * 1.2);
      // interp between amber and deep-red
      const r = Math.round(239 + (122 - 239) * t);
      const g = Math.round(159 + (31 - 159) * t);
      const b = Math.round(39 + (31 - 39) * t);
      const a = Math.round(60 + t * 140);
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
