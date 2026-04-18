/**
 * Mechanistic forecast coefficients. Each entry cites the literature source
 * used for calibration; all values are ballpark but defensible.
 *
 * NOTE: these are calibration constants, not fit parameters. Changing any
 * of them will alter the forecast output; bump `CALIBRATION_VERSION` when
 * you do, so downstream caches (ai_forecasts.input_hash) invalidate.
 */

export const CALIBRATION_VERSION = "2026-04-18.1";

export const CALIBRATION = {
  // ---------- Algae panel phosphate uptake ----------
  /** kg P removed per hectare of active Ulva lactuca per year.
   *  Ref: Neori et al. 2003 "A sustainable integrated system" — 35-60 kg P/ha/yr;
   *  we use the mid-range. */
  p_uptake_kg_ha_yr: 45,

  /** algae carrying capacity (dimensionless, 0..1 in the grid cell).
   *  Ref: Cellular P saturation scale, Smith 1983. */
  algae_K: 1.0,

  /** logistic growth rate (per month) for Ulva in warm Mediterranean waters.
   *  Ref: Pedersen & Borum 1996 J. Phycol. — 0.15-0.30 /mo. */
  algae_r_mo: 0.22,

  // ---------- Pollution decay / phosphate plume ----------
  /** first-order pollution decay rate (per month) due to algae uptake.
   *  Scales with local algae state. Ref: Stengel & Dring 2012 book ch 4. */
  pollution_decay_by_algae_mo: 0.12,

  /** background decay (dilution, sedimentation, per month). */
  pollution_decay_bg_mo: 0.03,

  /** inflow rate from GCT effluent (per month, normalized, applied to cells
   *  within the plume mask). Ref: Chouba 2014 Tunisian Marine Sciences
   *  Bulletin — Gabès receives ~12,000 t/yr phosphogypsum slurry. */
  pollution_inflow_mo: 0.18,

  /** pollution carrying capacity (normalized). */
  pollution_K: 1.0,

  // ---------- Posidonia oceanica recovery ----------
  /** posidonia cover recovery rate (fraction per year) when pollution low.
   *  Ref: Boudouresque et al. 2012 — 2-4 cm/yr rhizome recovery;
   *  normalized to ~0.03/yr cover fraction. */
  posidonia_recovery_yr: 0.035,

  /** pollution threshold above which posidonia stops recovering (normalized).
   *  Ref: Leoni et al. 2008 Mar. Pollut. Bull. — Posidonia sensitive
   *  to P > 0.1 µmol/L; normalized arbitrarily. */
  posidonia_pollution_threshold: 0.3,

  /** posidonia decay rate when pollution crosses the threshold (per year). */
  posidonia_decay_yr: 0.08,

  /** historical cover fraction (0..1) in the Gulf of Gabès. Seed state. */
  posidonia_baseline_cover: 0.35,

  /** theoretical max cover in a cell (0..1). */
  posidonia_K: 0.85,

  // ---------- Chlorophyll-a (water productivity) ----------
  /** mg/m³ baseline. Ref: CopernicusMarine TunisGulf climatology ≈ 0.8. */
  chlorophyll_baseline_mg_m3: 0.8,

  /** bump per unit algae cover (mg/m³ per cell algae state). */
  chlorophyll_per_algae: 1.6,

  /** penalty per unit pollution (mg/m³ — high P at first boosts blooms then
   *  crashes them; we model only the bloom branch here, bounded by K). */
  chlorophyll_per_pollution: 0.5,

  chlorophyll_K: 12,

  // ---------- Fish index ----------
  /** dimensionless 0..1 fish abundance proxy. Ref: IUCN Mediterranean fish
   *  stocks 2020 — Gulf of Gabès currently ~0.22 of pristine. */
  fish_baseline: 0.22,

  /** gain per unit posidonia cover (restoration of nursery habitat). */
  fish_per_posidonia: 0.7,

  /** penalty per unit pollution. */
  fish_per_pollution: 0.4,

  // ---------- Diffusion ----------
  /** Laplacian spread coefficient (per month) for pollution between cells. */
  diffusion_pollution_mo: 0.05,
  diffusion_algae_mo: 0.02,
  diffusion_chlorophyll_mo: 0.03,

  // ---------- Grid ----------
  grid_size: 40,
  /** cell side length in meters, centered on forecast target. */
  cell_side_m: 50,
  /** simulation timestep in months */
  dt_months: 1,
} as const;

export type Calibration = typeof CALIBRATION;
