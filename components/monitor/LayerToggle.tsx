"use client";

import { useMonitor, type LayerFlags } from "@/lib/monitor/store";
import { Check } from "lucide-react";

type LayerKey = keyof LayerFlags;
type DotTone = "danger" | "amber" | "cyan" | "accent" | "blue" | "surface";

type LayerRow = {
  key: LayerKey;
  label: string;
  tone: DotTone;
  count: string;
};

const LAYERS: LayerRow[] = [
  { key: "plume", label: "Plume SO₂ TROPOMI", tone: "amber", count: "36j" },
  { key: "emitters", label: "Émetteurs industriels", tone: "danger", count: "71" },
  { key: "sensors", label: "Capteurs NAFAS", tone: "cyan", count: "42" },
  { key: "incidents", label: "Incidents", tone: "danger", count: "38" },
  { key: "infra", label: "Écoles & hôpitaux", tone: "blue", count: "147" },
  { key: "wind", label: "Vent dominant", tone: "surface", count: "mean" },
];

const DOT_BG: Record<DotTone, string> = {
  danger: "bg-[color:var(--nafas-danger)]",
  amber: "bg-[color:var(--nafas-amber)]",
  cyan: "bg-[color:var(--nafas-cyan)]",
  accent: "bg-[color:var(--nafas-accent2)]",
  blue: "bg-[color:var(--nafas-blue)]",
  surface: "bg-[color:var(--nafas-surface)]",
};

const DOT_GLOW: Record<DotTone, string> = {
  danger: "shadow-[0_0_8px_rgba(226,75,74,0.6)]",
  amber: "shadow-[0_0_8px_rgba(239,159,39,0.6)]",
  cyan: "shadow-[0_0_8px_rgba(62,201,208,0.6)]",
  accent: "shadow-[0_0_8px_rgba(62,201,154,0.6)]",
  blue: "shadow-[0_0_8px_rgba(55,138,221,0.6)]",
  surface: "shadow-[0_0_8px_rgba(247,246,242,0.3)]",
};

export function LayerToggle() {
  const activeLayers = useMonitor((s) => s.activeLayers);
  const toggleLayer = useMonitor((s) => s.toggleLayer);

  return (
    <ul className="flex flex-col gap-0.5 -mx-1">
      {LAYERS.map((layer) => {
        const on = activeLayers[layer.key];
        return (
          <li key={layer.key}>
            <button
              type="button"
              onClick={() => toggleLayer(layer.key)}
              aria-pressed={on}
              className={[
                "group relative flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors cursor-pointer",
                on
                  ? "bg-white/[0.03] before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[2px] before:rounded-full before:bg-[color:var(--nafas-accent2)]"
                  : "hover:bg-white/5",
              ].join(" ")}
            >
              {/* toggle box */}
              <span
                className={[
                  "grid size-[14px] shrink-0 place-items-center rounded-[3px] border transition-colors",
                  on
                    ? "border-[color:var(--nafas-accent2)] bg-[color:var(--nafas-accent2)]"
                    : "border-white/20 bg-transparent group-hover:border-white/40",
                ].join(" ")}
              >
                {on && <Check className="size-[10px] text-black" strokeWidth={3.5} />}
              </span>

              {/* color dot */}
              <span
                className={[
                  "size-1.5 shrink-0 rounded-full transition-opacity",
                  DOT_BG[layer.tone],
                  on ? DOT_GLOW[layer.tone] : "opacity-60",
                ].join(" ")}
              />

              {/* label */}
              <span
                className={[
                  "flex-1 truncate text-[13px] transition-colors",
                  on
                    ? "text-[color:var(--nafas-surface)]"
                    : "text-[color:var(--nafas-surface)]/75 group-hover:text-[color:var(--nafas-surface)]",
                ].join(" ")}
              >
                {layer.label}
              </span>

              {/* count */}
              <span className="font-[family-name:var(--font-jetbrains)] text-[10px] tabular-nums text-[color:var(--nafas-ink3)]">
                {layer.count}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
