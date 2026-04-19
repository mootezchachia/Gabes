"use client";

import dynamic from "next/dynamic";

const MossModelViewer = dynamic(
  () => import("./MossModelScene").then((m) => ({ default: m.MossModelViewer })),
  { ssr: false, loading: () => <div className="w-full h-full" /> }
);

export function ArchitectureSection() {
  return (
    <section id="architecture" className="relative border-t border-white/5 overflow-hidden">
      {/* cyan atmosphere */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 72% 50%, rgba(62,201,208,0.06), transparent 65%)",
        }}
      />

      <div className="relative max-w-[1400px] mx-auto px-6 md:px-10 py-28 md:py-36">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* ── LEFT: text ─────────────────────────────────────────── */}
          <div className="flex flex-col gap-10">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <span className="text-[10.5px] font-[family-name:var(--font-jetbrains)] tracking-[0.22em] uppercase text-[color:var(--nafas-cyan)]">
                  02 · Architecture
                </span>
                <span className="h-px w-16 bg-white/10" />
              </div>
              <h2 className="font-[family-name:var(--font-fraunces)] font-normal tracking-[-0.025em] leading-[1.0] text-[clamp(36px,5vw,60px)] mb-5">
                Filtrer l&apos;air,{" "}
                <em className="not-italic italic font-light text-[color:var(--nafas-cyan)]">
                  construire demain.
                </em>
              </h2>
              <p className="text-[15.5px] leading-[1.65] text-[color:var(--nafas-ink3)] max-w-[50ch]">
                {/* placeholder */}
                [Contenu en préparation — description du catalogue ORACLE, des façades paramétriques
                Mashrabiyya et du corridor végétal Hizam Akhdar.]
              </p>
            </div>

            {/* placeholder specs */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { v: "−40 %", l: "PM₂.₅ en façade", c: "var(--nafas-accent2)" },
                { v: "4", l: "écoles prioritaires", c: "var(--nafas-cyan)" },
                { v: "2 km", l: "corridor végétal", c: "var(--nafas-amber)" },
              ].map((s) => (
                <div
                  key={s.l}
                  className="p-4 rounded-lg bg-[color:var(--nafas-bg2)]/70 border border-white/[0.07]"
                >
                  <div
                    className="font-[family-name:var(--font-fraunces)] text-[26px] tracking-tight leading-none mb-2"
                    style={{ color: s.c }}
                  >
                    {s.v}
                  </div>
                  <div className="text-[11px] font-[family-name:var(--font-jetbrains)] text-[color:var(--nafas-ink3)] leading-[1.35]">
                    {s.l}
                  </div>
                </div>
              ))}
            </div>

            {/* placeholder cta */}
            <div className="pt-2 border-t border-white/[0.06]">
              <span className="inline-flex items-center gap-2 text-[12.5px] font-[family-name:var(--font-jetbrains)] tracking-[0.12em] uppercase text-[color:var(--nafas-ink3)]/50 border border-white/[0.08] px-4 py-2.5 rounded-md">
                [CTA à définir]
              </span>
            </div>
          </div>

          {/* ── RIGHT: 3D model ────────────────────────────────────── */}
          <div className="relative h-[460px] lg:h-[540px] rounded-xl overflow-hidden border border-white/[0.07] bg-[color:var(--nafas-bg2)]/30">
            {/* corner brackets */}
            {["top-3 left-3 border-t border-l", "top-3 right-3 border-t border-r", "bottom-3 left-3 border-b border-l", "bottom-3 right-3 border-b border-r"].map((cls, i) => (
              <div key={i} aria-hidden className={`absolute w-5 h-5 ${cls} border-[color:var(--nafas-cyan)]/30 pointer-events-none z-10`} />
            ))}

            {/* label */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-[color:var(--nafas-accent2)] animate-pulse" />
              <span className="text-[9.5px] font-[family-name:var(--font-jetbrains)] tracking-[0.2em] uppercase text-[color:var(--nafas-ink3)]/60">
                Panneau filtre · ORACLE
              </span>
            </div>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 text-[9px] font-[family-name:var(--font-jetbrains)] tracking-[0.22em] uppercase text-[color:var(--nafas-ink3)]/35 whitespace-nowrap">
              Glisser pour faire pivoter
            </div>

            <MossModelViewer />
          </div>
        </div>
      </div>
    </section>
  );
}
