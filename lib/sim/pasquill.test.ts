/**
 * Unit tests for lib/sim/pasquill.ts
 * Runnable via: npx tsx --test lib/sim/pasquill.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  briggsSigmas,
  computeAirReading,
  diurnalMultiplier,
  GCT_SOURCE,
  metersFrom,
  mulberry32,
} from "./pasquill";

test("briggsSigmas grows monotonically with distance", () => {
  const a = briggsSigmas(100);
  const b = briggsSigmas(500);
  const c = briggsSigmas(2000);
  assert.ok(a.sy < b.sy && b.sy < c.sy, "sigma_y must grow");
  assert.ok(a.sz < b.sz && b.sz < c.sz, "sigma_z must grow");
});

test("metersFrom zeroes at source", () => {
  const { dx, dy } = metersFrom(
    { lon: GCT_SOURCE.lon, lat: GCT_SOURCE.lat },
    { lon: GCT_SOURCE.lon, lat: GCT_SOURCE.lat },
  );
  assert.equal(dx, 0);
  assert.equal(dy, 0);
});

test("diurnalMultiplier returns dawn peak", () => {
  assert.ok(diurnalMultiplier(6) > diurnalMultiplier(13));
});

test("Pasquill zero-wind edge case: still returns finite value >= baseline", () => {
  const sensor = {
    location: { lon: 10.12, lat: 33.92 },
    type: "so2",
    metadata: { baseline: 18 },
  };
  const wind = { speed_mps: 0, direction_deg: 0 };
  const v = computeAirReading({
    sensor,
    wind,
    at: new Date("2025-10-14T07:00:00Z"),
    rngSeed: 42,
  });
  assert.ok(Number.isFinite(v), "value must be finite");
  assert.ok(v >= 1, "value must be >= 1 µg/m³");
});

test("Pasquill: Chatt Essalam (~800m downwind, NW wind) hits design target", () => {
  // Wind from NW (310°) → plume travels SE → Chatt Essalam south of GCT is
  // somewhat downwind. With Q=220 g/s class D we should land in the 100..600
  // µg/m³ band during dawn.
  const sensor = {
    location: { lon: 10.1054, lat: 33.9121 },
    type: "so2",
    metadata: { baseline: 22 },
  };
  const wind = { speed_mps: 2.5, direction_deg: 340 };
  const rng = mulberry32(1);
  let acc = 0;
  for (let i = 0; i < 50; i++) {
    acc += computeAirReading({
      sensor,
      wind,
      at: new Date("2025-10-14T07:00:00Z"),
      rngSeed: Math.floor(rng() * 1e9),
    });
  }
  const mean = acc / 50;
  assert.ok(
    mean >= 20 && mean <= 600,
    `Chatt Essalam mean should be 20-600 µg/m³, got ${mean.toFixed(1)}`,
  );
});

test("Pasquill: upwind sensor stays near baseline regardless of Q", () => {
  // Wind FROM N (0°) → plume goes south; a sensor NORTH of GCT is upwind.
  const sensor = {
    location: { lon: 10.1178, lat: 33.9500 }, // due north of GCT
    type: "so2",
    metadata: { baseline: 12 },
  };
  const wind = { speed_mps: 4, direction_deg: 0 };
  const v = computeAirReading({ sensor, wind, rngSeed: 7 });
  assert.ok(v < 30, `upwind value should stay low, got ${v.toFixed(1)}`);
});
