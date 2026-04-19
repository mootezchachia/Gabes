"use client";

import dynamic from "next/dynamic";

const MashrabiyyaViewer = dynamic(
  () => import("./MashrabiyyaScene").then((m) => ({ default: m.MashrabiyyaViewer })),
  { ssr: false, loading: () => <div className="w-full h-full" /> }
);

const SPECS = [
  { value: "−40 %", label: "PM₂.₅ en façade", color: "var(--nafas-accent2)" },
  { value: "4", label: "écoles prioritaires", color: "var(--nafas-cyan)" },
  { value: "0 kg", label: "déchets · phosphogypse recyclé", color: "var(--nafas-amber)" },
];

const MATERIALS = [
  "Phosphogypse stabilisé",
  "Charbon d'olive actif",
  "Grignons d'olive",
  "Roseau local",
];

export function ArchitectShowcase() {
  return (
    <section id="architecture" className="relative border-t border-white/5 overflow-hidden">
      {/* cyan atmosphere */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 75% 50%, rgba(62,201,208,0.055), transparent 65%)",
        }}
      />

      <div className="relative max-w-[1400px] mx-auto px-6 md:px-10 py-24 md:py-32">
        {/* eyebrow */}
        <div className="flex items-center gap-3 mb-16">
          <span className="text-[10.5px] font-[family-name:var(--font-jetbrains)] tracking-[0.22em] uppercase text-[color:var(--nafas-cyan)]">
            03 · Mashrabiyya
          </span>
          <span className="h-px flex-1 max-w-[96px] bg-white/10" />
          <span className="text-[10.5px] font-[family-name:var(--font-jetbrains)] tracking-[0.18em] uppercase text-[color:var(--nafas-ink3)]">
            Architecture paramétrique
          </span>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* ── LEFT: text ─────────────────────────────────────────── */}
          <div className="flex flex-col gap-8">
            <div>
              <h2 className="font-[family-name:var(--font-fraunces)] font-normal tracking-[-0.025em] leading-[1.0] text-[clamp(36px,5vw,60px)] mb-5">
                Filtrer l&apos;air,{" "}
                <em className="not-italic italic font-light text-[color:var(--nafas-cyan)]">
                  construire demain.
                </em>
              </h2>
              <p className="text-[15.5px] leading-[1.65] text-[color:var(--nafas-ink3)] max-w-[50ch]">
                La Mashrabiyya n&apos;est pas une métaphore — c&apos;est un matériau. Façades
                paramétriques en phosphogypse stabilisé et charbon actif de grignons d&apos;olive,
                générées par ORACLE et exportées directement en fichiers de chantier Rhino /
                Grasshopper.
              </p>
            </div>

            {/* specs */}
            <div className="grid grid-cols-3 gap-3">
              {SPECS.map((s) => (
                <div
                  key={s.label}
                  className="p-4 rounded-lg bg-[color:var(--nafas-bg2)]/70 border border-white/[0.07]"
                >
                  <div
                    className="font-[family-name:var(--font-fraunces)] text-[28px] tracking-tight leading-none mb-2"
                    style={{ color: s.color }}
                  >
                    {s.value}
                  </div>
                  <div className="text-[11px] font-[family-name:var(--font-jetbrains)] text-[color:var(--nafas-ink3)] leading-[1.35]">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>

            {/* materials */}
            <div>
              <div className="text-[10.5px] font-[family-name:var(--font-jetbrains)] tracking-[0.2em] uppercase text-[color:var(--nafas-ink3)]/50 mb-3">
                Matériaux locaux
              </div>
              <div className="flex flex-wrap gap-2">
                {MATERIALS.map((m) => (
                  <span
                    key={m}
                    className="text-[11px] font-[family-name:var(--font-jetbrains)] tracking-[0.08em] px-3 py-1.5 rounded-md border border-white/[0.09] text-[color:var(--nafas-ink3)] bg-[color:var(--nafas-bg2)]/50"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>

            {/* export tools */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-3 border-t border-white/[0.06]">
              <span className="text-[10.5px] font-[family-name:var(--font-jetbrains)] tracking-[0.18em] uppercase text-[color:var(--nafas-ink3)]/45">
                Export direct →
              </span>
              {["Rhino", "Grasshopper", "Fichiers chantier"].map((t) => (
                <span
                  key={t}
                  className="text-[10.5px] font-[family-name:var(--font-jetbrains)] tracking-[0.14em] uppercase text-[color:var(--nafas-cyan)]"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* ── RIGHT: 3D canvas ───────────────────────────────────── */}
          <div className="relative h-[420px] lg:h-[520px] rounded-xl overflow-hidden border border-white/[0.07] bg-[color:var(--nafas-bg2)]/30">
            {/* corner brackets */}
            <div aria-hidden className="absolute top-3 left-3 w-5 h-5 border-t border-l border-[color:var(--nafas-cyan)]/35 pointer-events-none z-10" />
            <div aria-hidden className="absolute top-3 right-3 w-5 h-5 border-t border-r border-[color:var(--nafas-cyan)]/35 pointer-events-none z-10" />
            <div aria-hidden className="absolute bottom-3 left-3 w-5 h-5 border-b border-l border-[color:var(--nafas-cyan)]/35 pointer-events-none z-10" />
            <div aria-hidden className="absolute bottom-3 right-3 w-5 h-5 border-b border-r border-[color:var(--nafas-cyan)]/35 pointer-events-none z-10" />

            {/* SO₂ legend */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-[color:var(--nafas-amber)]" />
              <span className="text-[9.5px] font-[family-name:var(--font-jetbrains)] tracking-[0.18em] uppercase text-[color:var(--nafas-amber)]/65">
                SO₂ · PM₂.₅
              </span>
            </div>

            {/* filtered legend */}
            <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-[color:var(--nafas-cyan)]" />
              <span className="text-[9.5px] font-[family-name:var(--font-jetbrains)] tracking-[0.18em] uppercase text-[color:var(--nafas-cyan)]/65">
                Filtré
              </span>
            </div>

            {/* interaction hint */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 text-[9px] font-[family-name:var(--font-jetbrains)] tracking-[0.22em] uppercase text-[color:var(--nafas-ink3)]/40 whitespace-nowrap">
              Déplacer le curseur · simulation paramétrique
            </div>

            <MashrabiyyaViewer />
          </div>
        </div>
      </div>
    </section>
  );
}
