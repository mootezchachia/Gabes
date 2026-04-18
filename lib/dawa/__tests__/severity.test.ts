/**
 * Unit tests for lib/dawa pure functions.
 *
 * These tests are framework-agnostic so they can be adapted to Vitest or
 * Jest without modification. Each test is a synchronous assertion that
 * throws on failure. The tiny harness below prints a one-line PASS/FAIL
 * report when the file is run directly via `tsx` or `node --loader`.
 */

import {
  DEFAULT_THRESHOLDS,
  computeSeverity,
  severityForReading,
} from "../severity";
import { assignTopics, sanitizeSlug, topicForZone } from "../assignTopics";
import { recommendRoute } from "../routeRecommender";
import type { LonLat, Reading, Sensor, Zone } from "../types";

type Case = { name: string; fn: () => void };
const cases: Case[] = [];
const test = (name: string, fn: () => void) => cases.push({ name, fn });

function assertEq<T>(actual: T, expected: T, msg = "") {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) {
    throw new Error(`${msg} — expected ${b}, got ${a}`);
  }
}
function assert(cond: unknown, msg = "") {
  if (!cond) throw new Error(msg || "assertion failed");
}

// ───────────────────────── severity ────────────────────────────────────

test("severityForReading: respects warning and critical", () => {
  assertEq(severityForReading(10, { warning: 40, critical: 200 }), "ok");
  assertEq(severityForReading(50, { warning: 40, critical: 200 }), "warning");
  assertEq(severityForReading(300, { warning: 40, critical: 200 }), "critical");
});

test("computeSeverity: picks worst severity across multiple readings", () => {
  const readings: Reading[] = [
    {
      sensorId: "a",
      type: "so2",
      unit: "µg/m³",
      value: 10,
      takenAt: "2026-04-18T06:00:00Z",
      thresholds: DEFAULT_THRESHOLDS.so2,
    },
    {
      sensorId: "b",
      type: "no2",
      unit: "µg/m³",
      value: 45, // warning for no2 (warning=25, critical=120)
      takenAt: "2026-04-18T06:00:00Z",
      thresholds: DEFAULT_THRESHOLDS.no2,
    },
    {
      sensorId: "c",
      type: "pm25",
      unit: "µg/m³",
      value: 90, // critical for pm25 (critical=55)
      takenAt: "2026-04-18T06:00:00Z",
      thresholds: DEFAULT_THRESHOLDS.pm25,
    },
  ];
  assertEq(computeSeverity(readings), "critical");
});

test("computeSeverity: empty list returns ok", () => {
  assertEq(computeSeverity([]), "ok");
});

// ───────────────────────── assignTopics ────────────────────────────────

const gabesHome: LonLat = [10.1098, 33.9189];
const gabesSchool: LonLat = [10.1054, 33.9121];

const zones: Zone[] = [
  {
    id: "1",
    slug: "chatt-essalam",
    name: "Chatt Essalam",
    kind: "school",
    centroid: [10.1054, 33.9121], // directly on school
  },
  {
    id: "2",
    slug: "ghannouch",
    name: "Ghannouch",
    kind: "residential",
    centroid: [10.1098, 33.9189], // directly on home
  },
  {
    id: "3",
    slug: "port-far",
    name: "Port de Gabès",
    kind: "coastal",
    centroid: [10.105, 33.89], // ~3 km south
  },
  {
    id: "4",
    slug: "industrial",
    name: "Zone industrielle",
    kind: "industrial", // disallowed kind
    centroid: [10.11, 33.93],
  },
  {
    id: "5",
    slug: "far-zone",
    name: "Djerba",
    kind: "coastal",
    centroid: [10.85, 33.81], // >50 km
  },
];

test("assignTopics: deterministic, closest-first, includes general + excludes industrial", () => {
  const out = assignTopics(gabesHome, gabesSchool, zones, {
    maxZones: 3,
    prefix: "nafas-gabes",
  });
  // general first
  assertEq(out[0], "nafas-gabes-general");
  // then the two on-top-of anchors
  assert(out.includes("nafas-gabes-zone-chatt-essalam"), "school zone missing");
  assert(out.includes("nafas-gabes-zone-ghannouch"), "home zone missing");
  // industrial is filtered out
  assert(
    !out.includes("nafas-gabes-zone-industrial"),
    "industrial zone should be filtered",
  );
  // far zone (>5km) is filtered out
  assert(
    !out.includes("nafas-gabes-zone-far-zone"),
    "far zone should be filtered",
  );
});

test("assignTopics: returns only general when no locations set", () => {
  const out = assignTopics(null, null, zones, { prefix: "nafas-gabes" });
  assertEq(out, ["nafas-gabes-general"]);
});

test("sanitizeSlug: strips diacritics and special chars", () => {
  assertEq(sanitizeSlug("Chatt Essalâm / école"), "chatt-essalam-ecole");
  assertEq(sanitizeSlug("--A--B--"), "a-b");
});

test("topicForZone: builds expected topic string", () => {
  assertEq(
    topicForZone(
      {
        id: "x",
        slug: "chatt-essalam",
        name: "x",
        kind: "school",
        centroid: [0, 0],
      },
      "nafas-gabes",
    ),
    "nafas-gabes-zone-chatt-essalam",
  );
});

// ───────────────────────── routeRecommender ────────────────────────────

const sensorGood: Sensor = {
  id: "s-good",
  type: "so2",
  unit: "µg/m³",
  location: [10.12, 33.95], // far from route
  thresholds: DEFAULT_THRESHOLDS.so2,
};

const sensorOnPrimary: Sensor = {
  id: "s-bad",
  type: "so2",
  unit: "µg/m³",
  // mid-point of home→school — sits right on the primary polyline.
  location: [
    (gabesHome[0] + gabesSchool[0]) / 2,
    (gabesHome[1] + gabesSchool[1]) / 2,
  ],
  thresholds: DEFAULT_THRESHOLDS.so2,
};

function reading(sensor: Sensor, value: number): Reading {
  return {
    sensorId: sensor.id,
    type: sensor.type,
    unit: sensor.unit,
    value,
    takenAt: "2026-04-18T06:00:00Z",
    thresholds: sensor.thresholds,
  };
}

test("recommendRoute: recommends detour when primary has high exposure", () => {
  // Spike the sensor that sits on the primary route.
  const sensors = [sensorOnPrimary, sensorGood];
  const readings = [reading(sensorOnPrimary, 180), reading(sensorGood, 5)];
  const r = recommendRoute(gabesHome, gabesSchool, sensors, readings);
  assert(
    r.alternative.exposureIndex <= r.primary.exposureIndex,
    `alternative exposure (${r.alternative.exposureIndex}) should be <= primary (${r.primary.exposureIndex})`,
  );
  assert(
    r.recommendation === "evite_rue_nord" ||
      r.recommendation === "reste_interieur",
    `unexpected recommendation: ${r.recommendation}`,
  );
});

test("recommendRoute: 'trajet_normal' when air is clean", () => {
  const sensors = [sensorOnPrimary, sensorGood];
  const readings = [reading(sensorOnPrimary, 3), reading(sensorGood, 2)];
  const r = recommendRoute(gabesHome, gabesSchool, sensors, readings);
  assertEq(r.recommendation, "trajet_normal");
});

// ───────────────────────── runner ──────────────────────────────────────

export function runDawaTests(): { passed: number; failed: number } {
  let passed = 0;
  let failed = 0;
  for (const c of cases) {
    try {
      c.fn();
      passed++;
      // eslint-disable-next-line no-console
      console.log(`PASS  ${c.name}`);
    } catch (err) {
      failed++;
      // eslint-disable-next-line no-console
      console.error(`FAIL  ${c.name}`);
      // eslint-disable-next-line no-console
      console.error(`      ${(err as Error).message}`);
    }
  }
  // eslint-disable-next-line no-console
  console.log(`\n${passed} passed, ${failed} failed`);
  return { passed, failed };
}

if (
  typeof process !== "undefined" &&
  process.argv &&
  process.argv[1] &&
  /severity\.test\.ts$/.test(process.argv[1])
) {
  const r = runDawaTests();
  if (r.failed > 0) process.exit(1);
}
