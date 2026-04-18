import { ScatterplotLayer, GeoJsonLayer, BitmapLayer, LineLayer } from "@deck.gl/layers";
import { HeatmapLayer } from "@deck.gl/aggregation-layers";
import type { Feature, FeatureCollection, Point } from "geojson";

export interface Sensor {
  id: number;
  lon: number;
  lat: number;
  ring: 1 | 2 | 3;
  so2: number;
  no2: number;
  aqi: number;
  status: string;
  highlight?: string;
}

const RED: [number, number, number] = [226, 75, 74];
const AMBER: [number, number, number] = [239, 159, 39];
const CYAN: [number, number, number] = [62, 201, 208];
const DEEP_RED: [number, number, number] = [122, 31, 31];

function sensorColor(so2: number, alpha = 220): [number, number, number, number] {
  const tint = so2 > 200 ? RED : so2 > 100 ? AMBER : CYAN;
  return [...tint, alpha] as [number, number, number, number];
}

export function sensorsLayer(data: Sensor[], pulse: number, visible = true) {
  return new ScatterplotLayer<Sensor>({
    id: "sensors",
    data,
    visible,
    getPosition: (d) => [d.lon, d.lat],
    getRadius: (d) =>
      80 + d.so2 / 2 + Math.sin(pulse * 2 + d.id * 0.6) * (24 + (d.ring === 1 ? 16 : 0)),
    radiusUnits: "meters",
    radiusMinPixels: 3,
    radiusMaxPixels: 30,
    stroked: true,
    lineWidthMinPixels: 1,
    getLineColor: [255, 255, 255, 90],
    getFillColor: (d) => sensorColor(d.so2),
    pickable: true,
    updateTriggers: { getRadius: pulse },
  });
}

export function sensorsGlowLayer(data: Sensor[], pulse: number, visible = true) {
  // Soft outer halo, bigger and more transparent, for high-SO₂ points only.
  const highs = data.filter((d) => d.so2 > 150);
  return new ScatterplotLayer<Sensor>({
    id: "sensors-glow",
    data: highs,
    visible,
    getPosition: (d) => [d.lon, d.lat],
    getRadius: (d) =>
      260 + d.so2 * 0.8 + Math.sin(pulse * 1.2 + d.id) * 40,
    radiusUnits: "meters",
    radiusMinPixels: 10,
    stroked: false,
    getFillColor: (d) =>
      d.so2 > 200 ? [...DEEP_RED, 60] : [...AMBER, 45],
    updateTriggers: { getRadius: pulse },
  });
}

export function plumeLayer(data: Sensor[], intensity = 1, visible = true) {
  return new HeatmapLayer<Sensor>({
    id: "plume",
    data,
    visible,
    getPosition: (d) => [d.lon, d.lat],
    getWeight: (d) => d.so2 * intensity,
    radiusPixels: 120,
    intensity: 1.1,
    threshold: 0.04,
    aggregation: "MEAN",
    colorRange: [
      [239, 159, 39, 0],
      [239, 159, 39, 60],
      [226, 75, 74, 120],
      [226, 75, 74, 180],
      [122, 31, 31, 220],
      [90, 20, 20, 240],
    ],
    updateTriggers: { getWeight: intensity },
  });
}

export function gctPolygonLayer(geojson: FeatureCollection, visible = true) {
  return new GeoJsonLayer({
    id: "gct-polygon",
    data: geojson,
    visible,
    filled: true,
    stroked: true,
    extruded: true,
    getElevation: (f) => {
      const g = f as Feature;
      return g.properties?.kind === "stack" ? 0 : 35;
    },
    getFillColor: (f) => {
      const g = f as Feature;
      return g.properties?.kind === "stack" ? [0, 0, 0, 0] : [50, 48, 44, 220];
    },
    getLineColor: [170, 170, 170, 220],
    lineWidthMinPixels: 1,
    pickable: false,
  });
}

export function gctStacksLayer(geojson: FeatureCollection, pulse: number, visible = true) {
  const stacks = {
    type: "FeatureCollection" as const,
    features: geojson.features.filter((f) => f.properties?.kind === "stack"),
  };
  return new ScatterplotLayer<Feature<Point>>({
    id: "gct-stacks",
    data: stacks.features as Feature<Point>[],
    visible,
    getPosition: (f) => f.geometry.coordinates as [number, number],
    getRadius: () => 30 + Math.sin(pulse * 1.5) * 8,
    radiusUnits: "meters",
    radiusMinPixels: 3,
    stroked: true,
    lineWidthMinPixels: 1,
    getLineColor: [226, 75, 74, 220],
    getFillColor: [226, 75, 74, 200],
    updateTriggers: { getRadius: pulse },
  });
}

export function landmarksLayer(geojson: FeatureCollection, visible = true) {
  return new GeoJsonLayer({
    id: "landmarks",
    data: geojson,
    visible,
    filled: true,
    stroked: true,
    pointRadiusUnits: "meters",
    getPointRadius: (f) => {
      const k = (f as Feature).properties?.kind;
      return k === "school" ? 55 : k === "home" ? 40 : 50;
    },
    pointRadiusMinPixels: 4,
    getFillColor: (f) => {
      const k = (f as Feature).properties?.kind;
      if (k === "school") return [226, 75, 74, 230];
      if (k === "home") return [62, 201, 154, 230];
      return [55, 138, 221, 230];
    },
    getLineColor: [255, 255, 255, 220],
    lineWidthMinPixels: 1.5,
  });
}

/* -------------------------------------------------------------------------- */
/*  Med-scope dashboard factories                                             */
/* -------------------------------------------------------------------------- */

type Severity = "high" | "medium" | "low";

const DANGER: [number, number, number] = [226, 75, 74];
const AMB: [number, number, number] = [239, 159, 39];
const CYA: [number, number, number] = [62, 201, 208];
const BLU: [number, number, number] = [55, 138, 221];
const ACC: [number, number, number] = [62, 201, 154];

function sevColor(s: Severity, alpha = 220): [number, number, number, number] {
  const t = s === "high" ? DANGER : s === "medium" ? AMB : CYA;
  return [...t, alpha] as [number, number, number, number];
}

/**
 * Industrial emitter dots across the Mediterranean. Radius scales with
 * co2_mt_yr and severity; GCT Ghannouch gets a secondary pulsing halo.
 */
export function emittersLayer(
  geojson: FeatureCollection,
  pulse: number,
  visible = true,
) {
  return new GeoJsonLayer({
    id: "emitters",
    data: geojson,
    visible,
    pickable: true,
    stroked: true,
    filled: true,
    pointRadiusUnits: "meters",
    getPointRadius: (f) => {
      const p = (f as Feature).properties as { id: string; severity: Severity; co2_mt_yr?: number };
      const base = p.severity === "high" ? 5500 : p.severity === "medium" ? 3200 : 1800;
      const bonus = (p.co2_mt_yr ?? 0.5) * 450;
      const gctPulse = p.id === "gct-ghannouch" ? 1 + 0.12 * Math.sin(pulse) : 1;
      return (base + bonus) * gctPulse;
    },
    pointRadiusMinPixels: 4,
    pointRadiusMaxPixels: 46,
    getFillColor: (f) => {
      const p = (f as Feature).properties as { severity: Severity };
      return sevColor(p.severity, 180);
    },
    getLineColor: [255, 255, 255, 80],
    lineWidthMinPixels: 1,
    updateTriggers: { getPointRadius: pulse },
  });
}

/**
 * Historical pollution incidents. Recent (<90d) events pulse; the Oct-14
 * Chatt Essalam event gets a larger anchor radius.
 */
export function incidentsLayer(
  geojson: FeatureCollection,
  pulse: number,
  visible = true,
) {
  const now = Date.now();
  const NINETY_D = 1000 * 60 * 60 * 24 * 90;
  return new GeoJsonLayer({
    id: "incidents",
    data: geojson,
    visible,
    pickable: true,
    stroked: true,
    filled: true,
    pointRadiusUnits: "meters",
    getPointRadius: (f) => {
      const p = (f as Feature).properties as { id: string; severity: Severity };
      const base = p.severity === "high" ? 1600 : p.severity === "medium" ? 900 : 500;
      return p.id === "chatt-essalam-2025-10-14" ? base * 1.6 : base;
    },
    pointRadiusMinPixels: 3,
    pointRadiusMaxPixels: 22,
    getFillColor: (f) => {
      const p = (f as Feature).properties as { severity: Severity; date?: string };
      const recent = p.date ? now - new Date(p.date).getTime() < NINETY_D : false;
      const alpha = recent ? 150 + Math.round(Math.sin(pulse * 2) * 60) : 180;
      return sevColor(p.severity, alpha);
    },
    getLineColor: (f) => {
      const p = (f as Feature).properties as { severity: Severity };
      return sevColor(p.severity, 240);
    },
    lineWidthMinPixels: 1.2,
    updateTriggers: { getFillColor: pulse, getPointRadius: pulse },
  });
}

/**
 * Schools (blue) + hospitals (accent) dots. No pulse, quiet.
 */
export function infraLayer(geojson: FeatureCollection, visible = true) {
  return new GeoJsonLayer({
    id: "infra",
    data: geojson,
    visible,
    pickable: false,
    filled: true,
    stroked: true,
    pointRadiusUnits: "meters",
    getPointRadius: 320,
    pointRadiusMinPixels: 2,
    getFillColor: (f) => {
      const k = (f as Feature).properties?.kind;
      if (k === "school") return [...BLU, 200] as [number, number, number, number];
      if (k === "hospital") return [...ACC, 200] as [number, number, number, number];
      return [247, 246, 242, 160] as [number, number, number, number];
    },
    getLineColor: [255, 255, 255, 80],
    lineWidthMinPixels: 0.6,
  });
}

export interface WindPoint {
  lon: number;
  lat: number;
  u: number;
  v: number;
}

/** Wind barbs — LineLayer. Empty array just renders nothing. */
export function windLayer(points: WindPoint[], visible = true) {
  return new LineLayer<WindPoint>({
    id: "wind",
    data: points,
    visible,
    getSourcePosition: (d) => [d.lon, d.lat],
    getTargetPosition: (d) => [d.lon + d.u * 0.015, d.lat + d.v * 0.015],
    getColor: [180, 200, 220, 140],
    getWidth: 1,
    widthMinPixels: 1,
  });
}

/**
 * Sentinel-5P monthly tile as a Mediterranean-scope bitmap. Missing tiles
 * gracefully degrade by rendering empty data.
 */
export function s5pTileLayer(monthKey: string | null, visible = true) {
  if (!monthKey) {
    return new BitmapLayer({ id: "s5p", visible: false, bounds: [0, 0, 0, 0], image: "" });
  }
  return new BitmapLayer({
    id: "s5p",
    visible,
    image: `/data/s5p-med/${monthKey}.png`,
    // west, south, east, north — Med basin
    bounds: [-6, 30, 36, 46],
    opacity: 0.55,
    desaturate: 0,
  });
}
