"use client";

import { FastForward } from "lucide-react";
import { useSim } from "@/lib/sim/store";

export function SkipButton() {
  const beat = useSim((s) => s.beat);
  const setSkipped = useSim((s) => s.setSkipped);
  if (beat === "sandbox") return null;
  return (
    <button
      onClick={() => setSkipped(true)}
      className="absolute top-5 right-20 z-30 inline-flex items-center gap-2 h-10 px-4 rounded-full bg-black/45 hover:bg-black/70 backdrop-blur-md border border-white/10 text-[11.5px] font-[family-name:var(--font-jetbrains)] tracking-wider uppercase text-[color:var(--nafas-ink3)] hover:text-[color:var(--nafas-surface)] transition-colors"
      title="Passer le tour"
    >
      <FastForward className="size-3.5" strokeWidth={1.5} />
      Passer
    </button>
  );
}
