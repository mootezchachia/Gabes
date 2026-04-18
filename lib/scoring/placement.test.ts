/**
 * Unit tests for lib/scoring/placement.ts
 * Runnable via: npx tsx --test lib/scoring/placement.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  depthFit,
  farthestPointSelection,
  scoreCandidate,
  shippingLaneScore,
} from "./placement";

test("depthFit peaks in 3-8m band", () => {
  assert.equal(depthFit(0), 0);
  assert.ok(depthFit(5) === 1);
  assert.ok(depthFit(15) === 0);
  assert.ok(depthFit(9) > 0 && depthFit(9) < 1);
});

test("shippingLaneScore saturates at 1", () => {
  assert.equal(shippingLaneScore(0), 0);
  assert.ok(shippingLaneScore(500) === 0.5);
  assert.equal(shippingLaneScore(1000), 1);
  assert.equal(shippingLaneScore(5000), 1);
});

test("scoreCandidate returns values in [0,1] and consistent components", () => {
  const res = scoreCandidate(
    { location: { lon: 10.12, lat: 33.92 }, area_m2: 500 },
    "phosphate_recovery",
    {
      pollution_severity: 0.8,
      depth_m: 5,
      meadow_overlap: 0.3,
      shipping_lane_distance_m: 800,
      school_downwind_coverage: 0.5,
      phosphate_plume_overlap: 0.9,
    },
  );
  assert.ok(res.score >= 0 && res.score <= 1, `score in [0,1], got ${res.score}`);
  for (const [k, v] of Object.entries(res.components)) {
    assert.ok(
      v >= 0 && v <= 1,
      `component ${k} must be in [0,1], got ${v}`,
    );
  }
});

test("scoreCandidate clamps out-of-range inputs", () => {
  const res = scoreCandidate(
    { location: { lon: 10.12, lat: 33.92 }, area_m2: 500 },
    "biodiversity",
    {
      pollution_severity: 2.0, // out of range
      depth_m: 5,
      meadow_overlap: -0.5,
      shipping_lane_distance_m: 10000,
      school_downwind_coverage: 3,
      phosphate_plume_overlap: 0.4,
    },
  );
  assert.equal(res.components.pollution_severity, 1);
  assert.equal(res.components.meadow_overlap, 0);
  assert.equal(res.components.school_downwind, 1);
});

test("farthestPointSelection respects minDistance", () => {
  const ranked = [
    { location: { lon: 10.10, lat: 33.90 }, area_m2: 500 },
    { location: { lon: 10.1001, lat: 33.9001 }, area_m2: 500 }, // ~14m away
    { location: { lon: 10.12, lat: 33.92 }, area_m2: 500 }, // ~2.7km away
    { location: { lon: 10.14, lat: 33.94 }, area_m2: 500 }, // further
  ];
  const chosen = farthestPointSelection(ranked, 3, 500);
  assert.equal(chosen.length, 3);
  // The second (too close) must NOT be the chosen second entry.
  assert.notDeepEqual(chosen[1].location, ranked[1].location);
});

test("STRATEGY_WEIGHTS: school_protection emphasizes downwind more than phosphate_recovery", () => {
  const ctx = {
    pollution_severity: 0.5,
    depth_m: 5,
    meadow_overlap: 0.5,
    shipping_lane_distance_m: 1000,
    school_downwind_coverage: 1.0,
    phosphate_plume_overlap: 0.5,
  };
  const school = scoreCandidate(
    { location: { lon: 10.12, lat: 33.92 }, area_m2: 500 },
    "school_protection",
    ctx,
  );
  const phosph = scoreCandidate(
    { location: { lon: 10.12, lat: 33.92 }, area_m2: 500 },
    "phosphate_recovery",
    ctx,
  );
  assert.ok(
    school.score > phosph.score,
    `school strategy should rank this (max school_downwind) higher: ${school.score} vs ${phosph.score}`,
  );
});
