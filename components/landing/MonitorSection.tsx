import Link from "next/link";
import { Map, Globe } from "lucide-react";

const CARDS = [
  {
    icon: Map,
    code: "2D",
    title: "Vue cartographique",
    sub: "Mapbox GL · deck.gl · WebGL",
    body: "42 capteurs SO₂ et PM, satellite TROPOMI et modélisation de panache. Filtrage par audience, ligne de temps 1h → 1 an, brief IA en temps réel.",
    href: "/monitor",
    label: "Ouvrir la carte",
    accent: "var(--nafas-accent2)",
  },
  {
    icon: Globe,
    code: "3D",
    title: "Vue tactique globe",
    sub: "Cesium · Vue depuis l'espace",
    body: "Intro cinématique depuis l'orbite jusqu'à Gabès. Panneaux HUD déplaçables, scan ORACLE, couches industrielles et capteurs en relief.",
    href: "/monitor3d",
    label: "Ouvrir le globe",
    accent: "var(--nafas-cyan)",
  },
];

export function MonitorSection() {
  return (
    <section id="moniteur" className="relative border-t border-white/5 bg-[color:var(--nafas-bg)]">
      {/* atmosphere */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(29,158,117,0.07), transparent 60%)",
        }}
      />

      <div className="relative max-w-[1400px] mx-auto px-6 md:px-10 py-28 md:py-36">
        {/* header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-20">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-[10.5px] font-[family-name:var(--font-jetbrains)] tracking-[0.22em] uppercase text-[color:var(--nafas-accent2)]">
                01 · Surveillance
              </span>
              <span className="h-px w-16 bg-white/10" />
            </div>
            <h2 className="font-[family-name:var(--font-fraunces)] font-normal tracking-[-0.025em] leading-[1.0] text-[clamp(36px,5vw,64px)]">
              La même donnée.{" "}
              <em className="not-italic italic font-light text-[color:var(--nafas-accent2)]">
                Cinq décisions.
              </em>
            </h2>
          </div>
          <p className="md:max-w-[380px] text-[15px] leading-[1.65] text-[color:var(--nafas-ink3)]">
            42 capteurs SO₂ et PM, satellite TROPOMI et modélisation de panache — visualisés pour
            l&apos;habitant, le médecin, l&apos;industriel, l&apos;architecte et le maire.
          </p>
        </div>

        {/* cards */}
        <div className="grid md:grid-cols-2 gap-4">
          {CARDS.map((c) => {
            const Icon = c.icon;
            return (
              <article
                key={c.code}
                className="group relative p-8 rounded-xl bg-[color:var(--nafas-bg2)]/60 border border-white/[0.07] hover:border-white/[0.18] transition-all hover:-translate-y-0.5 flex flex-col gap-6"
              >
                {/* top line on hover */}
                <div
                  className="absolute top-0 inset-x-0 h-px opacity-0 group-hover:opacity-100 transition-opacity rounded-t-xl"
                  style={{ background: `linear-gradient(90deg, transparent, ${c.accent}, transparent)` }}
                />

                {/* head */}
                <div className="flex items-start justify-between">
                  <div
                    className="size-11 rounded-lg grid place-items-center transition-transform group-hover:scale-105"
                    style={{ background: `color-mix(in srgb, ${c.accent} 12%, transparent)`, color: c.accent }}
                  >
                    <Icon strokeWidth={1.3} className="size-5" />
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] font-[family-name:var(--font-jetbrains)] tracking-[0.22em] text-[color:var(--nafas-ink3)] mb-0.5">
                      {c.code}
                    </div>
                    <div
                      className="text-[10px] font-[family-name:var(--font-jetbrains)] tracking-[0.16em] uppercase"
                      style={{ color: c.accent }}
                    >
                      {c.sub}
                    </div>
                  </div>
                </div>

                {/* text */}
                <div className="flex-1">
                  <h3 className="font-[family-name:var(--font-fraunces)] font-light text-[28px] leading-none tracking-tight mb-4">
                    {c.title}
                  </h3>
                  <p className="text-[14px] leading-[1.6] text-[color:var(--nafas-ink3)]">{c.body}</p>
                </div>

                {/* cta */}
                <Link
                  href={c.href}
                  className="inline-flex items-center gap-2 text-[13px] font-medium transition-colors group-hover:gap-3"
                  style={{ color: c.accent }}
                >
                  {c.label}
                  <span className="transition-transform group-hover:translate-x-0.5">→</span>
                </Link>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
