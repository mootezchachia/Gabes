"use client";

import { Play } from "lucide-react";
import { useSim } from "@/lib/sim/store";

export function DeployButton() {
  const beat = useSim((s) => s.beat);
  const paused = useSim((s) => s.tourPaused);
  const setPaused = useSim((s) => s.setPaused);

  const visible = beat === "b3" && paused;
  if (!visible) return null;

  return (
    <button
      onClick={() => setPaused(false)}
      className="group absolute left-1/2 -translate-x-1/2 bottom-44 z-30 inline-flex items-center gap-3 px-8 py-4 rounded-full bg-[color:var(--nafas-accent)] hover:bg-[color:var(--nafas-accent2)] text-black font-medium text-[15px] shadow-[0_0_60px_rgba(29,158,117,0.45),0_12px_40px_rgba(0,0,0,0.5)] transition-colors"
      style={{ animation: "nafasDeployPulse 2.4s cubic-bezier(0.22, 1, 0.36, 1) infinite" }}
    >
      <Play className="size-4 fill-current" />
      Déployer le plan ORACLE
      <span className="text-[12px] font-[family-name:var(--font-jetbrains)] font-normal opacity-70">→ 2035</span>
      <style jsx>{`
        @keyframes nafasDeployPulse {
          0%, 100% { box-shadow: 0 0 60px rgba(29,158,117,0.45), 0 12px 40px rgba(0,0,0,0.5); }
          50%      { box-shadow: 0 0 80px rgba(62,201,154,0.7),  0 12px 40px rgba(0,0,0,0.5); }
        }
      `}</style>
    </button>
  );
}
