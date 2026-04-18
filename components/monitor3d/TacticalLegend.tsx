"use client";

interface Row {
  code: string;
  label: string;
  range: string;
  tone: "danger" | "amber" | "cyan" | "accent";
}

const ROWS: Row[] = [
  { code: "CRIT", label: "Alerte", range: "> 200", tone: "danger" },
  { code: "HIGH", label: "Élevé", range: "100-200", tone: "amber" },
  { code: "MOD",  label: "Surveillance", range: "40-100", tone: "cyan" },
  { code: "BASE", label: "Base", range: "< 40", tone: "accent" },
];

const DOT: Record<Row["tone"], string> = {
  danger: "tac-dot tac-dot--danger",
  amber: "tac-dot tac-dot--amber",
  cyan: "tac-dot tac-dot--cyan",
  accent: "tac-dot tac-dot--accent",
};

export function TacticalLegend() {
  return (
    <div className="tac-panel absolute top-[372px] right-4 z-40 w-[208px] p-3">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.07]">
        <span className="tac-bracket">Sévérité</span>
        <span className="tac-label text-[8px] text-[color:var(--nafas-ink3)]/60">
          µg/m³ · SO₂
        </span>
      </div>

      <ul className="space-y-1.5">
        {ROWS.map((r) => (
          <li key={r.code} className="flex items-center gap-2.5">
            <span className={DOT[r.tone]} />
            <span
              className="tac-label text-[8.5px] tracking-[0.22em]"
              style={{
                color:
                  r.tone === "danger"
                    ? "var(--nafas-danger)"
                    : r.tone === "amber"
                      ? "var(--nafas-amber)"
                      : r.tone === "cyan"
                        ? "var(--nafas-cyan)"
                        : "var(--nafas-accent2)",
              }}
            >
              {r.code}
            </span>
            <span className="text-[10.5px] text-[color:var(--nafas-surface)]/85 flex-1 font-[family-name:var(--font-inter)]">
              {r.label}
            </span>
            <span className="tac-readout text-[9.5px] text-[color:var(--nafas-ink3)]">
              {r.range}
            </span>
          </li>
        ))}
      </ul>

      <div className="tac-divider-h my-2" />

      <div className="text-[8.5px] leading-[1.5] text-[color:var(--nafas-ink3)]/65 tracking-wide">
        Seuil OMS · 40 µg/m³ · <span className="text-[color:var(--nafas-amber)]">dépassement permanent à GCT</span>
      </div>
    </div>
  );
}
