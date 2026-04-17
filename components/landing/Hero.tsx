import Link from "next/link";

const STATS = [
  { value: "121", label: "enfants hospitalisés · 14 oct 2025", tone: "danger" as const },
  { value: "340 µg/m³", label: "pic SO₂ mesuré (seuil OMS · 40)", tone: "amber" as const },
  { value: "800 m", label: "distance école ↔ usines GCT", tone: "surface" as const },
  { value: "0", label: "alerte publique émise avant le pic", tone: "danger" as const },
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
            "radial-gradient(ellipse 60% 50% at 18% 30%, rgba(226,75,74,0.18), transparent 60%), radial-gradient(ellipse 60% 55% at 82% 72%, rgba(29,158,117,0.14), transparent 65%), radial-gradient(ellipse 80% 40% at 50% 100%, rgba(239,159,39,0.08), transparent 70%)",
        }}
      />
      {/* faint grid */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      <div className="relative max-w-[1400px] mx-auto px-6 md:px-10 pt-24 pb-28 md:pt-36 md:pb-40">
        {/* tag */}
        <div className="inline-flex items-center gap-2 text-[11px] font-[family-name:var(--font-jetbrains)] tracking-[0.18em] uppercase text-[color:var(--nafas-danger)] px-3 py-1.5 rounded-full bg-[color:var(--nafas-danger)]/8 border border-[color:var(--nafas-danger)]/25 mb-8">
          <span className="size-1.5 rounded-full bg-[color:var(--nafas-danger)] animate-pulse" />
          Alerte pollution industrielle · Octobre 2025
        </div>

        {/* h1 */}
        <h1 className="font-[family-name:var(--font-fraunces)] font-light tracking-[-0.02em] leading-[0.98] text-[clamp(44px,8vw,108px)] max-w-[18ch]">
          La ville qui{" "}
          <em className="not-italic font-[family-name:var(--font-fraunces)] italic font-light text-[color:var(--nafas-accent2)]">
            respire
          </em>{" "}
          du phosphate.
          <span className="block text-[color:var(--nafas-ink3)]/70 font-light mt-2">
            L&apos;outil qui la fait respirer.
          </span>
        </h1>

        {/* sub */}
        <p className="mt-10 max-w-[58ch] text-[17px] md:text-[18px] leading-[1.55] text-[color:var(--nafas-ink3)]">
          Chaque matin à Ghannouch, Amina choisit la rue où ses enfants respirent. Le 14 octobre 2025 à 08h47, 121 élèves de l&apos;école Chatt Essalam ont été hospitalisés pour asphyxie. Aucune infrastructure publique ne l&apos;avait prévu.{" "}
          <span className="text-[color:var(--nafas-surface)]">NAFAS est l&apos;infrastructure qui manque.</span>
        </p>

        {/* stats */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-[980px]">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="relative p-5 rounded-xl bg-[color:var(--nafas-bg2)]/70 backdrop-blur-sm border border-white/[0.06] hover:border-white/[0.12] transition-colors group"
            >
              <div className="absolute top-3 right-3 size-1 rounded-full bg-[color:var(--nafas-ink3)]/40 group-hover:bg-[color:var(--nafas-accent2)] transition-colors" />
              <div
                className={`text-[28px] md:text-[32px] font-[family-name:var(--font-fraunces)] font-light tracking-tight leading-none mb-2 ${TONE_CLASS[s.tone]}`}
              >
                {s.value}
              </div>
              <div className="text-[11.5px] leading-[1.35] text-[color:var(--nafas-ink3)] font-[family-name:var(--font-jetbrains)]">
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* cta */}
        <div className="mt-12 flex flex-col sm:flex-row gap-3">
          <Link
            href="/simulator"
            className="group inline-flex items-center gap-2 bg-[color:var(--nafas-accent)] hover:bg-[color:var(--nafas-accent2)] text-black font-medium text-[14px] px-6 py-3.5 rounded-md transition-colors"
          >
            Ouvrir le simulateur
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
          <a
            href="#crise"
            className="inline-flex items-center gap-2 bg-transparent hover:bg-white/5 text-[color:var(--nafas-surface)] font-medium text-[14px] px-6 py-3.5 rounded-md border border-white/10 hover:border-white/20 transition-colors"
          >
            Lire le dossier
          </a>
        </div>

        {/* footnote */}
        <div className="mt-16 flex items-center gap-3 text-[11px] font-[family-name:var(--font-jetbrains)] tracking-wider uppercase text-[color:var(--nafas-ink3)]/70">
          <span>Sources</span>
          <span className="h-px w-6 bg-[color:var(--nafas-ink3)]/30" />
          <span>Sentinel-5P · Copernicus</span>
          <span className="opacity-40">·</span>
          <span>Stop Pollution Gabès</span>
          <span className="opacity-40">·</span>
          <span>FTDES</span>
        </div>
      </div>
    </section>
  );
}
