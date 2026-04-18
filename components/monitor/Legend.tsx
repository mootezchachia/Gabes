"use client";

type Item = { label: string; color: string; note: string };

const ITEMS: Item[] = [
  { label: "Alerte",        color: "var(--nafas-danger)",  note: "SO₂ > 200 µg/m³" },
  { label: "Élevé",         color: "var(--nafas-amber)",   note: "100 — 200" },
  { label: "Surveillance",  color: "var(--nafas-cyan)",    note: "< 100" },
  { label: "Base",          color: "var(--nafas-accent)",  note: "calibration" },
];

/**
 * Right-edge severity legend. Architectural slab, right-aligned, vertical
 * stack. Each row: accent dot + label + one-line threshold note. Compact;
 * four rows only (dropped Nucléaire/Aéroport — those belong on the Infra
 * toggle, not the severity scale).
 */
export function Legend() {
  return (
    <div
      role="list"
      aria-label="Échelle de sévérité"
      className="absolute bottom-[140px] right-4 z-30 hud-slab px-4 py-3 flex flex-col gap-2 min-w-[192px]"
    >
      <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
        <span className="hud-eyebrow">Sévérité SO₂</span>
        <span className="text-[9px] font-[family-name:var(--font-jetbrains)] tracking-[0.16em] uppercase text-[color:var(--nafas-ink3)]/50">
          µg/m³
        </span>
      </div>

      {ITEMS.map((item) => (
        <div
          key={item.label}
          role="listitem"
          className="flex items-center gap-2.5"
        >
          <span
            aria-hidden
            className="inline-block size-[8px] shrink-0 rounded-full"
            style={{
              backgroundColor: item.color,
              boxShadow: `0 0 10px -1px ${item.color}, inset 0 0 0 1px rgba(255,255,255,0.12)`,
            }}
          />
          <span
            className="text-[11.5px] leading-none text-[color:var(--nafas-surface)] tracking-[0.01em]"
            style={{ fontWeight: 500 }}
          >
            {item.label}
          </span>
          <span className="ml-auto text-[9.5px] font-[family-name:var(--font-jetbrains)] tracking-[0.12em] uppercase text-[color:var(--nafas-ink3)]/65">
            {item.note}
          </span>
        </div>
      ))}
    </div>
  );
}
