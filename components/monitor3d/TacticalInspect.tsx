"use client";

import { X } from "lucide-react";
import { useMonitor } from "@/lib/monitor/store";
import { formatDMS } from "@/lib/monitor3d/useCesiumCamera";

const SEV: Record<string, { code: string; label: string; color: string }> = {
  high:   { code: "CRIT", label: "Alerte",        color: "var(--nafas-danger)" },
  medium: { code: "HIGH", label: "Élevé",         color: "var(--nafas-amber)" },
  low:    { code: "MOD",  label: "Surveillance",  color: "var(--nafas-cyan)" },
};

/** Right-side inspect card — shown when a sensor or GCT is clicked. */
export function TacticalInspect() {
  const event = useMonitor((s) => s.selectedEvent);
  const clear = useMonitor((s) => s.setSelectedEvent);
  if (!event) {
    return (
      <div className="tac-panel w-full h-full p-3 overflow-auto flex flex-col items-center justify-center gap-2 text-center">
        <div className="font-[family-name:var(--font-jetbrains)] text-[10px] tracking-[0.28em] uppercase text-[color:var(--nafas-ink3)]/70">
          Inspection
        </div>
        <div className="font-[family-name:var(--font-fraunces)] italic text-[14px] text-[color:var(--nafas-ink3)]">
          Aucun événement sélectionné.
        </div>
        <div className="font-[family-name:var(--font-jetbrains)] text-[9.5px] tracking-[0.22em] uppercase text-[color:var(--nafas-ink3)]/60">
          Clic sur un capteur ou une source
        </div>
      </div>
    );
  }
  const sev = SEV[event.severity] ?? SEV.medium;

  return (
    <div
      className="tac-panel w-full h-full p-3 overflow-auto"
      data-tone={event.severity === "high" ? "danger" : event.severity === "medium" ? "amber" : undefined}
    >
      <div className="flex items-start justify-between pb-2 border-b border-white/[0.07]">
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="tac-label text-[8.5px] tracking-[0.26em]"
              style={{ color: sev.color }}
            >
              ▣ {sev.code} · {sev.label}
            </span>
          </div>
          <div className="text-[12.5px] font-medium text-[color:var(--nafas-surface)] leading-tight truncate">
            {event.title}
          </div>
        </div>
        <button
          type="button"
          onClick={() => clear(null)}
          aria-label="Fermer"
          className="size-[22px] grid place-items-center text-[color:var(--nafas-ink3)] hover:text-[color:var(--nafas-surface)] hover:bg-white/5 cursor-pointer transition-colors"
        >
          <X className="size-[12px]" strokeWidth={1.8} />
        </button>
      </div>

      <div className="py-2 space-y-1">
        <div className="flex items-baseline gap-2">
          <span className="tac-label w-10 shrink-0 text-[8px] text-[color:var(--nafas-ink3)]/70 tracking-[0.3em]">
            LAT
          </span>
          <span className="tac-readout text-[10px] text-[color:var(--nafas-surface)] truncate">
            {formatDMS(event.lat, "lat")}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="tac-label w-10 shrink-0 text-[8px] text-[color:var(--nafas-ink3)]/70 tracking-[0.3em]">
            LON
          </span>
          <span className="tac-readout text-[10px] text-[color:var(--nafas-surface)] truncate">
            {formatDMS(event.lon, "lon")}
          </span>
        </div>
      </div>

      <div className="tac-divider-h my-2" />

      <p className="text-[12px] leading-[1.5] text-[color:var(--nafas-surface)]/85 font-[family-name:var(--font-inter)]">
        {event.body}
      </p>

      <div className="mt-3 flex items-center justify-between">
        <span className="tac-label text-[7.5px] text-[color:var(--nafas-ink3)]/60">
          {new Date(event.date).toISOString().slice(0, 16).replace("T", " ")}Z
        </span>
        <span className="tac-label text-[8px] text-[color:var(--nafas-accent2)]">
          Télémétrie · live
        </span>
      </div>
    </div>
  );
}
