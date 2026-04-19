"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { StatStrip } from "./StatStrip";
import { LayerToggle } from "./LayerToggle";
import { AminaSpotlight } from "./AminaSpotlight";
import { WaterQualityMonitor } from "./WaterQualityMonitor";

const LEGEND_ITEMS = [
  { label: "Alerte",       color: "var(--nafas-danger)", note: "SO₂ > 200 µg/m³" },
  { label: "Élevé",        color: "var(--nafas-amber)",  note: "100 — 200" },
  { label: "Surveillance", color: "var(--nafas-cyan)",   note: "< 100" },
  { label: "Base",         color: "var(--nafas-accent)", note: "calibration" },
];

const SECTION = "font-[family-name:var(--font-jetbrains)] text-[10px] uppercase tracking-widest text-[color:var(--nafas-ink3)]";

export function LeftSidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className="sidebar-scroll absolute top-12 left-0 bottom-0 z-30 flex flex-col border-r border-white/10 bg-[color:var(--nafas-bg2)]/75 backdrop-blur-xl transition-all duration-300"
      style={{ width: collapsed ? "40px" : "280px" }}
      aria-label="Panneau latéral — Golfe de Gabès"
    >
      <style jsx>{`
        .sidebar-scroll { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.08) transparent; }
        .sidebar-scroll::-webkit-scrollbar { width: 4px; }
        .sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
        .sidebar-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
      `}</style>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="absolute -right-3 top-6 z-50 grid size-6 place-items-center rounded-full border border-white/10 bg-[color:var(--nafas-bg2)] text-[color:var(--nafas-ink3)] hover:text-[color:var(--nafas-surface)] transition-colors"
        aria-label={collapsed ? "Ouvrir le panneau" : "Réduire le panneau"}
      >
        {collapsed ? <ChevronRight className="size-3" /> : <ChevronLeft className="size-3" />}
      </button>

      {/* Collapsed state — just a thin strip */}
      {collapsed && (
        <div className="flex flex-col items-center gap-5 pt-8 px-2 text-[color:var(--nafas-ink3)]">
          <span
            className="font-[family-name:var(--font-jetbrains)] text-[8px] uppercase tracking-[0.3em] [writing-mode:vertical-rl] rotate-180 opacity-40"
          >
            Golfe de Gabès
          </span>
        </div>
      )}

      {/* Expanded state */}
      {!collapsed && (
        <div className="flex flex-col gap-5 p-5 overflow-y-auto flex-1">
          {/* Header */}
          <header className="flex flex-col gap-1.5">
            <h2 className="font-[family-name:var(--font-fraunces)] text-[20px] font-light italic leading-none text-[color:var(--nafas-surface)]">
              Golfe de Gabès
            </h2>
            <div className="font-[family-name:var(--font-jetbrains)] text-[10.5px] uppercase tracking-[0.22em] text-[color:var(--nafas-ink3)]">
              · zone critique · 42 capteurs
            </div>
          </header>

          <div className="h-px w-full bg-white/5" />

          {/* Stats */}
          <section className="flex flex-col gap-3">
            <div className={SECTION}>Métriques</div>
            <StatStrip />
          </section>

          <div className="h-px w-full bg-white/5" />

          {/* Severity legend */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className={SECTION}>Sévérité SO₂</span>
              <span className="font-[family-name:var(--font-jetbrains)] text-[9px] tracking-[0.16em] uppercase text-[color:var(--nafas-ink3)]/50">µg/m³</span>
            </div>
            <div className="flex flex-col gap-2">
              {LEGEND_ITEMS.map((item) => (
                <div key={item.label} className="flex items-center gap-2.5">
                  <span
                    className="inline-block size-[8px] shrink-0 rounded-full"
                    style={{
                      backgroundColor: item.color,
                      boxShadow: `0 0 8px -1px ${item.color}`,
                    }}
                  />
                  <span className="text-[11.5px] text-[color:var(--nafas-surface)]" style={{ fontWeight: 500 }}>
                    {item.label}
                  </span>
                  <span className="ml-auto font-[family-name:var(--font-jetbrains)] text-[9.5px] tracking-[0.12em] uppercase text-[color:var(--nafas-ink3)]/65">
                    {item.note}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <div className="h-px w-full bg-white/5" />

          {/* Layers */}
          <section className="flex flex-col gap-3">
            <div className={SECTION}>Couches</div>
            <LayerToggle />
          </section>

          <div className="h-px w-full bg-white/5" />

          {/* Water Quality AI */}
          <section className="flex flex-col gap-3">
            <div className={SECTION}>Qualité eau · IA</div>
            <WaterQualityMonitor />
          </section>

          <div className="h-px w-full bg-white/5" />

          {/* Amina spotlight */}
          <section className="flex flex-col gap-3">
            <div className={SECTION}>Spotlight</div>
            <AminaSpotlight />
          </section>

          {/* Footer */}
          <footer className="mt-auto pt-4 flex flex-col gap-1 font-[family-name:var(--font-jetbrains)] text-[10px] leading-[1.5] text-[color:var(--nafas-ink3)]/60">
            <div className="uppercase tracking-wider">Sentinel-5P · OpenAQ · Nawaat · FTDES</div>
            <div className="tracking-wider">Données simulées · CC BY-NC</div>
          </footer>
        </div>
      )}
    </aside>
  );
}
