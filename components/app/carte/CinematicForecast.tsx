"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { X, Sparkles, Building2, TrendingUp, AlertTriangle, Radar } from "lucide-react";
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

const CURRENT_YEAR = 2026;

/**
 * ORACLE · Dossier cinématique.
 *
 * Full-viewport dramatic overlay used for the jury demo. Triggered when a
 * building is selected on /app/carte (the big "Lancer le dossier ORACLE"
 * CTA on a PlacementCard). Flow:
 *   1. Drawer closes and camera flies to the building (handled by caller).
 *   2. Overlay fades + scales in over the Cesium globe (globe stays visible
 *      through the backdrop so the zone location remains legible).
 *   3. While the AI forecast is being fetched, an animated scanning banner
 *      plays over the strategy-tinted backdrop.
 *   4. Once projections land, headline numbers count up from 0, the 10-year
 *      bar chart animates left-to-right, and the LLM brief fades in.
 *
 * Atmosphere: floating motes drift upward, a horizontal scanline sweeps,
 * a subtle strategy-tinted radial glow pulses. None heavy — total animation
 * budget stays well under 60 fps on low-end laptops.
 *
 * Dismiss with Escape, the ✕ button, or the footer "Reprendre" CTA.
 */
export function CinematicForecast() {
  const open = useCinematicStore((s) => s.open);
  const loading = useCinematicStore((s) => s.loading);
  const error = useCinematicStore((s) => s.error);
  const brief = useCinematicStore((s) => s.brief_md);
  const briefError = useCinematicStore((s) => s.brief_error);
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
  const horizon = projections.length;

  return (
    <div className="fixed inset-0 z-[60] pointer-events-auto">
      {/* Dark cinematic backdrop — Cesium globe remains visible through it */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 50% 35%, ${accent}26, transparent 65%),
            radial-gradient(ellipse 50% 40% at 15% 90%, ${accent}14, transparent 70%),
            linear-gradient(180deg, rgba(4,6,10,0.82) 0%, rgba(4,6,10,0.94) 55%, rgba(4,6,10,0.82) 100%)
          `,
          backdropFilter: "blur(3px) saturate(120%)",
          animation: "cin-fadein 600ms cubic-bezier(0.22,1,0.36,1) both",
        }}
      />

      {/* Subtle grain */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-[0.07]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      {/* Floating motes */}
      <div aria-hidden className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 22 }).map((_, i) => {
          const left = (i * 47) % 100;
          const delay = (i * 0.7) % 10;
          const duration = 14 + ((i * 3) % 9);
          const size = 1 + (i % 3);
          return (
            <span
              key={i}
              className="absolute rounded-full"
              style={{
                left: `${left}%`,
                bottom: "-10px",
                width: size,
                height: size,
                background: `${accent}cc`,
                boxShadow: `0 0 ${size * 4}px ${accent}88`,
                animation: `cin-rise-mote ${duration}s linear ${delay}s infinite`,
                opacity: 0,
              }}
            />
          );
        })}
      </div>

      {/* Top scanline sweep */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 pointer-events-none h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${accent}cc, transparent)`,
          animation: "cin-scanline 3s cubic-bezier(0.7, 0, 0.3, 1) infinite",
        }}
      />

      {/* Close button */}
      <button
        type="button"
        onClick={close}
        className="absolute top-5 right-5 size-10 grid place-items-center rounded-full border border-white/10 bg-black/35 text-[color:var(--nafas-ink3)] hover:text-[color:var(--nafas-surface)] hover:bg-black/55 backdrop-blur-sm transition-colors z-[3]"
        aria-label="Fermer"
        title="Fermer (Esc)"
      >
        <X className="size-4" />
      </button>

      {/* Inner container — scales and fades in for the dramatic reveal */}
      <div
        className="relative z-[1] h-full max-h-screen overflow-y-auto"
        style={{
          animation: "cin-scalein 700ms cubic-bezier(0.22,1,0.36,1) both",
          transformOrigin: "center 40%",
        }}
      >
        <div className="max-w-[1120px] mx-auto px-8 py-10 md:py-14 space-y-9">
          {/* Eyebrow */}
          <div
            className="flex items-center gap-2.5 text-[11px] tracking-[0.32em] uppercase font-[family-name:var(--font-jetbrains)]"
            style={{
              color: accent,
              animation: "cin-rise 500ms cubic-bezier(0.22,1,0.36,1) 120ms both",
            }}
          >
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full rounded-full opacity-75 animate-ping" style={{ background: accent }} />
              <span className="relative inline-flex size-1.5 rounded-full" style={{ background: accent }} />
            </span>
            <Sparkles className="size-3" />
            ORACLE · Dossier zone {open.index.toString().padStart(2, "0")}
            <span className="mx-3 h-px flex-1 max-w-[240px]" style={{ background: `linear-gradient(90deg, ${accent}88, transparent)` }} />
            <span className="text-[color:var(--nafas-ink3)] shrink-0">
              {building ? `${open.location.lat.toFixed(4)}°N · ${open.location.lon.toFixed(4)}°E` : "—"}
            </span>
          </div>

          {/* Building name — the cinematic lead */}
          <div
            className="flex items-start gap-4"
            style={{ animation: "cin-rise 700ms cubic-bezier(0.22,1,0.36,1) 200ms both" }}
          >
            <div
              aria-hidden
              className="shrink-0 size-16 rounded-2xl grid place-items-center border"
              style={{
                borderColor: `${accent}55`,
                background: `linear-gradient(180deg, ${accent}22, transparent)`,
              }}
            >
              <Building2 className="size-7" style={{ color: accent }} />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-[family-name:var(--font-fraunces)] italic font-light text-[clamp(36px,6.5vw,68px)] leading-[1.02] tracking-[-0.02em] text-[color:var(--nafas-surface)]">
                {building?.name ?? "Bâtiment sélectionné"}
              </h1>
              <div className="mt-2.5 text-[12.5px] tracking-[0.14em] uppercase font-[family-name:var(--font-jetbrains)] text-[color:var(--nafas-ink3)] flex flex-wrap gap-x-4 gap-y-1">
                <span>{typeLbl}</span>
                {building ? <span>·  {building.surface_m2} m² disponibles</span> : null}
                {building ? <span>·  {building.occupants} occupants/j</span> : null}
                <span style={{ color: accent }}>·  {stratLbl}</span>
              </div>
            </div>
          </div>

          {/* Thin decorative rule */}
          <div
            aria-hidden
            className="h-px"
            style={{
              background: `linear-gradient(90deg, transparent, ${accent}55, transparent)`,
              animation: "cin-rise 700ms cubic-bezier(0.22,1,0.36,1) 280ms both",
            }}
          />

          {/* State banners */}
          {loading ? <LoadingBanner accent={accent} /> : null}
          {error ? <ErrorBanner message={error} /> : null}

          {/* Giant counters */}
          {last ? (
            <div
              className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/5 rounded-2xl overflow-hidden border border-white/10"
              style={{
                boxShadow: `0 40px 120px -40px ${accent}55, 0 8px 32px -12px rgba(0,0,0,0.5)`,
                animation: "cin-rise 700ms cubic-bezier(0.22,1,0.36,1) 380ms both",
              }}
            >
              <BigStat
                label="CO₂ absorbé · 10 ans"
                target={last.cumulative_co2_kg / 1000}
                suffix=" t"
                decimals={1}
                accent={accent}
                emphasize={open.strategy === "air_quality"}
                delay={560}
              />
              <BigStat
                label="Occupants × années"
                target={last.cumulative_occupants_k_years}
                suffix=" k·an"
                decimals={1}
                accent={accent}
                emphasize={open.strategy === "vulnerable_pop"}
                delay={760}
              />
              <BigStat
                label="Δ température stabilisée"
                target={last.thermal_c}
                prefix="−"
                suffix=" °C"
                decimals={1}
                accent={accent}
                emphasize={open.strategy === "heat_resilience"}
                delay={960}
              />
            </div>
          ) : null}

          {/* 10-year bars with timeline */}
          {projections.length > 0 ? (
            <ProjectionTimeline
              projections={projections}
              accent={accent}
              horizon={horizon}
            />
          ) : null}

          {/* Brief */}
          {brief ? (
            <div
              className="relative rounded-2xl border overflow-hidden"
              style={{
                borderColor: `${accent}33`,
                background: `linear-gradient(180deg, ${accent}14, rgba(0,0,0,0.22))`,
                animation: "cin-rise 700ms cubic-bezier(0.22,1,0.36,1) 1650ms both",
              }}
            >
              <div
                aria-hidden
                className="absolute inset-y-0 left-0 w-[3px]"
                style={{ background: `linear-gradient(180deg, ${accent}, transparent 95%)` }}
              />
              <div
                aria-hidden
                className="absolute top-4 left-6 text-[96px] leading-none font-[family-name:var(--font-fraunces)] italic opacity-[0.12] select-none pointer-events-none"
                style={{ color: accent }}
              >
                &ldquo;
              </div>
              <div className="relative p-7 md:p-9 pl-16">
                <div className="flex items-center gap-2 mb-4 text-[10px] tracking-[0.28em] uppercase font-[family-name:var(--font-jetbrains)]" style={{ color: accent }}>
                  <TrendingUp className="size-3" />
                  Note d&apos;orientation · Municipalité de Gabès
                  {modelName ? (
                    <span className="ml-auto text-[color:var(--nafas-ink3)]">
                      LLM · {modelName.split("/").pop()?.replace(":free", "")}
                    </span>
                  ) : null}
                </div>
                <div className="text-[16.5px] md:text-[18px] leading-[1.65] font-[family-name:var(--font-fraunces)] italic text-[color:var(--nafas-surface)] whitespace-pre-wrap">
                  {brief}
                </div>
              </div>
            </div>
          ) : !loading && !error && projections.length > 0 ? (
            <div
              className="flex items-center gap-3 rounded-xl border border-[color:var(--nafas-amber)]/25 bg-[color:var(--nafas-amber)]/[0.06] px-4 py-3"
              style={{ animation: "cin-rise 700ms cubic-bezier(0.22,1,0.36,1) 1650ms both" }}
              title={briefError ?? undefined}
            >
              <AlertTriangle className="size-4 text-[color:var(--nafas-amber)] shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[11.5px] tracking-[0.14em] uppercase font-[family-name:var(--font-jetbrains)] text-[color:var(--nafas-amber)]">
                  Narration LLM indisponible
                </div>
                <div className="mt-0.5 text-[12.5px] text-[color:var(--nafas-ink3)]">
                  Chiffres dérivés déterministes affichés ci-dessus · la note est régénérable via « Relancer ».
                </div>
              </div>
            </div>
          ) : null}

          {/* Footer controls */}
          <div className="flex items-center justify-between pt-2 pb-2">
            <div className="flex items-center gap-2 text-[10px] tracking-[0.22em] uppercase font-[family-name:var(--font-jetbrains)] text-[color:var(--nafas-ink3)]">
              <Radar className="size-3" />
              Esc · fermer
            </div>
            <button
              type="button"
              onClick={close}
              className="text-[11px] tracking-[0.14em] uppercase font-[family-name:var(--font-jetbrains)] px-6 py-2.5 rounded-md text-black transition-transform hover:scale-[1.02]"
              style={{
                background: accent,
                boxShadow: `0 10px 28px -10px ${accent}99`,
              }}
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
        @keyframes cin-scalein {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes cin-rise {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes cin-scanline {
          0% { transform: translateY(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 0.4; }
          100% { transform: translateY(100vh); opacity: 0; }
        }
        @keyframes cin-rise-mote {
          0% { transform: translateY(0); opacity: 0; }
          10% { opacity: 0.9; }
          90% { opacity: 0.6; }
          100% { transform: translateY(-110vh); opacity: 0; }
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
        borderColor: `${accent}55`,
        background: `linear-gradient(90deg, rgba(255,255,255,0.02), ${accent}18)`,
        animation: "cin-rise 500ms cubic-bezier(0.22,1,0.36,1) both",
      }}
    >
      <div
        aria-hidden
        className="absolute inset-y-0 w-40"
        style={{
          background: `linear-gradient(90deg, transparent, ${accent}55, transparent)`,
          animation: "cin-sweep 1.6s linear infinite",
        }}
      />
      <div className="relative px-6 py-4 flex items-center gap-3">
        <span className="relative flex size-2.5">
          <span
            className="absolute inline-flex size-full rounded-full opacity-60 animate-ping"
            style={{ background: accent }}
          />
          <span
            className="relative inline-flex size-2.5 rounded-full"
            style={{ background: accent }}
          />
        </span>
        <span
          className="text-[12.5px] tracking-[0.14em] uppercase font-[family-name:var(--font-jetbrains)]"
          style={{ color: accent }}
        >
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
      const duration = 1200;
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
      className="relative p-7 md:p-9 bg-[color:var(--nafas-bg2)]/80 backdrop-blur-sm"
      style={
        emphasize
          ? { background: `linear-gradient(180deg, ${accent}26, transparent 80%)` }
          : undefined
      }
    >
      {emphasize ? (
        <div
          aria-hidden
          className="absolute top-0 left-0 right-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
        />
      ) : null}
      <div
        className="font-[family-name:var(--font-fraunces)] font-light tracking-[-0.03em] leading-none tabular-nums text-[clamp(44px,6vw,76px)]"
        style={{ color: emphasize ? accent : "var(--nafas-surface)" }}
      >
        {prefix}
        {shown.toFixed(decimals)}
        <span className="text-[clamp(14px,1.6vw,19px)] tracking-normal opacity-70 font-[family-name:var(--font-jetbrains)] ml-1.5">
          {suffix}
        </span>
      </div>
      <div className="mt-3 text-[10.5px] tracking-[0.22em] uppercase font-[family-name:var(--font-jetbrains)] text-[color:var(--nafas-ink3)]">
        {label}
      </div>
      {emphasize ? (
        <div
          aria-hidden
          className="absolute top-3 right-3 flex items-center gap-1.5 text-[9px] tracking-[0.18em] uppercase font-[family-name:var(--font-jetbrains)]"
          style={{ color: accent }}
        >
          <span className="size-1.5 rounded-full" style={{ background: accent }} />
          Objectif
        </div>
      ) : null}
    </div>
  );
}

function ProjectionTimeline({
  projections,
  accent,
  horizon,
}: {
  projections: CinematicProjection[];
  accent: string;
  horizon: number;
}) {
  // Kept for backward-compat with any CallbackProperty still wired into the
  // component below. The timeline doesn't use Cesium ellipses but the
  // placement focus marker in the same file needs the same race-safe
  // pattern as AlertCinematic. If future refactors add more pulse halos
  // here, reuse the `bucket` trick below.
  const max = useMemo(
    () => projections.reduce((m, p) => Math.max(m, p.cumulative_co2_kg), 0) || 1,
    [projections],
  );
  const totalTons = (projections[projections.length - 1]?.cumulative_co2_kg ?? 0) / 1000;
  const startYear = CURRENT_YEAR;
  const endYear = CURRENT_YEAR + horizon - 1;

  return (
    <div
      className="rounded-2xl border border-white/10 overflow-hidden"
      style={{
        background: "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.22))",
        animation: "cin-rise 700ms cubic-bezier(0.22,1,0.36,1) 1150ms both",
      }}
    >
      <div className="px-6 py-6 md:px-8 md:py-7">
        <div className="flex items-end justify-between mb-5">
          <div>
            <div className="text-[10px] tracking-[0.24em] uppercase font-[family-name:var(--font-jetbrains)]" style={{ color: accent }}>
              Trajectoire décennale · CO₂ cumulé
            </div>
            <div className="mt-1.5 font-[family-name:var(--font-fraunces)] italic text-[22px] md:text-[26px] leading-tight text-[color:var(--nafas-surface)]">
              <span style={{ color: accent }}>{startYear}</span>
              {" → "}
              <span style={{ color: accent }}>{endYear}</span>
              {" · "}
              <span className="tabular-nums">{totalTons.toFixed(1)}</span>
              <span className="text-[14px] ml-1 text-[color:var(--nafas-ink3)] italic">t CO₂</span>
            </div>
          </div>
          <div className="text-right text-[10.5px] tracking-[0.14em] uppercase font-[family-name:var(--font-jetbrains)] text-[color:var(--nafas-ink3)] tabular-nums">
            pic année {horizon} · {(max / 1000).toFixed(1)} t
          </div>
        </div>

        {/* Axis reference line */}
        <div className="relative pb-6">
          <div aria-hidden className="absolute inset-x-0 bottom-5 h-px bg-white/10" />

          <div className="grid grid-cols-10 gap-2 h-48 items-end">
            {projections.map((p, i) => {
              const h = Math.round((p.cumulative_co2_kg / max) * 100);
              return (
                <div key={p.year} className="relative h-full group/bar">
                  {/* Tick */}
                  <div
                    aria-hidden
                    className="absolute -bottom-5 left-1/2 w-px h-2 bg-white/15"
                    style={{ transform: "translateX(-50%)" }}
                  />
                  <div
                    className="absolute inset-x-0 bottom-0 rounded-t-md origin-bottom"
                    style={{
                      height: `${h}%`,
                      background: `linear-gradient(180deg, ${accent}, ${accent}66 65%, ${accent}22)`,
                      boxShadow: `0 -8px 32px -8px ${accent}aa, inset 0 0 0 1px ${accent}33`,
                      animation: `cin-grow 900ms cubic-bezier(0.22,1,0.36,1) ${i * 90 + 1150}ms both`,
                    }}
                    title={`An ${p.year} · ${p.cumulative_co2_kg} kg CO₂ cumulés`}
                  />
                  <div
                    className="absolute -bottom-12 inset-x-0 text-center text-[10px] font-[family-name:var(--font-jetbrains)] tabular-nums"
                    style={{
                      color:
                        i === 0 || i === projections.length - 1
                          ? "var(--nafas-surface)"
                          : "var(--nafas-ink3)",
                    }}
                  >
                    {CURRENT_YEAR + i}
                  </div>
                </div>
              );
            })}
          </div>
          {/* push chart down so year labels fit */}
          <div className="h-6" />
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
