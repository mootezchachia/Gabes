"use client";

import { useMonitor, type LayerFlags } from "@/lib/monitor/store";

type Tone = "danger" | "amber" | "cyan" | "accent";

interface LayerRow {
  key: keyof LayerFlags;
  code: string;
  label: string;
  count: string;
  tone: Tone;
}

const LAYERS: LayerRow[] = [
  { key: "aiScan", code: "AI", label: "ORACLE · scan actif", count: "5 zones", tone: "amber" },
  { key: "plume", code: "SO₂-V", label: "Plume volumétrique", count: "340 µg", tone: "danger" },
  { key: "emitters", code: "EMT", label: "Sources industrielles", count: "1", tone: "amber" },
  { key: "sensors", code: "CAP", label: "Réseau 42 capteurs", count: "42/42", tone: "cyan" },
  { key: "labels", code: "TXT", label: "Légendes & lieux", count: "30+", tone: "accent" },
  { key: "wind", code: "VNT", label: "Vent + dérive plume", count: "14 km/h", tone: "accent" },
  { key: "incidents", code: "EVT", label: "Incidents historiques", count: "38", tone: "danger" },
  { key: "infra", code: "INF", label: "Écoles · Hôpitaux", count: "147", tone: "cyan" },
];

const DOT_CLASS: Record<Tone, string> = {
  danger: "tac-dot tac-dot--danger",
  amber: "tac-dot tac-dot--amber",
  cyan: "tac-dot tac-dot--cyan",
  accent: "tac-dot tac-dot--accent",
};

/**
 * Bottom-left tactical layers deck. Toggling a row flips the shared monitor
 * store — CesiumScene subscribes and shows/hides the corresponding entities.
 */
export function TacticalLayers() {
  const active = useMonitor((s) => s.activeLayers);
  const toggle = useMonitor((s) => s.toggleLayer);

  return (
    <div className="tac-panel absolute bottom-4 left-4 z-40 w-[300px]">
      <div className="flex items-center justify-between px-3 pt-2.5 pb-2 border-b border-white/[0.07]">
        <span className="tac-bracket">Couches</span>
        <span className="tac-label text-[8.5px] text-[color:var(--nafas-ink3)]/70">
          {Object.values(active).filter(Boolean).length}/{LAYERS.length} on
        </span>
      </div>

      <ul className="py-1">
        {LAYERS.map((row) => {
          const on = active[row.key];
          return (
            <li key={row.key}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => toggle(row.key)}
                className="group relative flex w-full items-center gap-2.5 px-3 py-2 text-left cursor-pointer transition-colors hover:bg-white/[0.035]"
              >
                {/* left indicator stripe */}
                <span
                  aria-hidden
                  className="absolute left-0 top-1.5 bottom-1.5 w-[2px] transition-colors"
                  style={{
                    background: on
                      ? row.tone === "danger"
                        ? "var(--nafas-danger)"
                        : row.tone === "amber"
                          ? "var(--nafas-amber)"
                          : row.tone === "cyan"
                            ? "var(--nafas-cyan)"
                            : "var(--nafas-accent2)"
                      : "transparent",
                    boxShadow: on
                      ? row.tone === "danger"
                        ? "0 0 8px rgba(226,75,74,0.6)"
                        : row.tone === "amber"
                          ? "0 0 8px rgba(239,159,39,0.6)"
                          : row.tone === "cyan"
                            ? "0 0 8px rgba(62,201,208,0.6)"
                            : "0 0 8px rgba(62,201,154,0.6)"
                      : "none",
                  }}
                />

                {/* toggle box */}
                <span
                  className="grid size-[13px] shrink-0 place-items-center border transition-colors"
                  style={{
                    borderColor: on ? "var(--nafas-cyan)" : "rgba(255,255,255,0.2)",
                    background: on ? "var(--nafas-cyan)" : "transparent",
                  }}
                >
                  {on && (
                    <svg
                      viewBox="0 0 12 12"
                      className="size-[9px] text-[color:var(--nafas-bg)]"
                      strokeWidth="2.2"
                      stroke="currentColor"
                      fill="none"
                    >
                      <path d="M2 6 L5 9 L10 3" strokeLinecap="square" />
                    </svg>
                  )}
                </span>

                {/* severity dot */}
                <span className={`${DOT_CLASS[row.tone]} ${on ? "" : "opacity-40"}`} />

                {/* code + label */}
                <span className="flex-1 min-w-0 flex items-baseline gap-2">
                  <span
                    className="tac-label text-[8.5px] tracking-[0.22em] shrink-0"
                    style={{ color: on ? "var(--nafas-surface)" : "var(--nafas-ink3)" }}
                  >
                    {row.code}
                  </span>
                  <span
                    className="text-[11.5px] truncate transition-colors"
                    style={{
                      color: on
                        ? "var(--nafas-surface)"
                        : "color-mix(in srgb, var(--nafas-surface) 55%, transparent)",
                      fontFamily: "var(--font-inter), sans-serif",
                    }}
                  >
                    {row.label}
                  </span>
                </span>

                {/* count */}
                <span className="tac-readout text-[9.5px] text-[color:var(--nafas-ink3)] tabular-nums">
                  {row.count}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="px-3 py-2 border-t border-white/[0.07] flex items-center justify-between">
        <span className="tac-label text-[8px] text-[color:var(--nafas-ink3)]/60">
          Sentinel-5P · Copernicus
        </span>
        <span className="tac-label text-[8px] text-[color:var(--nafas-accent2)]">
          TROPOMI
        </span>
      </div>
    </div>
  );
}
