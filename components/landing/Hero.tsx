import Link from "next/link";

const STATS = [
  { value: "121", unit: "", label: "enfants hospitalisés · 14 oct 2025", tone: "danger" as const },
  { value: "340", unit: "µg/m³", label: "pic SO₂ (seuil OMS · 40)", tone: "amber" as const },
  { value: "800", unit: "m", label: "école ↔ usines GCT", tone: "surface" as const },
  { value: "0", unit: "", label: "alerte publique émise avant le pic", tone: "danger" as const },
];

const TONE_CLASS: Record<"danger" | "amber" | "surface", string> = {
  danger: "text-[color:var(--nafas-danger)]",
  amber: "text-[color:var(--nafas-amber)]",
  surface: "text-[color:var(--nafas-surface)]",
};

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* atmosphere */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 18% 30%, rgba(226,75,74,0.16), transparent 60%), radial-gradient(ellipse 60% 55% at 82% 72%, rgba(29,158,117,0.12), transparent 65%), radial-gradient(ellipse 80% 40% at 50% 100%, rgba(239,159,39,0.07), transparent 70%)",
        }}
      />
      {/* faint grid */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
        }}
      />

      <div className="relative max-w-[1400px] mx-auto px-6 md:px-10 pt-16 pb-20 md:pt-24 md:pb-28">
        {/* eyebrow */}
        <div className="flex items-center gap-3 mb-8">
          <div className="inline-flex items-center gap-2 text-[10.5px] font-[family-name:var(--font-jetbrains)] tracking-[0.22em] uppercase text-[color:var(--nafas-danger)] px-2.5 py-1 rounded-[4px] bg-[color:var(--nafas-danger)]/10 border border-[color:var(--nafas-danger)]/25">
            <span className="size-1.5 rounded-full bg-[color:var(--nafas-danger)] animate-pulse" />
            Alerte active
          </div>
          <div className="h-px flex-1 max-w-[96px] bg-[color:var(--nafas-ink3)]/20" />
          <div className="text-[10.5px] font-[family-name:var(--font-jetbrains)] tracking-[0.22em] uppercase text-[color:var(--nafas-ink3)]">
            Octobre 2025 · Gabès, Tunisie
          </div>
        </div>

        {/* h1 — tight, firm */}
        <h1 className="font-[family-name:var(--font-fraunces)] font-normal tracking-[-0.035em] leading-[0.92] text-[clamp(52px,8.5vw,112px)] max-w-[16ch]">
          La ville qui{" "}
          <em className="not-italic font-[family-name:var(--font-fraunces)] italic font-light text-[color:var(--nafas-accent2)]">
            respire
          </em>{" "}
          du phosphate.
        </h1>

        {/* caption - subordinate mono eyebrow for the solution */}
        <div className="mt-6 flex items-baseline gap-3">
          <div className="text-[11px] font-[family-name:var(--font-jetbrains)] tracking-[0.22em] uppercase text-[color:var(--nafas-accent2)]">
            NAFAS
          </div>
          <div className="text-[13.5px] text-[color:var(--nafas-ink3)] tracking-wide">
            L&apos;outil qui la fait respirer.
          </div>
        </div>

        {/* lead */}
        <p className="mt-10 max-w-[62ch] text-[16.5px] md:text-[17px] leading-[1.6] text-[color:var(--nafas-ink3)]">
          Chaque matin à Ghannouch, Amina choisit la rue où ses enfants respirent. Le{" "}
          <span className="text-[color:var(--nafas-surface)] font-medium">14 octobre 2025 à 08h47</span>,{" "}
          <span className="text-[color:var(--nafas-surface)] font-medium">121 élèves</span> de l&apos;école Chatt Essalam ont été hospitalisés pour asphyxie. Aucune infrastructure publique ne l&apos;avait prévu.
        </p>

        {/* stats — denser grid, firmer type */}
        <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-px bg-white/[0.06] rounded-xl overflow-hidden max-w-[980px] border border-white/[0.06]">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="relative p-5 md:p-6 bg-[color:var(--nafas-bg2)]/80 backdrop-blur-sm hover:bg-[color:var(--nafas-bg2)] transition-colors group"
            >
              <div className={`flex items-baseline gap-1.5 mb-3 font-[family-name:var(--font-fraunces)] font-normal tracking-[-0.02em] leading-none ${TONE_CLASS[s.tone]}`}>
                <span className="text-[34px] md:text-[40px]">{s.value}</span>
                {s.unit ? (
                  <span className="text-[14px] md:text-[15px] font-[family-name:var(--font-jetbrains)] tracking-normal opacity-70">
                    {s.unit}
                  </span>
                ) : null}
              </div>
              <div className="text-[11px] leading-[1.4] text-[color:var(--nafas-ink3)] font-[family-name:var(--font-jetbrains)]">
                {s.label}
              </div>
              <div className="absolute top-4 right-4 size-[5px] rounded-full bg-[color:var(--nafas-ink3)]/30 group-hover:bg-[color:var(--nafas-accent2)] transition-colors" />
            </div>
          ))}
        </div>

        {/* cta */}
        <div className="mt-10 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <Link
            href="/monitor"
            className="group inline-flex items-center gap-2 bg-[color:var(--nafas-accent)] hover:bg-[color:var(--nafas-accent2)] text-black font-medium text-[13.5px] px-5 py-3 rounded-md transition-colors"
          >
            Ouvrir le moniteur
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
          <a
            href="#crise"
            className="inline-flex items-center gap-2 text-[color:var(--nafas-ink3)] hover:text-[color:var(--nafas-surface)] font-medium text-[13.5px] px-5 py-3 rounded-md border border-white/10 hover:border-white/20 transition-colors"
          >
            Lire le dossier
          </a>
          <div className="hidden md:flex items-center gap-2 ml-2 text-[10.5px] font-[family-name:var(--font-jetbrains)] tracking-[0.18em] uppercase text-[color:var(--nafas-ink3)]/70">
            <span className="size-1 rounded-full bg-[color:var(--nafas-accent2)] animate-pulse" />
            Données temps réel
          </div>
        </div>
      </div>
    </section>
  );
}
