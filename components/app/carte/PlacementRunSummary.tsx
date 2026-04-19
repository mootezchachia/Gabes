"use client";

import { useMemo } from "react";
import { deriveImpact, type Components, type Strategy } from "@/lib/sim/impact";

interface RunInfo {
  run_id: string;
  strategy: string;
  candidates: number;
  picked: number;
}

interface PlacementLite {
  score: number;
  components: Components;
}

export function PlacementRunSummary({
  run,
  placements,
  strategy,
}: {
  run: RunInfo;
  placements: PlacementLite[];
  strategy: Strategy;
}) {
  const agg = useMemo(() => {
    const imp = placements.map((p) => deriveImpact(p.components, strategy));
    const total_p = imp.reduce((s, i) => s + i.p_year1_kg, 0);
    const avg_score =
      placements.length > 0
        ? placements.reduce((s, p) => s + p.score, 0) / placements.length
        : 0;
    const total_schools = imp.reduce((s, i) => s + i.schools_sheltered, 0);
    const total_people = imp.reduce((s, i) => s + i.people_reached_k, 0);
    const total_ha = imp.reduce((s, i) => s + i.area_ha, 0);
    const total_capex = imp.reduce((s, i) => s + i.capex_keur, 0);
    return {
      total_p,
      avg_score,
      total_schools,
      total_people,
      total_ha,
      total_capex,
    };
  }, [placements, strategy]);

  return (
    <div className="rounded-lg border border-white/10 bg-gradient-to-br from-[color:var(--nafas-bg2)] to-[color:var(--nafas-bg2)]/50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="relative flex size-1.5">
          <span className="absolute inline-flex size-full rounded-full bg-[color:var(--nafas-accent2)] opacity-75 animate-ping" />
          <span className="relative inline-flex size-1.5 rounded-full bg-[color:var(--nafas-accent2)]" />
        </span>
        <span className="text-[10.5px] tracking-[0.2em] uppercase font-[family-name:var(--font-jetbrains)] text-[color:var(--nafas-cyan)]">
          ORACLE · run actif
        </span>
        <span className="ml-auto text-[10px] tracking-[0.14em] uppercase font-[family-name:var(--font-jetbrains)] text-[color:var(--nafas-ink3)] tabular-nums">
          {run.candidates} candidats → {run.picked} retenus
        </span>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-6 gap-px bg-white/5 rounded-md overflow-hidden">
        <SummaryTile value={agg.total_p.toFixed(1)} unit="kg/an" label="Phosphate total" />
        <SummaryTile value={(agg.avg_score * 100).toFixed(0)} unit="/100" label="Score moyen" />
        <SummaryTile value={agg.total_schools.toString()} unit="" label="Écoles cumulées" />
        <SummaryTile value={agg.total_people.toFixed(1)} unit="k" label="Habitants" />
        <SummaryTile value={(agg.total_ha * 10).toFixed(1)} unit="·100m²" label="Surface totale" />
        <SummaryTile value={agg.total_capex.toString()} unit="k€" label="Capex estimé" />
      </div>
    </div>
  );
}

function SummaryTile({ value, unit, label }: { value: string; unit: string; label: string }) {
  return (
    <div className="p-2.5 bg-[color:var(--nafas-bg2)]">
      <div className="text-[20px] leading-none font-[family-name:var(--font-fraunces)] tabular-nums mb-1 text-[color:var(--nafas-surface)]">
        {value}
        {unit ? (
          <span className="text-[10px] font-[family-name:var(--font-jetbrains)] tracking-normal opacity-70 ml-1">
            {unit}
          </span>
        ) : null}
      </div>
      <div className="text-[9px] tracking-[0.12em] uppercase font-[family-name:var(--font-jetbrains)] text-[color:var(--nafas-ink3)] leading-tight">
        {label}
      </div>
    </div>
  );
}
