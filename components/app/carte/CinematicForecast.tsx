"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { X, Sparkles, Building2, TrendingUp, AlertTriangle } from "lucide-react";
import { useCinematicStore, type CinematicProjection } from "./cinematicStore";

const STRATEGY_HEADLINE: Record<string, string> = {
  air_quality: "Qualité de l'air urbain",
  vulnerable_pop: "Protection des populations vulnérables",
  heat_resilience: "Résilience aux îlots de chaleur",
};

const TYPE_LABEL: Record<string, string> = {
  school: "École",
  hospital: "Hôpital",
  university: "Université",
  housing: "Résidence",
  office: "Bâtiment administratif",
  mosque: "Mosquée",
  hotel: "Hôtel",
  mall: "Commerce",
  industrial: "Industriel",
};

/**
 * ORACLE · Dossier cinématique.
 *
 * Full-viewport dramatic overlay used for the jury demo. Triggered when a
 * building is selected on /app/carte (big "Dossier ORACLE" CTA on the card
 * OR the "Déployer sur le terrain" button). Flow:
 *   1. Drawer closes and camera flies to the building (handled by caller).
 *   2. This overlay fades in over the Cesium globe (globe stays visible
 *      through the backdrop so the zone location is legible).
 *   3. While the AI forecast is being fetched, a scanning animation plays
 *      over the strategy-tinted backdrop.
 *   4. Once projections land, headline numbers count up from 0, the 10-year
 *      bar chart animates left-to-right, and the LLM brief fades in.
 *
 * Dismiss with Escape or the ✕ button. State lives in `cinematicStore` so
 * the PlacementCard can kick it off and the rest of the app can stay
 * decoupled.
 */
export function CinematicForecast() {
  const open = useCinematicStore((s) => s.open);
  const loading = useCinematicStore((s) => s.loading);
  const error = useCinematicStore((s) => s.error);
  const brief = useCinematicStore((s) => s.brief_md);
  const projections = useCinematicStore((s) => s.projections);
  const modelName = useCinematicStore((s) => s.model_name);
  const close = useCinematicStore((s) => s.close);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  if (!open) return null;

  const accent = open.accent;
  const building = open.building;
  const typeLbl = building ? TYPE_LABEL[building.type] ?? building.type : "";
  const stratLbl = STRATEGY_HEADLINE[open.strategy] ?? open.strategy;
  const last = projections[projections.length - 1];

  return (
    <div className="fixed inset-0 z-[60] pointer-events-auto">
      {/* Dark cinematic backdrop — globe remains visible through it */}
      <div
        aria-hidden
        className="absolute inset-0 transition-opacity duration-700"
        style={{
          background: `radial-gradient(ellipse 80% 60% at 50% 40%, ${accent}22, transparent 70%), linear-gradient(180deg, rgba(4,6,10,0.78) 0%, rgba(4,6,10,0.92) 50%, rgba(4,6,10,0.78) 100%)`,
          animation: "cin-fadein 600ms var(--ease-editorial, cubic-bezier(0.22,1,0.36,1)) both",
          backdropFilter: "blur(2px)",
        }}
      />

      {/* Horizontal scanline */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 pointer-events-none"
        style={{
          height: 1,
          background: `linear-gradient(90deg, transparent, ${accent}cc, transparent)`,
          animation: "cin-scanline 2.2s linear infinite",
        }}
      />

      {/* Close button */}
      <button
        type="button"
        onClick={close}
        className="absolute top-5 right-5 size-10 grid place-items-center rounded-full border border-white/10 bg-black/30 text-[color:var(--nafas-ink3)] hover:text-[color:var(--nafas-surface)] hover:bg-black/50 backdrop-blur-sm transition-colors z-[2]"
        aria-label="Fermer"
      >
        <X className="size-4" />
      </button>

      {/* Content */}
      <div className="relative z-[1] h-full max-h-screen overflow-y-auto">
        <div className="max-w-[1100px] mx-auto px-8 py-10 md:py-16 space-y-8">
          {/* Eyebrow */}
          <div
            className="flex items-center gap-2 text-[11px] tracking-[0.32em] uppercase font-[family-name:var(--font-jetbrains)]"
            style={{
              color: accent,
              animation: "cin-rise 500ms var(--ease-editorial, cubic-bezier(0.22,1,0.36,1)) 100ms both",
            }}
          >
            <Sparkles className="size-3" />
            ORACLE · Dossier zone {open.index.toString().padStart(2, "0")}
            {modelName ? (
              <span className="text-[color:var(--nafas-ink3)] ml-auto">
                LLM · {modelName.split("/").pop()?.replace(":free", "")}
              </span>
            ) : null}
          </div>

          {/* Building name — the cinematic lead */}
          <div
            className="flex items-start gap-4"
            style={{ animation: "cin-rise 700ms var(--ease-editorial, cubic-bezier(0.22,1,0.36,1)) 180ms both" }}
          >
            <Building2 className="size-8 mt-2 shrink-0" style={{ color: accent }} />
            <div className="flex-1 min-w-0">
              <h1 className="font-[family-name:var(--font-fraunces)] italic font-light text-[clamp(34px,6vw,64px)] leading-[1.02] tracking-[-0.02em] text-[color:var(--nafas-surface)]">
                {building?.name ?? "Bâtiment sélectionné"}
              </h1>
              <div className="mt-2 text-[13px] tracking-[0.14em] uppercase font-[family-name:var(--font-jetbrains)] text-[color:var(--nafas-ink3)] flex flex-wrap gap-x-3 gap-y-1">
                <span>{typeLbl}</span>
                {building ? <span>{building.surface_m2} m² disponibles</span> : null}
                {building ? <span>{building.occupants} occupants/j</span> : null}
                <span style={{ color: accent }}>Stratégie · {stratLbl}</span>
              </div>
            </div>
          </div>

          {/* State branches */}
          {loading ? (
            <LoadingBanner accent={accent} />
          ) : error ? (
            <ErrorBanner message={error} />
          ) : null}

          {/* Counters */}
          {last ? (
            <div
              className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/5 rounded-xl overflow-hidden border border-white/10"
              style={{ animation: "cin-rise 700ms var(--ease-editorial, cubic-bezier(0.22,1,0.36,1)) 350ms both" }}
            >
              <BigStat
                label="CO₂ absorbé · 10 ans"
                target={last.cumulative_co2_kg / 1000}
                suffix=" t"
                decimals={1}
                accent={accent}
                emphasize={open.strategy === "air_quality"}
                delay={500}
              />
              <BigStat
                label="Occupants × années"
                target={last.cumulative_occupants_k_years}
                suffix=" k·an"
                decimals={1}
                accent={accent}
                emphasize={open.strategy === "vulnerable_pop"}
                delay={700}
              />
              <BigStat
                label="Δ température ambiante"
                target={last.thermal_c}
                prefix="−"
                suffix=" °C"
                decimals={1}
                accent={accent}
                emphasize={open.strategy === "heat_resilience"}
                delay={900}
              />
            </div>
          ) : null}

          {/* 10-year bars */}
          {projections.length > 0 ? (
            <ProjectionTimeline projections={projections} accent={accent} />
          ) : null}

          {/* Brief */}
          {brief ? (
            <div
              className="relative rounded-xl border overflow-hidden"
              style={{
                borderColor: `${accent}33`,
                background: `linear-gradient(180deg, ${accent}11, rgba(0,0,0,0.2))`,
                animation: "cin-rise 700ms var(--ease-editorial, cubic-bezier(0.22,1,0.36,1)) 1600ms both",
              }}
            >
              <div
                aria-hidden
                className="absolute top-4 left-4 text-[80px] leading-none font-[family-name:var(--font-fraunces)] italic opacity-15 select-none"
                style={{ color: accent }}
              >
                &ldquo;
              </div>
              <div className="relative p-6 md:p-8 pl-14">
                <div className="text-[10px] tracking-[0.28em] uppercase font-[family-name:var(--font-jetbrains)] mb-3" style={{ color: accent }}>
                  <TrendingUp className="size-3 inline mr-1.5 -mt-0.5" />
                  Note d&apos;orientation · Municipalité de Gabès
                </div>
                <div className="text-[16px] md:text-[18px] leading-[1.6] font-[family-name:var(--font-fraunces)] italic text-[color:var(--nafas-surface)] whitespace-pre-wrap">
                  {brief}
                </div>
              </div>
            </div>
          ) : !loading && !error && projections.length > 0 ? (
            <div
              className="text-[13px] leading-[1.6] text-[color:var(--nafas-ink3)] font-[family-name:var(--font-jetbrains)] rounded-md border border-white/5 bg-black/25 p-4"
              style={{ animation: "cin-rise 700ms var(--ease-editorial, cubic-bezier(0.22,1,0.36,1)) 1600ms both" }}
            >
              <AlertTriangle className="size-3 inline mr-1.5 -mt-0.5 text-[color:var(--nafas-amber)]" />
              Note LLM indisponible · chiffres dérivés déterministes basés sur les coefficients scientifiques.
            </div>
          ) : null}

          {/* Footer controls */}
          <div className="flex items-center justify-between pt-4 pb-2">
            <div className="text-[10px] tracking-[0.22em] uppercase font-[family-name:var(--font-jetbrains)] text-[color:var(--nafas-ink3)]">
              Esc · fermer
            </div>
            <button
              type="button"
              onClick={close}
              className="text-[11px] tracking-[0.14em] uppercase font-[family-name:var(--font-jetbrains)] px-5 py-2.5 rounded-md text-black transition-transform hover:scale-[1.02]"
              style={{ background: accent }}
            >
              Reprendre l&apos;exploration →
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes cin-fadein {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes cin-rise {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes cin-scanline {
          from { transform: translateY(0); opacity: 1; }
          50% { opacity: 0.6; }
          to { transform: translateY(100vh); opacity: 0.1; }
        }
      `}</style>
    </div>
  );
}

/* --------------------------- Sub-components --------------------------- */

function LoadingBanner({ accent }: { accent: string }) {
  return (
    <div
      className="relative rounded-xl border overflow-hidden"
      style={{
        borderColor: `${accent}44`,
        background: `linear-gradient(90deg, rgba(255,255,255,0.02), ${accent}14)`,
      }}
    >
      <div
        aria-hidden
        className="absolute inset-y-0 w-40"
        style={{
          background: `linear-gradient(90deg, transparent, ${accent}44, transparent)`,
          animation: "cin-sweep 1.4s linear infinite",
        }}
      />
      <div className="relative px-6 py-4 flex items-center gap-3">
        <span className="relative flex size-2.5">
          <span className="absolute inline-flex size-full rounded-full opacity-60 animate-ping" style={{ background: accent }} />
          <span className="relative inline-flex size-2.5 rounded-full" style={{ background: accent }} />
        </span>
        <span className="text-[12.5px] tracking-[0.14em] uppercase font-[family-name:var(--font-jetbrains)]" style={{ color: accent }}>
          ORACLE projette 10 ans d&apos;exploitation…
        </span>
      </div>
      <style jsx>{`
        @keyframes cin-sweep {
          from { left: -10rem; }
          to { left: 100%; }
        }
      `}</style>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-[color:var(--nafas-danger)]/30 bg-[color:var(--nafas-danger)]/10 px-5 py-4">
      <div className="text-[11px] tracking-[0.2em] uppercase font-[family-name:var(--font-jetbrains)] text-[color:var(--nafas-danger)] mb-1">
        Prévision indisponible
      </div>
      <div className="text-[13.5px] text-[color:var(--nafas-surface)]">{message}</div>
    </div>
  );
}

function BigStat({
  label, target, prefix = "", suffix = "", decimals = 0, accent, emphasize, delay,
}: {
  label: string;
  target: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  accent: string;
  emphasize: boolean;
  delay: number;
}) {
  const [shown, setShown] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    let start = 0;
    const timer = window.setTimeout(() => {
      start = performance.now();
      const duration = 1100;
      const from = 0;
      const to = target;
      const tick = (t: number) => {
        const k = Math.min(1, (t - start) / duration);
        const e = 1 - Math.pow(1 - k, 3); // ease-out-cubic
        setShown(from + (to - from) * e);
        if (k < 1) rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    }, delay);
    return () => {
      window.clearTimeout(timer);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, delay]);

  return (
    <div
      className="relative p-6 md:p-8 bg-[color:var(--nafas-bg2)]/80 backdrop-blur-sm"
      style={emphasize ? { background: `linear-gradient(180deg, ${accent}22, transparent 85%)` } : undefined}
    >
      <div
        className="font-[family-name:var(--font-fraunces)] font-light tracking-[-0.03em] leading-none tabular-nums text-[clamp(40px,5.5vw,68px)]"
        style={{ color: emphasize ? accent : "var(--nafas-surface)" }}
      >
        {prefix}
        {shown.toFixed(decimals)}
        <span className="text-[clamp(14px,1.5vw,18px)] tracking-normal opacity-70 font-[family-name:var(--font-jetbrains)] ml-1">
          {suffix}
        </span>
      </div>
      <div className="mt-3 text-[10.5px] tracking-[0.2em] uppercase font-[family-name:var(--font-jetbrains)] text-[color:var(--nafas-ink3)]">
        {label}
      </div>
      {emphasize ? (
        <div aria-hidden className="absolute top-3 right-3 size-1.5 rounded-full" style={{ background: accent }} />
      ) : null}
    </div>
  );
}

function ProjectionTimeline({
  projections,
  accent,
}: {
  projections: CinematicProjection[];
  accent: string;
}) {
  const max = useMemo(
    () => projections.reduce((m, p) => Math.max(m, p.cumulative_co2_kg), 0) || 1,
    [projections],
  );

  return (
    <div
      className="rounded-xl border border-white/10 overflow-hidden"
      style={{
        background: `linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.15))`,
        animation: "cin-rise 700ms var(--ease-editorial, cubic-bezier(0.22,1,0.36,1)) 1100ms both",
      }}
    >
      <div className="p-5 md:p-6">
        <div className="flex items-end justify-between mb-4">
          <div>
            <div className="text-[10px] tracking-[0.22em] uppercase font-[family-name:var(--font-jetbrains)]" style={{ color: accent }}>
              Trajectoire décennale
            </div>
            <div className="mt-1 text-[14px] text-[color:var(--nafas-ink3)]">
              CO₂ cumulé · année 1 → 10
            </div>
          </div>
          <div className="text-[11px] tracking-[0.12em] uppercase font-[family-name:var(--font-jetbrains)] text-[color:var(--nafas-ink3)] tabular-nums">
            max {(max / 1000).toFixed(1)} t
          </div>
        </div>
        <div className="grid grid-cols-10 gap-2 h-40 items-end">
          {projections.map((p, i) => {
            const h = Math.round((p.cumulative_co2_kg / max) * 100);
            return (
              <div key={p.year} className="relative h-full group/bar">
                <div
                  className="absolute inset-x-0 bottom-0 rounded-t-md"
                  style={{
                    height: `${h}%`,
                    background: `linear-gradient(180deg, ${accent}, ${accent}55 70%, ${accent}22)`,
                    boxShadow: `0 0 24px -6px ${accent}77`,
                    animation: `cin-grow 800ms var(--ease-editorial, cubic-bezier(0.22,1,0.36,1)) ${i * 90 + 1100}ms both`,
                    transformOrigin: "bottom",
                  }}
                  title={`An ${p.year} · ${p.cumulative_co2_kg} kg CO₂`}
                />
                <div className="absolute -bottom-5 inset-x-0 text-center text-[9.5px] font-[family-name:var(--font-jetbrains)] text-[color:var(--nafas-ink3)] tabular-nums">
                  {p.year}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <style jsx>{`
        @keyframes cin-grow {
          from { transform: scaleY(0); opacity: 0; }
          to { transform: scaleY(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
