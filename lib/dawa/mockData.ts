/**
 * Development fallback data for /dawa when Supabase isn't wired up yet.
 *
 * Used by the hooks in `components/dawa/hooks.ts` when `getDawaClient()`
 * returns null. The shapes mirror the real Supabase types we'll use once
 * the backend agent lands `lib/supabase/client.ts`.
 */

import { GABES } from "../tokens";
import { DEFAULT_THRESHOLDS } from "./severity";
import type {
  AlertItem,
  LonLat,
  NewsEvent,
  Profile,
  Reading,
  Sensor,
  Weather,
  Zone,
} from "./types";

export const MOCK_PROFILE: Profile = {
  userId: "mock-amina",
  fullName: "Amina",
  homeLocation: GABES.aminaHome as LonLat,
  schoolLocation: GABES.schoolChattEssalam as LonLat,
  preferredLocale: "fr",
};

export const MOCK_ZONES: Zone[] = [
  {
    id: "z-chatt-essalam",
    slug: "chatt-essalam",
    name: "Chatt Essalam",
    kind: "school",
    centroid: GABES.schoolChattEssalam as LonLat,
  },
  {
    id: "z-ghannouch",
    slug: "ghannouch",
    name: "Ghannouch",
    kind: "residential",
    centroid: GABES.aminaHome as LonLat,
  },
  {
    id: "z-hopital",
    slug: "hopital-universitaire",
    name: "Hôpital universitaire",
    kind: "hospital",
    centroid: GABES.hospital as LonLat,
  },
  {
    id: "z-cote",
    slug: "cote-nord",
    name: "Côte nord",
    kind: "coastal",
    centroid: [10.12, 33.94] as LonLat,
  },
];

export const MOCK_SENSORS: Sensor[] = [
  {
    id: "mock-so2-gct",
    type: "so2",
    unit: "µg/m³",
    location: [10.1178, 33.9312] as LonLat,
    thresholds: DEFAULT_THRESHOLDS.so2,
    label: "SO₂ — GCT",
  },
  {
    id: "mock-pm25-chatt",
    type: "pm25",
    unit: "µg/m³",
    location: [10.1054, 33.9121] as LonLat,
    thresholds: DEFAULT_THRESHOLDS.pm25,
    label: "PM2.5 — Chatt Essalam",
  },
  {
    id: "mock-no2-ghannouch",
    type: "no2",
    unit: "µg/m³",
    location: [10.1098, 33.9189] as LonLat,
    thresholds: DEFAULT_THRESHOLDS.no2,
    label: "NO₂ — Ghannouch",
  },
];

export function mockReadings(now = Date.now()): Reading[] {
  // Deterministic-ish pseudo-random driven by the minute so the mock ring
  // changes colour over time without being wildly inconsistent.
  const minute = Math.floor(now / 60_000);
  const pulse = (minute % 7) / 7;
  return [
    {
      sensorId: "mock-so2-gct",
      type: "so2",
      unit: "µg/m³",
      value: 22 + pulse * 60,
      takenAt: new Date(now).toISOString(),
      thresholds: DEFAULT_THRESHOLDS.so2,
      sensorLabel: "SO₂ — GCT",
    },
    {
      sensorId: "mock-pm25-chatt",
      type: "pm25",
      unit: "µg/m³",
      value: 11 + pulse * 20,
      takenAt: new Date(now).toISOString(),
      thresholds: DEFAULT_THRESHOLDS.pm25,
      sensorLabel: "PM2.5 — Chatt Essalam",
    },
    {
      sensorId: "mock-no2-ghannouch",
      type: "no2",
      unit: "µg/m³",
      value: 14 + pulse * 10,
      takenAt: new Date(now).toISOString(),
      thresholds: DEFAULT_THRESHOLDS.no2,
      sensorLabel: "NO₂ — Ghannouch",
    },
  ];
}

export const MOCK_NEWS: NewsEvent[] = [
  {
    id: "n1",
    title: "Maintenance prévue — unité de désulfuration GCT",
    body_md:
      "La municipalité informe les riverains d’une opération de maintenance du 18 au 20 avril.",
    happenedAt: new Date(Date.now() - 3 * 3600_000).toISOString(),
    severity: "info",
    link: null,
    location: [10.1178, 33.9312] as LonLat,
  },
  {
    id: "n2",
    title: "Pic SO₂ signalé à Ghannouch",
    body_md: "Dépassement de 140 µg/m³ à 06h12 — vents favorables attendus à midi.",
    happenedAt: new Date(Date.now() - 55 * 60_000).toISOString(),
    severity: "warning",
    link: null,
    location: [10.1098, 33.9189] as LonLat,
  },
];

export const MOCK_WEATHER: Weather = {
  temperatureC: 21,
  windspeedMps: 3.2,
  winddirectionDeg: 210,
  humidityPct: 58,
  fetchedAt: new Date().toISOString(),
};

export function readingsToAlerts(readings: Reading[]): AlertItem[] {
  const out: AlertItem[] = [];
  for (const r of readings) {
    const crit = r.thresholds.critical;
    const warn = r.thresholds.warning;
    let severity: AlertItem["severity"] = "info";
    if (typeof crit === "number" && r.value >= crit) severity = "critical";
    else if (typeof warn === "number" && r.value >= warn) severity = "warning";
    else continue;
    const kindAir = ["so2", "no2", "pm25", "pm10"].includes(r.type);
    out.push({
      id: `r-${r.sensorId}-${r.takenAt}`,
      kind: kindAir ? "air" : "eau",
      severity,
      title: `${r.type.toUpperCase()} ${severity === "critical" ? "critique" : "élevé"}`,
      body: `${r.sensorLabel ?? r.sensorId} · ${r.value.toFixed(1)} ${r.unit}`,
      at: r.takenAt,
    });
  }
  return out;
}

export function newsToAlerts(news: NewsEvent[]): AlertItem[] {
  return news.map((n) => ({
    id: `n-${n.id}`,
    kind: "officiel",
    severity: n.severity,
    title: n.title,
    body: (n.body_md || "").split("\n")[0] ?? "",
    at: n.happenedAt,
    href: n.link || undefined,
  }));
}
