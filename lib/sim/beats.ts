import type { EasingOptions } from "mapbox-gl";
import { GABES } from "@/lib/tokens";

export interface CameraKey {
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
}

export interface BeatDef {
  id: "b1" | "b2" | "b3" | "b4";
  title: string;
  durationMs: number;
  camera: CameraKey;
  easeOpts?: Partial<EasingOptions>;
}

const b1Center: [number, number] = [GABES.aminaHome[0], GABES.aminaHome[1]];
const b2Center: [number, number] = [
  (GABES.aminaHome[0] + GABES.gct[0]) / 2,
  (GABES.aminaHome[1] + GABES.gct[1]) / 2,
];

export const BEATS: BeatDef[] = [
  {
    id: "b1",
    title: "Ghannouch, matin",
    durationMs: 22000,
    camera: { center: b1Center, zoom: 15.2, pitch: 56, bearing: -8 },
  },
  {
    id: "b2",
    title: "À 800 mètres",
    durationMs: 22000,
    camera: { center: b2Center, zoom: 13.2, pitch: 54, bearing: -28 },
  },
  {
    id: "b3",
    title: "ORACLE propose",
    durationMs: 20000,
    camera: { center: GABES.center, zoom: 10.6, pitch: 32, bearing: -18 },
  },
  {
    id: "b4",
    title: "2026 → 2035",
    durationMs: 26000,
    camera: { center: GABES.center, zoom: 10.2, pitch: 52, bearing: 12 },
  },
];

export const TOTAL_TOUR_MS = BEATS.reduce((n, b) => n + b.durationMs, 0);

/** Clamp a time value within a beat, returning t in [0,1]. Pure, testable. */
export function beatClamp(elapsedMs: number, durationMs: number): number {
  if (durationMs <= 0) return 0;
  if (elapsedMs <= 0) return 0;
  if (elapsedMs >= durationMs) return 1;
  return elapsedMs / durationMs;
}

/**
 * Linear-ish interpolation with smoothstep. Pure.
 */
export function smoothstep(a: number, b: number, t: number): number {
  const s = Math.max(0, Math.min(1, t));
  const e = s * s * (3 - 2 * s);
  return a + (b - a) * e;
}
