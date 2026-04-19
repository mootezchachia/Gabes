/**
 * Pasquill-Gifford Gaussian plume — closed-form single-source air-quality
 * simulator for the GCT complex in Gabès.
 *
 * Assumptions:
 *   - Single point source at GCT center (10.1178, 33.9312), stack height 40m.
 *   - Pasquill class D (neutral) Briggs σy/σz formulas (rural).
 *   - Emission Q tuned to ~340 µg/m³ at Chatt Essalam (~800m downwind) for
 *     October 2025-like inversion conditions.
 *   - ±15% multiplicative noise.
 *   - Diurnal multiplier (higher at dawn = inversion, lower at noon).
 *
 * Refs:
 *   - Turner (1970) Workbook of Atmospheric Dispersion Estimates
 *   - Briggs (1973) Diffusion estimation for small emissions
 */

export interface SensorLike {
  id?: string;
  location: { lon: number; lat: number } | [number, number];
  type: "so2" | "no2" | "pm25" | "pm10" | string;
  metadata?: { baseline?: number; diurnal_peak?: string; [k: string]: unknown };
}

export interface Wind {
  /** m/s */
  speed_mps: number;
  /** degrees meteorological (direction FROM which wind blows, 0 = N, 90 = E) */
  direction_deg: number;
}

export interface Source {
  lon: number;
  lat: number;
  /** stack height in meters */
  stack_h_m: number;
  /** emission rate in g/s (per pollutant) */
  q_g_s: number;
}

export const GCT_SOURCE: Source = {
  lon: 10.1178,
  lat: 33.9312,
  stack_h_m: 40,
  q_g_s: 220, // SO2 baseline; overridden per-type below
};

/** per-pollutant emission rate factor (relative to SO2) */
const Q_FACTOR: Record<string, number> = {
  so2: 1.0,
  no2: 0.35,
  pm25: 0.18,
  pm10: 0.28,
};

/** seed-reproducible RNG helper (mulberry32) */
export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function coords(
  loc: SensorLike["location"],
): { lon: number; lat: number } {
  if (Array.isArray(loc)) return { lon: loc[0], lat: loc[1] };
  return loc;
}

/** Equirectangular meters from origin to target, near given latitude. */
export function metersFrom(
  origin: { lon: number; lat: number },
  target: { lon: number; lat: number },
): { dx: number; dy: number } {
  const dx =
    (target.lon - origin.lon) * 111320 * Math.cos((origin.lat * Math.PI) / 180);
  const dy = (target.lat - origin.lat) * 110540;
  return { dx, dy };
}

/** Briggs rural sigma_y / sigma_z for Pasquill class D. */
export function briggsSigmas(xMeters: number): { sy: number; sz: number } {
  const x = Math.max(xMeters, 1);
  const sy = (0.08 * x) / Math.sqrt(1 + 0.0001 * x);
  const sz = (0.06 * x) / Math.sqrt(1 + 0.0015 * x);
  return { sy, sz };
}

/** Diurnal multiplier driven by local hour of day (0..23). */
export function diurnalMultiplier(hour: number): number {
  if (hour >= 5 && hour <= 8) return 1.6;
  if (hour >= 9 && hour <= 11) return 1.1;
  if (hour >= 12 && hour <= 15) return 0.7;
  if (hour >= 16 && hour <= 18) return 0.9;
  if (hour >= 19 && hour <= 21) return 1.2;
  return 1.3;
}

export interface ComputeAirOpts {
  sensor: SensorLike;
  wind: Wind;
  source?: Source;
  /** JS Date or ISO string; used for diurnal multiplier */
  at?: Date | string;
  /** deterministic seed; if absent, uses Math.random */
  rngSeed?: number;
}

/**
 * computeAirReading — returns a single µg/m³ value for the given sensor.
 */
export function computeAirReading(opts: ComputeAirOpts): number {
  const { sensor, wind } = opts;
  const source = opts.source ?? GCT_SOURCE;
  const rng = opts.rngSeed != null ? mulberry32(opts.rngSeed) : Math.random;
  const baseline = Number(sensor.metadata?.baseline ?? 15);

  const s = coords(sensor.location);
  const { dx, dy } = metersFrom(source, s);

  // Wind comes FROM direction_deg; plume travels to (direction_deg + 180).
  const thetaTo = ((wind.direction_deg + 180) * Math.PI) / 180;
  const cosT = Math.cos(thetaTo);
  const sinT = Math.sin(thetaTo);

  // Rotate so x is along wind, y cross-wind.
  const x = dx * cosT + dy * sinT;
  const y = -dx * sinT + dy * cosT;

  const u = Math.max(wind.speed_mps, 0.5);

  // Upwind of the stack (or within 20m) → baseline + noise only.
  if (x <= 20) {
    const noise = 1 + (rng() - 0.5) * 0.2;
    return Math.max(baseline * noise, 1);
  }

  const { sy, sz } = briggsSigmas(x);
  const qFactor = Q_FACTOR[sensor.type] ?? 1.0;
  const q = source.q_g_s * qFactor;
  const H = source.stack_h_m;

  // Ground-level (z=0) concentration, reflected (Turner eq 3.3).
  const c =
    (q / (Math.PI * u * sy * sz)) *
    Math.exp(-(y * y) / (2 * sy * sy)) *
    Math.exp(-(H * H) / (2 * sz * sz));

  const cMicroGram = c * 1e6; // g/m³ → µg/m³

  const hour = new Date(opts.at ?? Date.now()).getHours();
  const diurnal = diurnalMultiplier(hour);
  const noise = 1 + (rng() - 0.5) * 0.3; // ±15%

  return Math.max(baseline + cMicroGram * diurnal * noise, 1);
}
