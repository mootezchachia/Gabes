"use client";

import { StatStrip } from "./StatStrip";
import { LayerToggle } from "./LayerToggle";
import { AminaSpotlight } from "./AminaSpotlight";

export function LeftSidebar() {
  return (
    <aside
      className="sidebar-scroll absolute top-12 left-0 bottom-72 w-[280px] z-30 overflow-y-auto border-r border-white/10 bg-[color:var(--nafas-bg2)]/70 backdrop-blur-xl"
      aria-label="Panneau latéral — Golfe de Gabès"
    >
      <style jsx>{`
        .sidebar-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .sidebar-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .sidebar-scroll::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.08);
          border-radius: 2px;
        }
        .sidebar-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.16);
        }
        .sidebar-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(255, 255, 255, 0.08) transparent;
        }
      `}</style>

      <div className="flex flex-col gap-6 p-5">
        {/* Header */}
        <header className="flex flex-col gap-1.5">
          <h2 className="font-[family-name:var(--font-fraunces)] text-[20px] font-light italic leading-none text-[color:var(--nafas-surface)]">
            Golfe de Gabès
          </h2>
          <div className="font-[family-name:var(--font-jetbrains)] text-[10.5px] uppercase tracking-[0.22em] text-[color:var(--nafas-ink3)]">
            · zone critique · 42 capteurs
          </div>
        </header>

        <StatStrip />

        <div className="h-px w-full bg-white/5" />

        <section className="flex flex-col gap-3">
          <div className="font-[family-name:var(--font-jetbrains)] text-[10px] uppercase tracking-widest text-[color:var(--nafas-ink3)]">
            Couches
          </div>
          <LayerToggle />
        </section>

        <div className="h-px w-full bg-white/5" />

        <section className="flex flex-col gap-3">
          <div className="font-[family-name:var(--font-jetbrains)] text-[10px] uppercase tracking-widest text-[color:var(--nafas-ink3)]">
            Spotlight
          </div>
          <AminaSpotlight />
        </section>

        <footer className="mt-2 flex flex-col gap-1 pt-4 font-[family-name:var(--font-jetbrains)] text-[10px] leading-[1.5] text-[color:var(--nafas-ink3)]/70">
          <div className="uppercase tracking-wider">
            Sources — Sentinel-5P · OpenAQ · Nawaat · FTDES
          </div>
          <div className="tracking-wider">Elie · CC BY-NC</div>
        </footer>
      </div>
    </aside>
  );
}
