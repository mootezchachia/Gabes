/**
 * Unit tests for lib/sim/reaction_diffusion.ts
 * Runnable via: npx tsx --test lib/sim/reaction_diffusion.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { runForecast } from "./reaction_diffusion";

test("reaction-diffusion stability over 10-year horizon (120 steps)", () => {
  const out = runForecast({
    location: { lon: 10.12, lat: 33.91 },
    area_m2: 1000,
    horizon_years: 10,
  });
  assert.equal(out.projections.length, 10, "expected 10 yearly rows");
  for (const p of out.projections) {
    assert.ok(Number.isFinite(p.p_removed_kg), "p_removed_kg must be finite");
    assert.ok(p.posidonia_cover_pct >= 0 && p.posidonia_cover_pct <= 100);
    assert.ok(p.chlorophyll_mg_m3 >= 0 && p.chlorophyll_mg_m3 <= 12);
    assert.ok(p.fish_index >= 0 && p.fish_index <= 1);
  }
});

test("reaction-diffusion: larger panel removes more P cumulatively", () => {
  const small = runForecast({
    location: { lon: 10.12, lat: 33.91 },
    area_m2: 300,
    horizon_years: 5,
  });
  const big = runForecast({
    location: { lon: 10.12, lat: 33.91 },
    area_m2: 5000,
    horizon_years: 5,
  });
  const smallY5 = small.projections.at(-1)!.p_removed_kg;
  const bigY5 = big.projections.at(-1)!.p_removed_kg;
  assert.ok(bigY5 >= smallY5, `big (${bigY5}) >= small (${smallY5})`);
});

test("reaction-diffusion monotone P accumulation", () => {
  const out = runForecast({
    location: { lon: 10.12, lat: 33.91 },
    area_m2: 800,
    horizon_years: 5,
  });
  let prev = -1;
  for (const p of out.projections) {
    assert.ok(p.p_removed_kg >= prev, "cumulative kg must not decrease");
    prev = p.p_removed_kg;
  }
});
