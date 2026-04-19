/**
 * Derived impact metrics for a single placement, computed from the score
 * components + strategy, calibrated against lib/sim/coefficients.ts.
 *
 * These numbers are NOT predictions (that's ai_forecast's job). They are
 * back-of-envelope expected first-year effects used in the placement card
 * so the UI can show "what this zone does" before the user commits to a
 * full 10-year forecast. Conservative: every multiplier is ≤ 1.
 *
 * Ship-side invariant: if the LLM is unavailable, these numbers alone
 * should convey value. The rationale text is icing, not cake.
 */

import { CALIBRATION } from "./coefficients";

export interface Components {
  ps?: number; // phosphate proximity (0..1)
  df?: number; // depth fit (0..1)
  mo?: number; // marine posidonia value (0..1)
  sl?: number; // salinity / shoreline (0..1)
  sd?: number; // school / downwind (0..1)
  pp?: number; // people / population density (0..1)
}

export type Strategy =
  | "phosphate_recovery"
  | "school_protection"
  | "biodiversity";

export interface DerivedImpact {
  /** kg of phosphate removed during year 1 */
  p_year1_kg: number;
  /** expected posidonia cover recovery (percentage points, year 1) */
  posidonia_gain_pp: number;
  /** schools within the zone's protection cone (rough, 0..6) */
  schools_sheltered: number;
  /** people benefiting from reduced SO₂ exposure (k persons) */
  people_reached_k: number;
  /** area of this panel in hectares */
  area_ha: number;
  /** capex estimate in k€ (rule of thumb) */
  capex_keur: number;
  /** two dominant drivers of the score, sorted */
  drivers: Array<{ key: keyof Components; label: string; value: number }>;
}

const AREA_M2 = 500; // matches edge function: proposed_area_m2
const AREA_HA = AREA_M2 / 10_000;

const CRIT_LABEL: Record<string, string> = {
  ps: "Proximité rejet GCT",
  df: "Compatibilité bathymétrique",
  mo: "Valeur biodiversité (Posidonia)",
  sl: "Salinité / dilution littorale",
  sd: "Écoles sous le vent",
  pp: "Population desservie",
};

const STRATEGY_TUNING: Record<
  Strategy,
  { pMult: number; posMult: number; schoolMult: number; peopleMult: number; capexMult: number }
> = {
  phosphate_recovery: { pMult: 1.35, posMult: 0.7, schoolMult: 0.5, peopleMult: 1.1, capexMult: 1.0 },
  school_protection: { pMult: 0.9, posMult: 0.5, schoolMult: 1.6, peopleMult: 1.3, capexMult: 1.1 },
  biodiversity: { pMult: 0.85, posMult: 1.5, schoolMult: 0.4, peopleMult: 0.8, capexMult: 0.95 },
};

/**
 * Back-of-envelope first-year effects from the deterministic scorer.
 * No LLM involved; no randomness; deterministic given (comps, strategy).
 */
export function deriveImpact(
  comps: Components,
  strategy: Strategy,
): DerivedImpact {
  const t = STRATEGY_TUNING[strategy] ?? STRATEGY_TUNING.phosphate_recovery;

  // kg P/year = (theoretical max from calibration) × (ps + df weighted)
  // CALIBRATION.p_uptake_kg_ha_yr = 45, area = 500 m² = 0.05 ha
  // cap at ~90% of theoretical to stay honest.
  const pEfficiency = 0.35 + 0.5 * (comps.ps ?? 0) + 0.2 * (comps.df ?? 0);
  const p_year1_kg =
    CALIBRATION.p_uptake_kg_ha_yr * AREA_HA * Math.min(0.9, pEfficiency) * t.pMult;

  // Posidonia gain (percentage points) = recovery rate × mo × (1 - pollution)
  // CALIBRATION.posidonia_recovery_yr = 0.035 = 3.5% cover/year under ideal
  const posidonia_gain_pp =
    CALIBRATION.posidonia_recovery_yr * 100 * (comps.mo ?? 0) * t.posMult;

  // Schools sheltered: sd value × 6 (max reasonable zones in cone) × strategy tuning
  const schools_sheltered = Math.round((comps.sd ?? 0) * 6 * t.schoolMult);

  // People reached: pp × 18k (max per zone, Ghannouch radius) × strategy tuning
  const people_reached_k = Math.round((comps.pp ?? 0) * 18 * t.peopleMult * 10) / 10;

  // Capex rule of thumb: 8 k€ per panel (500 m²), adjusted by strategy
  const capex_keur = Math.round(8 * t.capexMult);

  // Top-2 drivers
  const entries = (Object.entries(comps) as Array<[keyof Components, number | undefined]>)
    .filter(([, v]) => typeof v === "number")
    .map(([k, v]) => ({ key: k, label: CRIT_LABEL[k as string] ?? (k as string), value: v ?? 0 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 2);

  return {
    p_year1_kg: Math.round(p_year1_kg * 10) / 10,
    posidonia_gain_pp: Math.round(posidonia_gain_pp * 100) / 100,
    schools_sheltered,
    people_reached_k,
    area_ha: AREA_HA,
    capex_keur,
    drivers: entries,
  };
}

export const COMPONENT_LABEL = CRIT_LABEL;
