/**
 * Derived impact metrics for a single vegetal-panel placement on a Gabès
 * building. Back-of-envelope first-year effects — not a forecast; those live
 * in `ai_forecast`.
 *
 * Domain: green facades / green roofs installed on schools, hospitals,
 * housing blocks and public buildings in Gabès city, to reduce air pollution
 * exposure near the GCT phosphate complex and mitigate urban heat islands.
 *
 * Ship-side invariant: if the LLM is unavailable, these numbers alone should
 * convey value. Rationale text is icing, not cake.
 */

export interface Components {
  /** air exposure — proximity + downwind of the GCT plume (0..1). */
  ae?: number;
  /** building surface available for panels, normalized (0..1). */
  bs?: number;
  /** daily occupants / people served, normalized (0..1). */
  po?: number;
  /** vulnerability by building type — schools/hospitals > housing > office (0..1). */
  vu?: number;
  /** urban heat-island severity, normalized (0..1). */
  hi?: number;
  /** greenery gap (1 − NDVI) — low existing greenery = high need (0..1). */
  gr?: number;
}

export type Strategy = "air_quality" | "vulnerable_pop" | "heat_resilience";

export interface DerivedImpact {
  /** effective vegetal surface installed (m²). */
  surface_m2: number;
  /** CO₂ absorbed year 1 (kg). */
  co2_kg_yr: number;
  /** NOx captured year 1 (g). */
  nox_g_yr: number;
  /** PM2.5 trapped year 1 (g). */
  pm25_g_yr: number;
  /** daily occupants benefiting (k persons). */
  occupants_k: number;
  /** local ambient temperature reduction (°C). */
  thermal_c: number;
  /** capex estimate (k€). */
  capex_keur: number;
  /** two dominant drivers of the score, sorted. */
  drivers: Array<{ key: keyof Components; label: string; value: number }>;
}

/** Per-m² vegetal-facade annual effects (green-facade literature mid-range). */
const CO2_KG_PER_M2_YR = 2.0;
const NOX_G_PER_M2_YR = 5.0;
const PM25_G_PER_M2_YR = 1.8;
const COST_EUR_PER_M2 = 250;

/** Fraction of the building's available surface actually covered by panels. */
const PANEL_COVERAGE = 0.35;

const CRIT_LABEL: Record<keyof Components, string> = {
  ae: "Exposition pollution GCT",
  bs: "Surface bâtiment disponible",
  po: "Occupants desservis",
  vu: "Vulnérabilité (école/hôpital)",
  hi: "Îlot de chaleur urbain",
  gr: "Manque de végétal existant",
};

const STRATEGY_TUNING: Record<
  Strategy,
  { co2Mult: number; noxMult: number; pm25Mult: number; occMult: number; thermalMult: number; capexMult: number }
> = {
  air_quality:     { co2Mult: 1.25, noxMult: 1.35, pm25Mult: 1.25, occMult: 1.0,  thermalMult: 0.9,  capexMult: 1.0 },
  vulnerable_pop:  { co2Mult: 1.0,  noxMult: 1.1,  pm25Mult: 1.1,  occMult: 1.35, thermalMult: 0.85, capexMult: 1.1 },
  heat_resilience: { co2Mult: 0.85, noxMult: 0.85, pm25Mult: 0.85, occMult: 0.9,  thermalMult: 1.5,  capexMult: 0.95 },
};

/**
 * Back-of-envelope first-year effects of installing vegetal panels on a
 * scored building. Deterministic given (comps, strategy, surface_m2).
 */
export function deriveImpact(
  comps: Components,
  strategy: Strategy,
  /** Raw building surface available (m²) — if unknown, falls back to `bs` × 4000. */
  surfaceM2Raw?: number,
): DerivedImpact {
  const t = STRATEGY_TUNING[strategy] ?? STRATEGY_TUNING.air_quality;

  const rawSurface = surfaceM2Raw ?? (comps.bs ?? 0) * 4000;
  const effective_m2 = Math.max(0, rawSurface * PANEL_COVERAGE);

  // Exposure amplifies absorption (plume-facing facades filter more polluted air).
  const exposureBoost = 1 + 0.35 * (comps.ae ?? 0);

  const co2_kg_yr  = CO2_KG_PER_M2_YR  * effective_m2 * exposureBoost * t.co2Mult;
  const nox_g_yr   = NOX_G_PER_M2_YR   * effective_m2 * exposureBoost * t.noxMult;
  const pm25_g_yr  = PM25_G_PER_M2_YR  * effective_m2 * exposureBoost * t.pm25Mult;

  // Occupants served: po * 3k max per building * strategy tuning
  const occupants_k = Math.round((comps.po ?? 0) * 3 * t.occMult * 10) / 10;

  // Thermal reduction: vegetal facade cools up to ~2°C; scaled by building
  // coverage (bs) and heat-island severity (hi), then the strategy tuning.
  const thermal_c =
    Math.min(2.2, 2 * (comps.bs ?? 0) * (0.4 + 0.6 * (comps.hi ?? 0))) * t.thermalMult;

  const capex_keur = Math.round((effective_m2 * COST_EUR_PER_M2 * t.capexMult) / 1000);

  // Top-2 drivers
  const entries = (Object.entries(comps) as Array<[keyof Components, number | undefined]>)
    .filter(([, v]) => typeof v === "number")
    .map(([k, v]) => ({ key: k, label: CRIT_LABEL[k] ?? k, value: v ?? 0 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 2);

  return {
    surface_m2: Math.round(effective_m2),
    co2_kg_yr: Math.round(co2_kg_yr),
    nox_g_yr: Math.round(nox_g_yr),
    pm25_g_yr: Math.round(pm25_g_yr),
    occupants_k,
    thermal_c: Math.round(thermal_c * 10) / 10,
    capex_keur,
    drivers: entries,
  };
}

export const COMPONENT_LABEL: Record<string, string> = CRIT_LABEL;
