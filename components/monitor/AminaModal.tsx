"use client";

import { useEffect } from "react";
import { useMonitor } from "@/lib/monitor/store";
import { X } from "lucide-react";

const META: { label: string; value: string }[] = [
  { label: "Lieu", value: "Ghannouch" },
  { label: "Distance GCT", value: "800 m" },
  { label: "Exposition moyenne SO₂", value: "182 µg/m³" },
  { label: "Enfants", value: "3 (dont 1 à Chatt Essalam)" },
];

export function AminaModal() {
  const open = useMonitor((s) => s.aminaModalOpen);
  const setOpen = useMonitor((s) => s.setAminaModalOpen);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm amina-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="amina-modal-title"
      onClick={() => setOpen(false)}
    >
      <style jsx>{`
        @keyframes amina-fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes amina-card-in {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .amina-backdrop {
          animation: amina-fade-in 180ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .amina-card {
          animation: amina-card-in 260ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
      `}</style>

      <div
        onClick={(e) => e.stopPropagation()}
        className="amina-card relative mx-4 w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-[color:var(--nafas-bg2)] p-8 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]"
      >
        {/* ambient glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(ellipse 60% 40% at 15% 0%, rgba(226,75,74,0.14), transparent 60%), radial-gradient(ellipse 50% 40% at 90% 100%, rgba(239,159,39,0.10), transparent 60%)",
          }}
        />

        {/* close button */}
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Fermer"
          className="absolute top-4 right-4 z-10 grid size-8 place-items-center rounded-md text-[color:var(--nafas-ink3)] transition-colors cursor-pointer hover:bg-white/10 hover:text-[color:var(--nafas-surface)]"
        >
          <X className="size-4" />
        </button>

        <div className="relative">
          {/* badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--nafas-amber)]/30 bg-[color:var(--nafas-amber)]/10 px-3 py-1 font-[family-name:var(--font-jetbrains)] text-[10px] uppercase tracking-[0.18em] text-[color:var(--nafas-amber)]">
            <span className="size-1 rounded-full bg-[color:var(--nafas-amber)]" />
            Spotlight · Profil citoyen
          </div>

          {/* title */}
          <h2
            id="amina-modal-title"
            className="mt-5 font-[family-name:var(--font-fraunces)] text-[32px] font-light italic leading-[1.05] tracking-tight text-[color:var(--nafas-surface)]"
          >
            Amina, Ghannouch
          </h2>

          {/* subhead */}
          <p className="mt-5 max-w-[58ch] font-[family-name:var(--font-fraunces)] text-[16px] italic font-light leading-[1.55] text-[color:var(--nafas-surface)]/85">
            «&nbsp;Chaque matin, je choisis la rue où mes enfants respirent. Le
            14&nbsp;octobre 2025 à 08h47, 121&nbsp;élèves de l&apos;école Chatt
            Essalam ont été hospitalisés pour asphyxie. Aucune infrastructure
            publique ne l&apos;avait prévu.&nbsp;»
          </p>

          {/* metadata grid */}
          <dl className="mt-8 grid grid-cols-2 gap-3">
            {META.map((m) => (
              <div
                key={m.label}
                className="rounded-lg border border-white/10 bg-black/30 p-3.5"
              >
                <dt className="font-[family-name:var(--font-jetbrains)] text-[9.5px] uppercase tracking-widest text-[color:var(--nafas-ink3)]">
                  {m.label}
                </dt>
                <dd className="mt-1.5 text-[13.5px] leading-tight text-[color:var(--nafas-surface)]">
                  {m.value}
                </dd>
              </div>
            ))}
          </dl>

          {/* CTA */}
          <div className="mt-8 flex items-center justify-between gap-4">
            <div className="font-[family-name:var(--font-jetbrains)] text-[10px] uppercase tracking-wider text-[color:var(--nafas-ink3)]/70">
              Source · dossier HealiX · oct. 2025
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex items-center gap-2 rounded-md bg-[color:var(--nafas-accent)] px-5 py-2.5 text-[13px] font-medium text-black transition-colors cursor-pointer hover:bg-[color:var(--nafas-accent2)]"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
