"use client";

import { useMonitor } from "@/lib/monitor/store";

export function AminaSpotlight() {
  const setOpen = useMonitor((s) => s.setAminaModalOpen);

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="group flex w-full items-start gap-3 rounded-xl border border-white/10 bg-black/30 p-3 text-left transition-all duration-200 ease-out cursor-pointer hover:-translate-y-[1px] hover:border-white/20 hover:bg-black/40"
    >
      {/* avatar */}
      <div
        aria-hidden
        className="relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-full ring-1 ring-white/10"
        style={{
          background:
            "radial-gradient(circle at 30% 25%, rgba(239,159,39,0.55), transparent 60%), radial-gradient(circle at 70% 75%, rgba(226,75,74,0.55), transparent 60%), linear-gradient(135deg, #2a1810, #0f1014)",
        }}
      >
        <span className="font-[family-name:var(--font-fraunces)] text-[22px] italic font-light leading-none text-[color:var(--nafas-surface)]/95">
          A
        </span>
        <span className="absolute inset-0 rounded-full ring-1 ring-inset ring-white/10" />
      </div>

      {/* content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <div className="text-[13px] leading-tight text-[color:var(--nafas-surface)]">
            Amina, 38 ans
          </div>
          <span className="font-[family-name:var(--font-jetbrains)] text-[9px] uppercase tracking-widest text-[color:var(--nafas-ink3)]/70 transition-colors group-hover:text-[color:var(--nafas-accent2)]">
            profil
          </span>
        </div>
        <div className="mt-0.5 font-[family-name:var(--font-jetbrains)] text-[10px] uppercase tracking-wider text-[color:var(--nafas-ink3)]">
          Ghannouch · mère de 3
        </div>
        <p className="mt-2 text-[12px] leading-[1.35] text-[color:var(--nafas-danger)]/95">
          SO₂ 340 µg/m³ aujourd&apos;hui
          <span className="text-[color:var(--nafas-ink3)]"> · </span>
          <span className="text-[color:var(--nafas-surface)]/85">évite trajet nord</span>
        </p>
      </div>
    </button>
  );
}
