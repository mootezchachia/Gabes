import { Stethoscope } from "lucide-react";

export function HealthSection() {
  return (
    <section id="sante" className="relative border-t border-white/5 bg-[color:var(--nafas-bg2)]/40">
      {/* atmosphere */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 20% 60%, rgba(55,138,221,0.06), transparent 60%)",
        }}
      />

      <div className="relative max-w-[1400px] mx-auto px-6 md:px-10 py-28 md:py-36">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* ── LEFT: icon + text ───────────────────────────────────── */}
          <div className="flex flex-col gap-10">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <span className="text-[10.5px] font-[family-name:var(--font-jetbrains)] tracking-[0.22em] uppercase text-[color:var(--nafas-blue)]">
                  03 · Santé
                </span>
                <span className="h-px w-16 bg-white/10" />
              </div>
              <h2 className="font-[family-name:var(--font-fraunces)] font-normal tracking-[-0.025em] leading-[1.0] text-[clamp(36px,5vw,60px)] mb-5">
                Anticiper la crise.{" "}
                <em className="not-italic italic font-light text-[color:var(--nafas-blue)]">
                  Pas la subir.
                </em>
              </h2>
              <p className="text-[15.5px] leading-[1.65] text-[color:var(--nafas-ink3)] max-w-[50ch]">
                {/* placeholder */}
                [Contenu en préparation — description du tableau de bord hospitalier, triage IA
                sous supervision médicale, profils d&apos;exposition horodatés.]
              </p>
            </div>

            {/* placeholder metrics */}
            <div className="grid grid-cols-2 gap-3 max-w-[400px]">
              {[
                { v: "48 h", l: "prévision admissions", c: "var(--nafas-blue)" },
                { v: "IA", l: "triage sous supervision", c: "var(--nafas-accent2)" },
                { v: "121", l: "cas Oct. 2025 documentés", c: "var(--nafas-danger)" },
                { v: "0", l: "alerte préventive émise", c: "var(--nafas-amber)" },
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

          {/* ── RIGHT: visual placeholder ──────────────────────────── */}
          <div className="relative h-[400px] lg:h-[480px] rounded-xl overflow-hidden border border-white/[0.07] bg-[color:var(--nafas-bg2)]/30 flex items-center justify-center">
            {/* corner brackets */}
            {["top-3 left-3 border-t border-l", "top-3 right-3 border-t border-r", "bottom-3 left-3 border-b border-l", "bottom-3 right-3 border-b border-r"].map((cls, i) => (
              <div key={i} aria-hidden className={`absolute w-5 h-5 ${cls} border-[color:var(--nafas-blue)]/30 pointer-events-none`} />
            ))}

            <div className="flex flex-col items-center gap-4 text-center px-8">
              <div
                className="size-16 rounded-2xl grid place-items-center"
                style={{ background: "color-mix(in srgb, var(--nafas-blue) 10%, transparent)" }}
              >
                <Stethoscope
                  className="size-8"
                  strokeWidth={1.2}
                  style={{ color: "var(--nafas-blue)" }}
                />
              </div>
              <p className="text-[12px] font-[family-name:var(--font-jetbrains)] tracking-[0.16em] uppercase text-[color:var(--nafas-ink3)]/50">
                [Visualisation en préparation]
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
