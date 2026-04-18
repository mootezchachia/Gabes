"use client";

import { useEffect } from "react";
import { useIntro } from "@/lib/monitor3d/introStore";

/**
 * Narrative overlay on top of the Cesium canvas while the intro plays.
 *
 *  - 0.00-0.15 : black cover fades, "INITIALISATION DU GLOBE" centered
 *  - 0.15-0.55 : acquisition tags top-left + bottom-right, camera descends
 *  - 0.55-0.90 : descent vector card slides in, crosshair converges on Gabès
 *  - 0.90-1.00 : everything fades out, chrome takes over
 *
 * The skip button appears at stage > 0.05 and is Esc-bindable.
 */
export function CinematicBoot() {
  const stage = useIntro((s) => s.stage);
  const active = useIntro((s) => s.active);
  const skip = useIntro((s) => s.skip);

  // Esc shortcut
  useEffect(() => {
    if (!active) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") skip();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, skip]);

  if (!active) return null;

  // --- opacity envelopes (hand-tuned to the 10s drive) -----------------

  // Black cover: opaque until 0.05, fades to 0 by 0.18
  const coverOpacity =
    stage < 0.05 ? 1 : stage > 0.18 ? 0 : 1 - (stage - 0.05) / 0.13;

  // Center boot title: in from 0.03, out by 0.35
  const titleOpacity =
    stage < 0.03
      ? 0
      : stage < 0.1
        ? (stage - 0.03) / 0.07
        : stage > 0.3
          ? Math.max(0, 1 - (stage - 0.3) / 0.08)
          : 1;

  // Acquisition tags: in at 0.2, out by 0.85
  const tagOpacity =
    stage < 0.2
      ? 0
      : stage < 0.32
        ? (stage - 0.2) / 0.12
        : stage > 0.78
          ? Math.max(0, 1 - (stage - 0.78) / 0.1)
          : 1;

  // Descent card: in at 0.48, out by 0.9
  const cardOpacity =
    stage < 0.48
      ? 0
      : stage < 0.6
        ? (stage - 0.48) / 0.12
        : stage > 0.84
          ? Math.max(0, 1 - (stage - 0.84) / 0.08)
          : 1;

  // Skip button: in at 0.07, out by 0.92
  const skipOpacity =
    stage < 0.07 ? 0 : stage > 0.9 ? Math.max(0, 1 - (stage - 0.9) / 0.05) : 1;

  // Crosshair convergence: at 0.6 the ring is huge, shrinks to dot by 0.95
  const reticleScale = Math.max(0.4, 2.4 - stage * 2.2);
  const reticleOpacity =
    stage < 0.55
      ? 0
      : stage < 0.65
        ? (stage - 0.55) / 0.1
        : stage > 0.95
          ? Math.max(0, 1 - (stage - 0.95) / 0.04)
          : 0.85;

  return (
    <>
      {/* Black cover — initial void before the globe is revealed */}
      <div
        aria-hidden
        className="fixed inset-0 z-[60] bg-[#0A0F14] pointer-events-none"
        style={{ opacity: coverOpacity }}
      />

      {/* Scan sweep — a faint horizontal line that sweeps down during descent */}
      <div
        aria-hidden
        className="fixed inset-x-0 z-[61] pointer-events-none"
        style={{
          top: `${Math.min(100, stage * 120 - 10)}%`,
          height: 1,
          background:
            "linear-gradient(90deg, transparent, rgba(62,201,208,0.6), transparent)",
          opacity: stage > 0.1 && stage < 0.9 ? 0.6 : 0,
          filter: "blur(0.4px)",
          transition: "opacity 400ms var(--ease-editorial)",
        }}
      />

      {/* Center boot title */}
      <div
        className="fixed inset-0 z-[62] grid place-items-center pointer-events-none"
        style={{ opacity: titleOpacity }}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="size-10 rounded-full border-2 border-[color:var(--nafas-cyan)]/15 border-t-[color:var(--nafas-cyan)] animate-spin" />
          <div className="flex items-center gap-3">
            <span className="inline-block w-8 h-px bg-[color:var(--nafas-cyan)]/60" />
            <span className="font-[family-name:var(--font-jetbrains)] text-[10.5px] tracking-[0.42em] uppercase text-[color:var(--nafas-ink3)]">
              Initialisation du globe
            </span>
            <span className="inline-block w-8 h-px bg-[color:var(--nafas-cyan)]/60" />
          </div>
          <div className="font-[family-name:var(--font-fraunces)] italic font-light text-[color:var(--nafas-surface)]/70 text-[13px] tracking-wide">
            nafas · moniteur 3D · gabès
          </div>
        </div>
      </div>

      {/* Top-left acquisition tag */}
      <div
        className="fixed top-5 left-5 z-[62] pointer-events-none"
        style={{ opacity: tagOpacity }}
      >
        <div className="flex items-center gap-2 font-[family-name:var(--font-jetbrains)] text-[9.5px] tracking-[0.32em] uppercase text-[color:var(--nafas-cyan)]/90">
          <span className="size-1.5 rounded-full bg-[color:var(--nafas-cyan)] animate-pulse" />
          ACQ · Sentinel-5P · TROPOMI
        </div>
        <div className="mt-1.5 font-[family-name:var(--font-jetbrains)] text-[9.5px] tracking-[0.24em] uppercase text-[color:var(--nafas-ink3)]/80">
          Bing Aerial · Cesium World Terrain
        </div>
      </div>

      {/* Bottom-right coordinate tag */}
      <div
        className="fixed bottom-6 right-6 z-[62] pointer-events-none text-right"
        style={{ opacity: tagOpacity }}
      >
        <div className="font-[family-name:var(--font-jetbrains)] text-[9.5px] tracking-[0.32em] uppercase text-[color:var(--nafas-ink3)]/90">
          Target vector
        </div>
        <div className="mt-1 font-[family-name:var(--font-fraunces)] italic text-[15px] text-[color:var(--nafas-surface)]">
          33° 53′ N &nbsp; 10° 06′ E
        </div>
        <div className="mt-0.5 font-[family-name:var(--font-jetbrains)] text-[9.5px] tracking-[0.24em] uppercase text-[color:var(--nafas-ink3)]/80">
          Golfe de Gabès · Tunisie
        </div>
      </div>

      {/* Descent vector card — bottom center */}
      <div
        className="fixed left-1/2 bottom-20 z-[62] -translate-x-1/2 pointer-events-none"
        style={{ opacity: cardOpacity }}
      >
        <div className="flex items-center gap-5 px-5 py-3 rounded-md bg-[color:var(--nafas-bg)]/70 backdrop-blur-md border border-white/10">
          <div>
            <div className="font-[family-name:var(--font-jetbrains)] text-[9px] tracking-[0.28em] uppercase text-[color:var(--nafas-ink3)]">
              Altitude
            </div>
            <div className="font-[family-name:var(--font-fraunces)] text-[18px] text-[color:var(--nafas-surface)] tabular-nums">
              {formatAltitude(stage)}
            </div>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div>
            <div className="font-[family-name:var(--font-jetbrains)] text-[9px] tracking-[0.28em] uppercase text-[color:var(--nafas-ink3)]">
              ETA
            </div>
            <div className="font-[family-name:var(--font-fraunces)] text-[18px] text-[color:var(--nafas-surface)] tabular-nums">
              {formatEta(stage)}
            </div>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div>
            <div className="font-[family-name:var(--font-jetbrains)] text-[9px] tracking-[0.28em] uppercase text-[color:var(--nafas-ink3)]">
              Status
            </div>
            <div className="font-[family-name:var(--font-jetbrains)] text-[11px] text-[color:var(--nafas-cyan)] uppercase tracking-wider">
              {stage < 0.75 ? "Descending" : "Approach"}
            </div>
          </div>
        </div>
      </div>

      {/* Convergence reticle over Gabès */}
      <div
        className="fixed inset-0 z-[62] grid place-items-center pointer-events-none"
        style={{ opacity: reticleOpacity }}
      >
        <div
          className="relative"
          style={{
            transform: `scale(${reticleScale})`,
            transition: "transform 120ms linear",
          }}
        >
          <div className="size-32 rounded-full border border-[color:var(--nafas-cyan)]/50" />
          <div className="absolute inset-0 size-32 rounded-full border border-[color:var(--nafas-cyan)]/20"
               style={{ transform: "scale(1.4)" }} />
          {/* crosshair ticks */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-px bg-[color:var(--nafas-cyan)]/70" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-20 w-px bg-[color:var(--nafas-cyan)]/70" />
        </div>
      </div>

      {/* Skip button */}
      <button
        onClick={skip}
        className="fixed top-5 right-5 z-[63] group flex items-center gap-2 px-3 py-1.5 rounded-md bg-[color:var(--nafas-bg)]/70 backdrop-blur-md border border-white/10 hover:border-white/25 transition-colors"
        style={{
          opacity: skipOpacity,
          pointerEvents: skipOpacity > 0.1 ? "auto" : "none",
        }}
      >
        <span className="font-[family-name:var(--font-jetbrains)] text-[10px] tracking-[0.24em] uppercase text-[color:var(--nafas-ink3)] group-hover:text-[color:var(--nafas-surface)] transition-colors">
          Passer l&apos;intro
        </span>
        <span className="font-[family-name:var(--font-jetbrains)] text-[9.5px] text-[color:var(--nafas-ink3)]/60 group-hover:text-[color:var(--nafas-ink3)] transition-colors px-1.5 py-0.5 rounded border border-white/10">
          Esc
        </span>
      </button>
    </>
  );
}

// Lerp altitude from 20,000 km → 3.2 km on ease-out-cubic for HUD display.
function formatAltitude(stage: number): string {
  const eased = 1 - Math.pow(1 - stage, 3);
  const alt = 20_000_000 * (1 - eased) + 3200 * eased;
  if (alt >= 1_000_000) return `${(alt / 1_000_000).toFixed(2)} Mm`;
  if (alt >= 1000) return `${(alt / 1000).toFixed(1)} km`;
  return `${Math.round(alt)} m`;
}

function formatEta(stage: number): string {
  const remaining = Math.max(0, 10 - stage * 10);
  return `T−${remaining.toFixed(1)}s`;
}
