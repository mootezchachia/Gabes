import Link from "next/link";

export function FinalCTA() {
  return (
    <section
      id="agir"
      className="relative border-t border-white/5 overflow-hidden"
    >
      {/* atmospheric backdrop */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(29,158,117,0.14), transparent 65%), radial-gradient(ellipse 40% 40% at 18% 18%, rgba(239,159,39,0.10), transparent 60%), radial-gradient(ellipse 40% 40% at 82% 85%, rgba(226,75,74,0.08), transparent 60%)",
        }}
      />
      {/* grid mesh */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
        }}
      />

      <div className="relative max-w-[1400px] mx-auto px-6 md:px-10 py-28 md:py-40">
        {/* eyebrow */}
        <div className="flex items-center gap-3 mb-10">
          <span className="size-1.5 rounded-full bg-[color:var(--nafas-accent2)] animate-pulse" />
          <span className="text-[10.5px] font-[family-name:var(--font-jetbrains)] tracking-[0.22em] uppercase text-[color:var(--nafas-accent2)]">
            05 · Agir
          </span>
          <span className="h-px flex-1 max-w-[120px] bg-white/10" />
        </div>

        {/* headline */}
        <div className="max-w-[980px]">
          <h2 className="font-[family-name:var(--font-fraunces)] font-normal tracking-[-0.025em] leading-[1.02] text-[clamp(42px,6.2vw,84px)]">
            Gabès{" "}
            <em className="not-italic italic font-light text-[color:var(--nafas-accent2)]">
              attend
            </em>
            . NAFAS est prêt.
          </h2>

          <p className="mt-8 text-[16px] md:text-[17.5px] leading-[1.6] text-[color:var(--nafas-ink3)] max-w-[62ch]">
            Chaque heure d&apos;attente est mesurée en enfants admis aux urgences, en posidonies mortes, en maisons désertées. Le moniteur est ouvert, les capteurs sont prêts à être scellés, les façades attendent les écoles. Ce qui manque, ce ne sont plus les données — c&apos;est la décision de les regarder.
          </p>
        </div>

        {/* action row */}
        <div className="mt-12 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <Link
            href="/monitor"
            className="group inline-flex items-center gap-2.5 bg-[color:var(--nafas-accent)] hover:bg-[color:var(--nafas-accent2)] text-black font-medium text-[14px] px-6 py-3.5 rounded-md transition-colors"
          >
            Ouvrir le moniteur
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
          <a
            href="mailto:nafas.gabes@proton.me"
            className="inline-flex items-center gap-2 text-[color:var(--nafas-surface)] hover:text-[color:var(--nafas-accent2)] font-medium text-[14px] px-5 py-3.5 rounded-md border border-white/10 hover:border-[color:var(--nafas-accent2)]/40 transition-colors"
          >
            Rejoindre l&apos;équipe
          </a>
          <a
            href="https://github.com/mootezchachia/Gabes"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-[color:var(--nafas-ink3)] hover:text-[color:var(--nafas-surface)] font-medium text-[14px] px-5 py-3.5 rounded-md transition-colors"
          >
            GitHub
          </a>
        </div>

        {/* Amina coda */}
        <div className="mt-20 md:mt-24 pt-10 border-t border-white/5 grid md:grid-cols-[1fr_auto] gap-6 items-end">
          <blockquote
            className="max-w-[58ch] text-[18px] md:text-[20px] leading-[1.45] text-[color:var(--nafas-surface)]/95"
            style={{
              fontFamily: "var(--font-fraunces)",
              fontWeight: 300,
              fontStyle: "italic",
            }}
          >
            « Chaque matin, je choisis la rue où mes enfants respirent. Aucune
            application ne devrait avoir à me le dire — mais aujourd&apos;hui, une
            application le fait, et c&apos;est déjà ça. »
          </blockquote>
          <div className="text-right md:text-right">
            <div className="text-[10.5px] font-[family-name:var(--font-jetbrains)] tracking-[0.22em] uppercase text-[color:var(--nafas-ink3)]">
              Amina
            </div>
            <div className="text-[10.5px] font-[family-name:var(--font-jetbrains)] tracking-[0.14em] uppercase text-[color:var(--nafas-ink3)]/60 mt-1">
              Ghannouch · mère de trois
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
