"use client";

import { useEffect, useState } from "react";
import type { Strategy } from "@/lib/sim/impact";

interface RunInfo {
  run_id: string;
  strategy: string;
  candidates: number;
  picked: number;
}

interface Aggregate {
  total_p: number;
  total_schools: number;
  total_people: number;
  total_ha: number;
  total_capex: number;
  avg_score: number;
}

const STRAT_LEAD: Record<Strategy, { headline: (a: Aggregate, n: number) => string; tone: string }> = {
  phosphate_recovery: {
    headline: (a, n) =>
      `${n} zones. ${a.total_p.toFixed(1)} kg de phosphate retirés chaque année.`,
    tone: "#EF9F27",
  },
  school_protection: {
    headline: (a, n) =>
      `${n} zones. ${a.total_schools} école${a.total_schools === 1 ? "" : "s"} sous le vent mieux protégée${a.total_schools === 1 ? "" : "s"}.`,
    tone: "#E24B4A",
  },
  biodiversity: {
    headline: (a, n) =>
      `${n} zones. +${(a.total_ha * 3.5).toFixed(1)} pp de Posidonia la première année.`,
    tone: "#3EC99A",
  },
};

/**
 * ORACLE run verdict.
 *
 * Replaces the old 6-tile stat grid. Structure:
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
  const lead = STRAT_LEAD[strategy] ?? STRAT_LEAD.phosphate_recovery;

  // Count-up for the headline number. Plays once per aggregate signature.
  const sig = `${aggregate.total_p.toFixed(2)}|${aggregate.total_schools}|${aggregate.total_ha.toFixed(2)}`;
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
        total_p: from.total_p + (aggregate.total_p - from.total_p) * e,
        total_schools: Math.round(from.total_schools + (aggregate.total_schools - from.total_schools) * e),
        total_people: from.total_people + (aggregate.total_people - from.total_people) * e,
        total_ha: from.total_ha + (aggregate.total_ha - from.total_ha) * e,
        total_capex: Math.round(from.total_capex + (aggregate.total_capex - from.total_capex) * e),
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
          <Stat label="Écoles couvertes" value={shown.total_schools.toString()} />
          <Stat label="Habitants" value={shown.total_people.toFixed(1)} unit="k" />
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
