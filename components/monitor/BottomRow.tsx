"use client";

import { NewsPanel } from "./NewsPanel";
import { SensorsPanel } from "./SensorsPanel";
import { AiInsightsPanel } from "./AiInsightsPanel";

/**
 * BottomRow — three-panel dock: News · Sensors · AI Insights.
 * Fixed 288px strip pinned to bottom, above map, below any modals.
 */
export function BottomRow() {
  return (
    <section
      className="absolute bottom-0 left-0 right-0 h-72 z-30 flex bg-[color:var(--nafas-bg)]/95 backdrop-blur-xl border-t border-white/10"
      aria-label="Terminal strip"
    >
      <div className="flex-[2] p-4 overflow-hidden border-r border-white/[0.06]">
        <NewsPanel />
      </div>
      <div className="flex-[2] p-4 overflow-hidden border-r border-white/[0.06]">
        <SensorsPanel />
      </div>
      <div className="flex-[3] p-4 overflow-hidden">
        <AiInsightsPanel />
      </div>
    </section>
  );
}
