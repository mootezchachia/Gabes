"use client";

import { RotateCcw, GitCompareArrows } from "lucide-react";
import { useSim } from "@/lib/sim/store";

/**
 * Bottom dock visible only once tour completes (beat === 'sandbox').
 * - Year scrubber 2026 → 2050
 * - Scenario quick-switch (continuation / oracle / custom)
 * - Replay tour button
 */
export function SandboxDock() {
  const beat = useSim((s) => s.beat);
  const year = useSim((s) => s.year);
  const setYear = useSim((s) => s.setYear);
  const scenario = useSim((s) => s.scenario);
  const setScenario = useSim((s) => s.setScenario);
  const setPlume = useSim((s) => s.setPlume);
  const setAlgae = useSim((s) => s.setAlgae);
  const resetTour = useSim((s) => s.resetTour);

  if (beat !== "sandbox") return null;

  const handleScenario = (s: "continuation" | "oracle" | "custom") => {
    setScenario(s);
    if (s === "continuation") {
      setPlume(1.4);
      setAlgae(0);
    } else if (s === "oracle") {
      setPlume(0.22);
      setAlgae(1);
    }
  };

  const handleReplay = () => {
    resetTour();
    // force a page reload of tour — simplest: kick the URL hash so Tour remounts
    window.location.reload();
  };

  // simulator blend for year scrubbing in sandbox (interpolate between now and 2050)
  const onYear = (y: number) => {
    setYear(y);
    const t = Math.max(0, Math.min(1, (y - 2026) / (2050 - 2026)));
    if (scenario === "oracle") {
      setPlume(1 - t * 0.8);
      setAlgae(t);
    } else if (scenario === "continuation") {
      setPlume(1 + t * 0.4);
      setAlgae(0);
    }
  };

  return (
    <div className="absolute left-1/2 -translate-x-1/2 bottom-6 z-30 w-[min(900px,calc(100vw-48px))]">
      <div className="flex flex-col md:flex-row items-stretch gap-3 p-3 rounded-xl bg-[color:var(--nafas-bg2)]/85 backdrop-blur-xl border border-white/10">
        {/* scrubber */}
        <div className="flex-1 px-4 py-3 rounded-lg bg-black/30 border border-white/5">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] font-[family-name:var(--font-jetbrains)] tracking-[0.2em] uppercase text-[color:var(--nafas-ink3)]">
              Année
            </div>
            <div className="text-[13px] font-[family-name:var(--font-fraunces)] italic text-[color:var(--nafas-surface)] tabular-nums">
              {year}
            </div>
          </div>
          <input
            type="range"
            min={2026}
            max={2050}
            step={1}
            value={year}
            onChange={(e) => onYear(Number(e.target.value))}
            className="w-full accent-[color:var(--nafas-accent)]"
          />
        </div>

        {/* scenario */}
        <div className="flex gap-1 p-1 rounded-lg bg-black/30 border border-white/5">
          {(["continuation", "oracle", "custom"] as const).map((s) => (
            <button
              key={s}
              onClick={() => handleScenario(s)}
              className={`px-4 py-2 rounded-md text-[11.5px] font-[family-name:var(--font-jetbrains)] tracking-wider uppercase transition-colors ${
                scenario === s
                  ? "bg-[color:var(--nafas-accent)] text-black"
                  : "text-[color:var(--nafas-ink3)] hover:text-[color:var(--nafas-surface)] hover:bg-white/5"
              }`}
            >
              {s === "continuation" ? "Inaction" : s === "oracle" ? "ORACLE" : "Custom"}
            </button>
          ))}
        </div>

        {/* compare */}
        <button
          disabled
          title="Comparaison côte-à-côte — v2"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-black/30 border border-white/5 text-[11.5px] font-[family-name:var(--font-jetbrains)] tracking-wider uppercase text-[color:var(--nafas-ink3)]/50 cursor-not-allowed"
        >
          <GitCompareArrows className="size-3.5" strokeWidth={1.5} />
          Comparer
        </button>

        {/* replay */}
        <button
          onClick={handleReplay}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11.5px] font-[family-name:var(--font-jetbrains)] tracking-wider uppercase text-[color:var(--nafas-surface)] transition-colors"
        >
          <RotateCcw className="size-3.5" strokeWidth={1.5} />
          Rejouer
        </button>
      </div>
    </div>
  );
}
