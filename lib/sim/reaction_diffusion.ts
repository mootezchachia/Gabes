/**
 * Reaction-diffusion forecast — 40×40 grid, monthly timestep, 10-year
 * horizon by default. Models phosphate pollution + algae panel cover +
 * Posidonia recovery + chlorophyll-a + fish index.
 *
 * Bounded clamps `[0, K]` on every state variable → numerical stability
 * verified in unit tests for 120+ steps.
 *
 * Reference: §8.2 of docs/plans/2026-04-18-nafas-v2-design.md
 */

import { CALIBRATION, type Calibration } from "./coefficients";

export interface ForecastInput {
  location: { lon: number; lat: number };
  area_m2: number;
  horizon_years: number;
  /** optional override of calibration */
  coefficients?: Partial<Calibration>;
}

export interface YearProjection {
  year: number;
  p_removed_kg: number;
  posidonia_cover_pct: number;
  chlorophyll_mg_m3: number;
  fish_index: number;
  pollution_auc: number;
}

export interface ForecastOutput {
  projections: YearProjection[];
  assumptions: {
    calibration_version: string;
    grid_size: number;
    cell_side_m: number;
    dt_months: number;
  };
}

type Cell = {
  pollution: number;
  algae: number;
  posidonia: number;
  chlorophyll: number;
  fish: number;
};

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

function makeGrid(size: number): Cell[][] {
  const g: Cell[][] = [];
  for (let i = 0; i < size; i++) {
    const row: Cell[] = [];
    for (let j = 0; j < size; j++) {
      row.push({
        pollution: 0,
        algae: 0,
        posidonia: CALIBRATION.posidonia_baseline_cover,
        chlorophyll: CALIBRATION.chlorophyll_baseline_mg_m3,
        fish: CALIBRATION.fish_baseline,
      });
    }
    g.push(row);
  }
  return g;
}

/** Seed an inflow mask: cells near the NW edge get pollution inflow. Models
 *  the GCT plume entering from the upwind (north-west) boundary. */
function inflowMask(size: number): boolean[][] {
  const m: boolean[][] = [];
  for (let i = 0; i < size; i++) {
    const row: boolean[] = [];
    for (let j = 0; j < size; j++) {
      // upper-left quarter strip: simulates Ghannouch effluent entering grid
      row.push(i < size * 0.2 && j < size * 0.6);
    }
    m.push(row);
  }
  return m;
}

/** Place algae panel coverage in the grid cell containing the panel center
 *  plus the 8-neighborhood (approximating a ~150m panel footprint at cell=50m). */
function placePanel(
  grid: Cell[][],
  size: number,
  areaM2: number,
): void {
  const cx = Math.floor(size / 2);
  const cy = Math.floor(size / 2);
  // logistic scale: a 500m² panel covers ~1 cell, 5000m² covers ~9 cells
  const radius = Math.max(1, Math.ceil(Math.sqrt(areaM2) / 100));
  for (let di = -radius; di <= radius; di++) {
    for (let dj = -radius; dj <= radius; dj++) {
      const i = cx + di;
      const j = cy + dj;
      if (i < 0 || j < 0 || i >= size || j >= size) continue;
      const dist = Math.sqrt(di * di + dj * dj);
      if (dist > radius) continue;
      const falloff = 1 - dist / (radius + 0.5);
      grid[i][j].algae = clamp(falloff, 0, 1);
    }
  }
}

/** Discrete Laplacian (5-point stencil) with Neumann BC (copy edge). */
function laplacian(grid: Cell[][], size: number, key: keyof Cell): number[][] {
  const lap: number[][] = [];
  for (let i = 0; i < size; i++) {
    const row: number[] = [];
    for (let j = 0; j < size; j++) {
      const c = grid[i][j][key];
      const n = grid[Math.max(i - 1, 0)][j][key];
      const s = grid[Math.min(i + 1, size - 1)][j][key];
      const w = grid[i][Math.max(j - 1, 0)][key];
      const e = grid[i][Math.min(j + 1, size - 1)][key];
      row.push(n + s + w + e - 4 * c);
    }
    lap.push(row);
  }
  return lap;
}

/**
 * runForecast — main entry point. Returns aggregated yearly projections.
 */
export function runForecast(input: ForecastInput): ForecastOutput {
  const coef = { ...CALIBRATION, ...input.coefficients };
  const size = coef.grid_size;
  const dtMo = coef.dt_months;
  const totalSteps = Math.max(1, input.horizon_years * Math.round(12 / dtMo));

  const grid = makeGrid(size);
  const mask = inflowMask(size);
  placePanel(grid, size, input.area_m2);

  const projections: YearProjection[] = [];
  let pRemovedCumKg = 0;
  let pollutionAucYear = 0;

  // cell area in m² (for kg accounting)
  const cellAreaM2 = coef.cell_side_m * coef.cell_side_m;
  // per-step P removal: algae uptake × local algae × cell area → kg
  // uptake_kg_ha_yr → per m² per month
  const pUptakePerM2PerMo = coef.p_uptake_kg_ha_yr / 10000 / 12;

  for (let step = 0; step < totalSteps; step++) {
    const lapP = laplacian(grid, size, "pollution");
    const lapA = laplacian(grid, size, "algae");
    const lapC = laplacian(grid, size, "chlorophyll");

    let yearPAuc = 0;
    let stepPRemovedKg = 0;

    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const c = grid[i][j];
        // --- pollution ---
        const inflow = mask[i][j] ? coef.pollution_inflow_mo : 0;
        const algaeUptake = coef.pollution_decay_by_algae_mo * c.algae * c.pollution;
        const bgDecay = coef.pollution_decay_bg_mo * c.pollution;
        let pNew = c.pollution
          + inflow
          - algaeUptake
          - bgDecay
          + coef.diffusion_pollution_mo * lapP[i][j];
        pNew = clamp(pNew, 0, coef.pollution_K);

        // --- algae ---
        let aNew = c.algae
          + coef.algae_r_mo * c.algae * (1 - c.algae / coef.algae_K) * dtMo
          + coef.diffusion_algae_mo * lapA[i][j];
        // panels slowly erode if pollution smothers them
        aNew -= 0.02 * Math.max(0, c.pollution - 0.5);
        aNew = clamp(aNew, 0, coef.algae_K);

        // --- posidonia ---
        let posNew = c.posidonia;
        if (c.pollution <= coef.posidonia_pollution_threshold) {
          posNew += coef.posidonia_recovery_yr * (dtMo / 12)
            * (1 - c.posidonia / coef.posidonia_K);
        } else {
          posNew -= coef.posidonia_decay_yr * (dtMo / 12)
            * ((c.pollution - coef.posidonia_pollution_threshold) /
              (coef.pollution_K - coef.posidonia_pollution_threshold));
        }
        posNew = clamp(posNew, 0, coef.posidonia_K);

        // --- chlorophyll ---
        let chlNew = coef.chlorophyll_baseline_mg_m3
          + coef.chlorophyll_per_algae * c.algae
          + coef.chlorophyll_per_pollution * c.pollution
          + coef.diffusion_chlorophyll_mo * lapC[i][j];
        chlNew = clamp(chlNew, 0, coef.chlorophyll_K);

        // --- fish ---
        let fishNew = coef.fish_baseline
          + coef.fish_per_posidonia * posNew
          - coef.fish_per_pollution * c.pollution;
        fishNew = clamp(fishNew, 0, 1);

        // --- accounting ---
        stepPRemovedKg += algaeUptake * cellAreaM2 * pUptakePerM2PerMo * 100;
        yearPAuc += c.pollution;

        grid[i][j] = {
          pollution: pNew,
          algae: aNew,
          posidonia: posNew,
          chlorophyll: chlNew,
          fish: fishNew,
        };
      }
    }

    pRemovedCumKg += stepPRemovedKg;
    pollutionAucYear += yearPAuc;

    const stepsPerYear = Math.round(12 / dtMo);
    if ((step + 1) % stepsPerYear === 0) {
      const year = Math.floor((step + 1) / stepsPerYear);
      const agg = aggregateGrid(grid);
      projections.push({
        year,
        p_removed_kg: round2(pRemovedCumKg),
        posidonia_cover_pct: round2(agg.posidonia * 100),
        chlorophyll_mg_m3: round2(agg.chlorophyll),
        fish_index: round2(agg.fish),
        pollution_auc: round2(pollutionAucYear / (size * size * stepsPerYear)),
      });
      pollutionAucYear = 0;
    }
  }

  return {
    projections,
    assumptions: {
      calibration_version: (CALIBRATION as Record<string, unknown>)
        .CALIBRATION_VERSION as string || "2026-04-18.1",
      grid_size: size,
      cell_side_m: coef.cell_side_m,
      dt_months: dtMo,
    },
  };
}

function aggregateGrid(grid: Cell[][]): Cell {
  let n = 0;
  const sum: Cell = { pollution: 0, algae: 0, posidonia: 0, chlorophyll: 0, fish: 0 };
  for (const row of grid) {
    for (const c of row) {
      sum.pollution += c.pollution;
      sum.algae += c.algae;
      sum.posidonia += c.posidonia;
      sum.chlorophyll += c.chlorophyll;
      sum.fish += c.fish;
      n++;
    }
  }
  return {
    pollution: sum.pollution / n,
    algae: sum.algae / n,
    posidonia: sum.posidonia / n,
    chlorophyll: sum.chlorophyll / n,
    fish: sum.fish / n,
  };
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
