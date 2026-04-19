"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { TacticalAudienceRail } from "./TacticalAudienceRail";
import { TacticalAIScan } from "./TacticalAIScan";
import { TacticalLayers } from "./TacticalLayers";
import { TacticalLegend } from "./TacticalLegend";
import { TacticalAtmosphere } from "./TacticalAtmosphere";
import { TacticalTools } from "./TacticalTools";
import { WaterQualityPanel } from "./WaterQualityPanel";

/* Each tactical component uses `h-full` designed for MovablePanel frames.
   Override to `h-auto` so they stack naturally in a sidebar column. */
const SECTION = "[&>div]:!h-auto [&>div]:w-full border-b border-white/[0.06]";

export function Tac3DSidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className="absolute top-0 left-0 bottom-0 z-40 flex flex-col transition-all duration-300"
      style={{
        width: collapsed ? "32px" : "256px",
        background: "color-mix(in srgb, #06090D 82%, transparent)",
        backdropFilter: "blur(18px) saturate(1.1)",
        borderRight: "1px solid rgba(255,255,255,0.07)",
      }}
      aria-label="HUD — Golfe de Gabès"
    >
      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="absolute -right-[13px] top-16 z-50 grid size-6 place-items-center rounded-full border border-white/10 text-[color:var(--nafas-ink3)] hover:text-[color:var(--nafas-surface)] transition-colors cursor-pointer"
        style={{ background: "#06090D" }}
        aria-label={collapsed ? "Ouvrir le HUD" : "Réduire le HUD"}
      >
        {collapsed ? <ChevronRight className="size-3" /> : <ChevronLeft className="size-3" />}
      </button>

      {/* Collapsed strip */}
      {collapsed && (
        <div className="flex flex-col items-center pt-20">
          <span
            className="tac-label text-[7.5px] tracking-[0.35em] opacity-35"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            HUD · NAFAS
          </span>
        </div>
      )}

      {/* Expanded content */}
      {!collapsed && (
        <div className="flex flex-col flex-1 overflow-y-auto pt-12 scrollbar-thin">
          <div className={SECTION}><TacticalAudienceRail /></div>
          <div className={SECTION}><TacticalAIScan /></div>
          <div className={SECTION}><TacticalLayers /></div>
          <div className={SECTION}><TacticalLegend /></div>
          <div className={SECTION}><TacticalAtmosphere /></div>
          <div className={SECTION}><WaterQualityPanel /></div>
          <div className="[&>div]:!h-auto [&>div]:w-full"><TacticalTools /></div>
        </div>
      )}
    </aside>
  );
}
