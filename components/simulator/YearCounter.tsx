"use client";

import { useSim } from "@/lib/sim/store";

export function YearCounter() {
  const year = useSim((s) => s.year);
  const beat = useSim((s) => s.beat);
  const scenario = useSim((s) => s.scenario);
  const visible = beat === "b4" || beat === "sandbox";

  return (
    <div
      className={`absolute top-5 left-5 z-20 transition-opacity duration-500 ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      <div className="flex items-baseline gap-3">
        <div className="font-[family-name:var(--font-fraunces)] font-light text-[72px] leading-none tracking-tight text-[color:var(--nafas-surface)] tabular-nums">
          {year}
        </div>
        <div className="flex flex-col">
          <div className="text-[10.5px] font-[family-name:var(--font-jetbrains)] tracking-[0.22em] uppercase text-[color:var(--nafas-ink3)]">
            Gabès · scénario
          </div>
          <div className="text-[12px] font-[family-name:var(--font-jetbrains)] tracking-wider uppercase text-[color:var(--nafas-accent2)] mt-1">
            {scenario === "oracle" ? "ORACLE" : scenario === "continuation" ? "Continuation" : "Custom"}
          </div>
        </div>
      </div>
    </div>
  );
}
