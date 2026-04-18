"use client";

type Item = { label: string; color: string };

const ITEMS: Item[] = [
  { label: "Alerte", color: "var(--nafas-danger)" },
  { label: "Élevé", color: "var(--nafas-amber)" },
  { label: "Surveillance", color: "var(--nafas-cyan)" },
  { label: "Base", color: "var(--nafas-accent)" },
  { label: "Nucléaire", color: "#7F77DD" },
  { label: "Aéroport", color: "var(--nafas-blue)" },
];

const MONO =
  "var(--font-jetbrains), ui-monospace, SFMono-Regular, Menlo, monospace";

export function Legend() {
  return (
    <div
      role="list"
      aria-label="Légende des catégories"
      className="absolute top-16 right-[356px] z-30 flex items-center gap-[14px] rounded-full border border-white/10 bg-black/40 px-[14px] py-[6px] shadow-[0_10px_30px_-16px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.03)_inset] backdrop-blur-xl"
    >
      <span
        style={{ fontFamily: MONO }}
        aria-hidden
        className="border-r border-white/10 pr-[12px] text-[9px] uppercase tracking-[0.24em] text-[color:var(--nafas-ink3)]/70"
      >
        Légende
      </span>
      {ITEMS.map((item) => (
        <div
          key={item.label}
          role="listitem"
          className="flex items-center gap-[6px]"
        >
          <span
            aria-hidden
            className="inline-block size-[7px] shrink-0 rounded-full"
            style={{
              backgroundColor: item.color,
              boxShadow: `0 0 8px -2px ${item.color}`,
            }}
          />
          <span
            style={{ fontFamily: MONO }}
            className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--nafas-ink3)]"
          >
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}
