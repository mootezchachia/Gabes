"use client";

import { useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";

const HeroCanvas = dynamic(
  () => import("./HeroCanvas").then((m) => ({ default: m.HeroCanvas })),
  { ssr: false, loading: () => null }
);

export function HeroSection() {
  useEffect(() => {
    let snapping = false;
    const onWheel = (e: WheelEvent) => {
      if (snapping || window.scrollY > window.innerHeight * 0.1) return;
      if (e.deltaY <= 0) return;
      snapping = true;
      e.preventDefault();
      const journey = document.querySelector('[data-section="journey"]') as HTMLElement;
      window.scrollTo({ top: journey?.offsetTop ?? window.innerHeight, behavior: "smooth" });
      setTimeout(() => { snapping = false; }, 1000);
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* ── background canvas ────────────────────────────────────────── */}
      <HeroCanvas />

      {/* ── dark overlay ────────────────────────────────────────────── */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(6,10,14,0.58) 0%, rgba(6,10,14,0.72) 50%, rgba(6,10,14,0.93) 100%)",
          zIndex: 1,
        }}
      />

      {/* ── content ─────────────────────────────────────────────────── */}
      <div className="relative z-10 max-w-[1400px] mx-auto px-6 md:px-10 flex flex-col items-center text-center gap-8 pt-16">
        {/* eyebrow */}
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 text-[10.5px] font-[family-name:var(--font-jetbrains)] tracking-[0.22em] uppercase text-[color:var(--nafas-danger)] px-2.5 py-1 rounded-[4px] bg-[color:var(--nafas-danger)]/10 border border-[color:var(--nafas-danger)]/25">
            <span className="size-1.5 rounded-full bg-[color:var(--nafas-danger)] animate-pulse" />
            Alerte active · Octobre 2025
          </div>
        </div>

        {/* headline */}
        <h1
          className="font-[family-name:var(--font-fraunces)] font-normal tracking-[-0.035em] leading-[0.92] text-[clamp(48px,8vw,110px)] max-w-[14ch]"
          style={{ color: "#EEE8DC" }}
        >
          Gabès respire{" "}
          <em className="not-italic italic font-light" style={{ color: "#8FC87A" }}>
            du phosphate.
          </em>
        </h1>

        {/* sub */}
        <p className="max-w-[58ch] text-[17px] leading-[1.65]" style={{ color: "#A8A89A" }}>
          Surveillance industrielle temps-réel, architecture régénérative et médecine préventive —
          réunis dans un seul outil citoyen, scientifique et ouvert.
        </p>

        {/* ctas */}
        <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
          <Link
            href="/app/carte"
            className="group inline-flex items-center gap-2 bg-[color:var(--nafas-accent)] hover:bg-[color:var(--nafas-accent2)] text-black font-medium text-[14px] px-6 py-3.5 rounded-md transition-colors"
          >
            Ouvrir le moniteur 3D
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
          <Link
            href="/monitor"
            className="inline-flex items-center gap-2 text-[color:var(--nafas-ink3)] hover:text-[color:var(--nafas-surface)] font-medium text-[14px] px-6 py-3.5 rounded-md border border-white/10 hover:border-white/25 transition-colors"
          >
            Carte 2D en direct
          </Link>
        </div>

        {/* stats strip */}
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 mt-4 text-[11px] font-[family-name:var(--font-jetbrains)] tracking-[0.18em] uppercase">
          <span style={{ color: "#E06060" }}>121 enfants hospitalisés</span>
          <span style={{ color: "rgba(255,255,255,0.15)" }}>·</span>
          <span style={{ color: "#D4A055" }}>340 µg/m³ SO₂</span>
          <span style={{ color: "rgba(255,255,255,0.15)" }}>·</span>
          <span style={{ color: "rgba(200,195,185,0.6)" }}>0 alerte émise</span>
        </div>
      </div>

      {/* ── scroll hint ──────────────────────────────────────────────── */}
      <div
        className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 text-[color:var(--nafas-ink3)]/50 animate-bounce"
        aria-hidden
      >
        <div className="text-[9.5px] font-[family-name:var(--font-jetbrains)] tracking-[0.25em] uppercase">
          Défiler
        </div>
        <div className="w-px h-10 bg-gradient-to-b from-[color:var(--nafas-ink3)]/40 to-transparent" />
      </div>
    </section>
  );
}
