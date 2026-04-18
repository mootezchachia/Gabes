// @ts-nocheck — Deno edge function
/**
 * Edge-function-local mirror of lib/sim/reaction_diffusion.ts and
 * lib/sim/coefficients.ts. Keep in sync by hand.
 */

export const CALIBRATION_VERSION = "2026-04-18.1";

export const CALIBRATION = {
  p_uptake_kg_ha_yr: 45,
  algae_K: 1.0,
  algae_r_mo: 0.22,
  pollution_decay_by_algae_mo: 0.12,
  pollution_decay_bg_mo: 0.03,
  pollution_inflow_mo: 0.18,
  pollution_K: 1.0,
  posidonia_recovery_yr: 0.035,
  posidonia_pollution_threshold: 0.3,
  posidonia_decay_yr: 0.08,
  posidonia_baseline_cover: 0.35,
  posidonia_K: 0.85,
  chlorophyll_baseline_mg_m3: 0.8,
  chlorophyll_per_algae: 1.6,
  chlorophyll_per_pollution: 0.5,
  chlorophyll_K: 12,
  fish_baseline: 0.22,
  fish_per_posidonia: 0.7,
  fish_per_pollution: 0.4,
  diffusion_pollution_mo: 0.05,
  diffusion_algae_mo: 0.02,
  diffusion_chlorophyll_mo: 0.03,
  grid_size: 40,
  cell_side_m: 50,
  dt_months: 1,
};

export interface ForecastInput {
  location: { lon: number; lat: number };
  area_m2: number;
  horizon_years: number;
  coefficients?: Partial<typeof CALIBRATION>;
}

export interface YearProjection {
  year: number;
  p_removed_kg: number;
  posidonia_cover_pct: number;
  chlorophyll_mg_m3: number;
  fish_index: number;
  pollution_auc: number;
}

type Cell = {
  pollution: number; algae: number; posidonia: number; chlorophyll: number; fish: number;
};

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

function makeGrid(size: number, coef: typeof CALIBRATION): Cell[][] {
  const g: Cell[][] = [];
  for (let i = 0; i < size; i++) {
    const row: Cell[] = [];
    for (let j = 0; j < size; j++) {
      row.push({
        pollution: 0, algae: 0,
        posidonia: coef.posidonia_baseline_cover,
        chlorophyll: coef.chlorophyll_baseline_mg_m3,
        fish: coef.fish_baseline,
      });
    }
    g.push(row);
  }
  return g;
}

function inflowMask(size: number): boolean[][] {
  const m: boolean[][] = [];
  for (let i = 0; i < size; i++) {
    const row: boolean[] = [];
    for (let j = 0; j < size; j++) {
      row.push(i < size * 0.2 && j < size * 0.6);
    }
    m.push(row);
  }
  return m;
}

function placePanel(grid: Cell[][], size: number, areaM2: number) {
  const cx = Math.floor(size / 2);
  const cy = Math.floor(size / 2);
  const r = Math.max(1, Math.ceil(Math.sqrt(areaM2) / 100));
  for (let di = -r; di <= r; di++) {
    for (let dj = -r; dj <= r; dj++) {
      const i = cx + di;
      const j = cy + dj;
      if (i < 0 || j < 0 || i >= size || j >= size) continue;
      const d = Math.sqrt(di * di + dj * dj);
      if (d > r) continue;
      grid[i][j].algae = Math.max(0, Math.min(1, 1 - d / (r + 0.5)));
    }
  }
}

function laplacian(g: Cell[][], n: number, key: keyof Cell): number[][] {
  const out: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row: number[] = [];
    for (let j = 0; j < n; j++) {
      const c = g[i][j][key];
      const nn = g[Math.max(i - 1, 0)][j][key];
      const ss = g[Math.min(i + 1, n - 1)][j][key];
      const ww = g[i][Math.max(j - 1, 0)][key];
      const ee = g[i][Math.min(j + 1, n - 1)][key];
      row.push(nn + ss + ww + ee - 4 * c);
    }
    out.push(row);
  }
  return out;
}

function aggregate(grid: Cell[][]): Cell {
  let n = 0;
  const s: Cell = { pollution: 0, algae: 0, posidonia: 0, chlorophyll: 0, fish: 0 };
  for (const row of grid) for (const c of row) {
    s.pollution += c.pollution; s.algae += c.algae;
    s.posidonia += c.posidonia; s.chlorophyll += c.chlorophyll;
    s.fish += c.fish; n++;
  }
  return { pollution: s.pollution / n, algae: s.algae / n, posidonia: s.posidonia / n, chlorophyll: s.chlorophyll / n, fish: s.fish / n };
}

const r2 = (v: number) => Math.round(v * 100) / 100;

export function runForecast(input: ForecastInput): {
  projections: YearProjection[];
  assumptions: Record<string, unknown>;
} {
  const coef = { ...CALIBRATION, ...input.coefficients };
  const size = coef.grid_size;
  const dtMo = coef.dt_months;
  const stepsPerYear = Math.round(12 / dtMo);
  const totalSteps = Math.max(1, input.horizon_years * stepsPerYear);

  const grid = makeGrid(size, coef);
  const mask = inflowMask(size);
  placePanel(grid, size, input.area_m2);

  const cellAreaM2 = coef.cell_side_m * coef.cell_side_m;
  const pUptakePerM2PerMo = coef.p_uptake_kg_ha_yr / 10000 / 12;

  const projections: YearProjection[] = [];
  let pRemovedCumKg = 0;
  let pollutionAucYear = 0;

  for (let step = 0; step < totalSteps; step++) {
    const lapP = laplacian(grid, size, "pollution");
    const lapA = laplacian(grid, size, "algae");
    const lapC = laplacian(grid, size, "chlorophyll");
    let stepPRemoved = 0;
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const c = grid[i][j];
        const inflow = mask[i][j] ? coef.pollution_inflow_mo : 0;
        const upt = coef.pollution_decay_by_algae_mo * c.algae * c.pollution;
        const bg = coef.pollution_decay_bg_mo * c.pollution;
        let pNew = c.pollution + inflow - upt - bg + coef.diffusion_pollution_mo * lapP[i][j];
        pNew = clamp(pNew, 0, coef.pollution_K);
        let aNew = c.algae + coef.algae_r_mo * c.algae * (1 - c.algae / coef.algae_K) * dtMo + coef.diffusion_algae_mo * lapA[i][j];
        aNew -= 0.02 * Math.max(0, c.pollution - 0.5);
        aNew = clamp(aNew, 0, coef.algae_K);
        let posNew = c.posidonia;
        if (c.pollution <= coef.posidonia_pollution_threshold) {
          posNew += coef.posidonia_recovery_yr * (dtMo / 12) * (1 - c.posidonia / coef.posidonia_K);
        } else {
          posNew -= coef.posidonia_decay_yr * (dtMo / 12) * ((c.pollution - coef.posidonia_pollution_threshold) / (coef.pollution_K - coef.posidonia_pollution_threshold));
        }
        posNew = clamp(posNew, 0, coef.posidonia_K);
        let chlNew = coef.chlorophyll_baseline_mg_m3 + coef.chlorophyll_per_algae * c.algae + coef.chlorophyll_per_pollution * c.pollution + coef.diffusion_chlorophyll_mo * lapC[i][j];
        chlNew = clamp(chlNew, 0, coef.chlorophyll_K);
        let fishNew = coef.fish_baseline + coef.fish_per_posidonia * posNew - coef.fish_per_pollution * c.pollution;
        fishNew = clamp(fishNew, 0, 1);

        stepPRemoved += upt * cellAreaM2 * pUptakePerM2PerMo * 100;
        pollutionAucYear += c.pollution;
        grid[i][j] = { pollution: pNew, algae: aNew, posidonia: posNew, chlorophyll: chlNew, fish: fishNew };
      }
    }
    pRemovedCumKg += stepPRemoved;
    if ((step + 1) % stepsPerYear === 0) {
      const year = Math.floor((step + 1) / stepsPerYear);
      const agg = aggregate(grid);
      projections.push({
        year, p_removed_kg: r2(pRemovedCumKg),
        posidonia_cover_pct: r2(agg.posidonia * 100),
        chlorophyll_mg_m3: r2(agg.chlorophyll),
        fish_index: r2(agg.fish),
        pollution_auc: r2(pollutionAucYear / (size * size * stepsPerYear)),
      });
      pollutionAucYear = 0;
    }
  }
  return {
    projections,
    assumptions: {
      calibration_version: CALIBRATION_VERSION,
      grid_size: size,
      cell_side_m: coef.cell_side_m,
      dt_months: dtMo,
      area_m2: input.area_m2,
      horizon_years: input.horizon_years,
    },
  };
}
