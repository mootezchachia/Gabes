"use client";

import { useEffect, useState } from "react";
import type { Strategy } from "@/lib/sim/impact";

interface RunInfo {
  run_id: string;
  strategy: string;
  candidates: number;
  picked: number;
}

export interface Aggregate {
  total_surface_m2: number;
  total_co2_kg: number;
  total_nox_g: number;
  total_occupants_k: number;
  total_capex: number;
  avg_thermal_c: number;
  avg_score: number;
}

const STRAT_LEAD: Record<Strategy, { headline: (a: Aggregate, n: number) => string; tone: string }> = {
  air_quality: {
    headline: (a, n) => {
      const tons = a.total_co2_kg / 1000;
      return `${n} bâtiments. ${tons >= 1 ? tons.toFixed(1) + " t" : Math.round(a.total_co2_kg) + " kg"} de CO₂ absorbés par an.`;
    },
    tone: "#EF9F27",
  },
  vulnerable_pop: {
    headline: (a, n) =>
      `${n} bâtiments. ${a.total_occupants_k.toFixed(1)} k occupants vulnérables mieux protégés.`,
    tone: "#E24B4A",
  },
  heat_resilience: {
    headline: (a, n) =>
      `${n} bâtiments. −${a.avg_thermal_c.toFixed(1)} °C en moyenne sur les îlots de chaleur.`,
    tone: "#3EC99A",
  },
};

/**
 * ORACLE run verdict.
 *
 * Structure:
 *  1. Eyebrow (run-active · N/M retenus).
 *  2. Fraunces italic headline (strategy-specific, count-up on total metric).
 *  3. Tight supporting stats row in JetBrains Mono (4 tiles).
 *
 * All numbers come from the parent's `aggregate` memo — no impact derivation
 * here — so the card list and the summary stay deterministic against the same
 * {components, runStrategy} pair.
 */
export function PlacementRunSummary({
  run,
  strategy,
  aggregate,
  running,
}: {
  run: RunInfo;
  strategy: Strategy;
  aggregate: Aggregate;
  running: boolean;
}) {
  const lead = STRAT_LEAD[strategy] ?? STRAT_LEAD.air_quality;

  // Count-up for the headline number. Plays once per aggregate signature.
  const sig = `${aggregate.total_co2_kg.toFixed(1)}|${aggregate.total_occupants_k.toFixed(1)}|${aggregate.avg_thermal_c.toFixed(2)}`;
  const [shown, setShown] = useState(aggregate);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const from: Aggregate = { ...shown };
    const dur = 700;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / dur);
      const e = 1 - Math.pow(1 - k, 3); // ease-out-cubic
      setShown({
        total_surface_m2: Math.round(from.total_surface_m2 + (aggregate.total_surface_m2 - from.total_surface_m2) * e),
        total_co2_kg: from.total_co2_kg + (aggregate.total_co2_kg - from.total_co2_kg) * e,
        total_nox_g: from.total_nox_g + (aggregate.total_nox_g - from.total_nox_g) * e,
        total_occupants_k: from.total_occupants_k + (aggregate.total_occupants_k - from.total_occupants_k) * e,
        total_capex: Math.round(from.total_capex + (aggregate.total_capex - from.total_capex) * e),
        avg_thermal_c: from.avg_thermal_c + (aggregate.avg_thermal_c - from.avg_thermal_c) * e,
        avg_score: from.avg_score + (aggregate.avg_score - from.avg_score) * e,
      });
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  return (
    <div className="relative rounded-lg border border-white/10 overflow-hidden">
      {/* left accent rail (strategy tint) */}
      <div
        aria-hidden
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{ background: `linear-gradient(180deg, ${lead.tone}, transparent 92%)` }}
      />

      {/* atmosphere */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 70% 80% at 0% 0%, ${lead.tone}18, transparent 60%), linear-gradient(180deg, rgba(255,255,255,0.02), transparent 90%)`,
        }}
      />

      <div className="relative p-4 pl-5 space-y-3">
        {/* eyebrow */}
        <div className="flex items-center gap-2">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full rounded-full bg-[color:var(--nafas-accent2)] opacity-75 animate-ping" />
            <span className="relative inline-flex size-1.5 rounded-full bg-[color:var(--nafas-accent2)]" />
          </span>
          <span className="text-[10px] tracking-[0.24em] uppercase font-[family-name:var(--font-jetbrains)] text-[color:var(--nafas-accent2)]">
            ORACLE · {running ? "analyse en cours" : "run terminé"}
          </span>
          <span className="ml-auto text-[10px] tracking-[0.14em] uppercase font-[family-name:var(--font-jetbrains)] text-[color:var(--nafas-ink3)] tabular-nums">
            {run.candidates} candidats → {run.picked} retenus
          </span>
        </div>

        {/* headline */}
        <h3 className="font-[family-name:var(--font-fraunces)] italic font-light text-[clamp(24px,3.2vw,30px)] leading-[1.08] tracking-[-0.015em] text-[color:var(--nafas-surface)] max-w-[32ch]">
          {lead.headline(shown, run.picked)}
        </h3>

        {/* supporting stats */}
        <div className="grid grid-cols-4 gap-px bg-white/5 rounded-md overflow-hidden border border-white/5">
          <Stat label="Score moyen" value={(shown.avg_score * 100).toFixed(0)} unit="/100" />
          <Stat label="Surface végétale" value={shown.total_surface_m2.toString()} unit="m²" />
          <Stat label="Occupants" value={shown.total_occupants_k.toFixed(1)} unit="k" />
          <Stat label="Capex" value={shown.total_capex.toString()} unit="k€" />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="p-2.5 bg-[color:var(--nafas-bg2)]">
      <div className="flex items-baseline gap-1">
        <span className="text-[20px] leading-none font-[family-name:var(--font-fraunces)] tracking-tight tabular-nums text-[color:var(--nafas-surface)]">
          {value}
        </span>
        {unit ? (
          <span className="text-[10px] font-[family-name:var(--font-jetbrains)] tracking-normal text-[color:var(--nafas-ink3)]">
            {unit}
          </span>
        ) : null}
      </div>
      <div className="text-[9px] tracking-[0.14em] uppercase font-[family-name:var(--font-jetbrains)] text-[color:var(--nafas-ink3)] leading-tight mt-1">
        {label}
      </div>
    </div>
  );
}
