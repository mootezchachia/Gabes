"use client";

import { useEffect, useMemo, useState } from "react";
import { Sparkles, MapPin, Info, AlertTriangle } from "lucide-react";
import {
  deriveImpact,
  COMPONENT_LABEL,
  type Components,
  type Strategy,
} from "@/lib/sim/impact";

export interface PlacementCardProps {
  index: number; // 1-based
  location: { lon: number; lat: number };
  score: number;
  components: Components;
  rationale_md: string | null;
  model_name: string;
  strategy: Strategy;
  totalZones: number;
}

const STRATEGY_THEME: Record<
  Strategy,
  { label: string; accent: string; tint: string; tintStrong: string }
> = {
  phosphate_recovery: {
    label: "Récupération phosphate",
    accent: "#EF9F27",
    tint: "rgba(239,159,39,0.08)",
    tintStrong: "rgba(239,159,39,0.22)",
  },
  school_protection: {
    label: "Protection écoles",
    accent: "#E24B4A",
    tint: "rgba(226,75,74,0.08)",
    tintStrong: "rgba(226,75,74,0.22)",
  },
  biodiversity: {
    label: "Biodiversité marine",
    accent: "#3EC99A",
    tint: "rgba(62,201,154,0.08)",
    tintStrong: "rgba(62,201,154,0.22)",
  },
};

const COMP_ORDER: Array<keyof Components> = ["ps", "df", "mo", "sl", "sd", "pp"];

const COMP_SHORT: Record<string, string> = {
  ps: "Phosphate",
  df: "Bathymétrie",
  mo: "Biodiversité",
  sl: "Salinité",
  sd: "Écoles ↓vent",
  pp: "Population",
};

/**
 * ORACLE placement — hero card.
 *
 * Design intent:
 *  - Big zone index (Fraunces display), strategy chip, model badge top row.
 *  - Giant score ring + top-2 drivers adjacent.
 *  - Full 6-criterion bar chart directly below.
 *  - 4 derived-impact tiles (kg P / posidonia / schools / people).
 *  - Rationale in Fraunces italic as the editorial closer. Falls back to a
 *    non-apologetic placeholder when LLM is down.
 *
 * No external chart lib — bars are plain CSS. Cheap, fast, controllable.
 */
export function PlacementCard(props: PlacementCardProps) {
  const { index, location, score, components, rationale_md, model_name, strategy, totalZones } = props;
  const theme = STRATEGY_THEME[strategy] ?? STRATEGY_THEME.phosphate_recovery;
  const impact = useMemo(() => deriveImpact(components, strategy), [components, strategy]);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setRevealed(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const scorePct = Math.round(score * 100);
  const scoreTone =
    score >= 0.7 ? "text-[color:var(--nafas-accent2)]"
    : score >= 0.55 ? "text-[color:var(--nafas-surface)]"
    : "text-[color:var(--nafas-amber)]";

  const llmOk = !!rationale_md;

  return (
    <article
      className="relative rounded-xl border border-white/10 bg-[color:var(--nafas-bg2)]/80 backdrop-blur-sm overflow-hidden transition-all duration-500 ease-[var(--ease-editorial)]"
      style={{
        transform: revealed ? "translateY(0)" : "translateY(8px)",
        opacity: revealed ? 1 : 0,
        transitionDelay: `${(index - 1) * 60}ms`,
      }}
    >
      {/* left accent bar colored per strategy */}
      <div
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{ background: `linear-gradient(180deg, ${theme.accent}, transparent 90%)` }}
      />

      <div className="p-4 pl-5 space-y-4">
        {/* header row */}
        <div className="flex items-start gap-3">
          <div className="shrink-0">
            <div
              className="text-[48px] leading-[0.9] font-[family-name:var(--font-fraunces)] font-light tracking-[-0.04em]"
              style={{ color: theme.accent }}
            >
              {index.toString().padStart(2, "0")}
            </div>
            <div className="text-[9.5px] tracking-[0.2em] uppercase font-[family-name:var(--font-jetbrains)] text-[color:var(--nafas-ink3)]">
              Zone · {totalZones}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
              <span
                className="inline-flex items-center gap-1 text-[10px] tracking-[0.16em] uppercase font-[family-name:var(--font-jetbrains)] px-2 py-0.5 rounded-[4px]"
                style={{ color: theme.accent, background: theme.tint, border: `1px solid ${theme.tintStrong}` }}
              >
                <Sparkles className="size-2.5" />
                {theme.label}
              </span>
              <span
                className="inline-flex items-center text-[10px] tracking-[0.14em] uppercase font-[family-name:var(--font-jetbrains)] px-2 py-0.5 rounded-[4px] border border-white/10 text-[color:var(--nafas-ink3)]"
                title={model_name}
              >
                {llmOk ? "LLM · " : "LLM · N/A"}
                {llmOk
                  ? (model_name || "").split("/").pop()?.replace(":free", "").slice(0, 16) || "ok"
                  : ""}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] font-[family-name:var(--font-jetbrains)] text-[color:var(--nafas-ink3)] tabular-nums">
              <MapPin className="size-3" />
              {location.lat.toFixed(4)}°N &nbsp;·&nbsp; {location.lon.toFixed(4)}°E
              <span className="ml-auto text-[10px] tracking-[0.14em] uppercase">
                {impact.area_ha} ha · {impact.capex_keur} k€
              </span>
            </div>
          </div>

          {/* score ring */}
          <div className="shrink-0 grid place-items-center">
            <ScoreRing value={score} color={theme.accent} />
            <div className={`mt-1 text-[10px] tracking-[0.16em] uppercase font-[family-name:var(--font-jetbrains)] ${scoreTone}`}>
              Score {scorePct}
            </div>
          </div>
        </div>

        {/* criterion bars */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-[9.5px] tracking-[0.2em] uppercase font-[family-name:var(--font-jetbrains)] text-[color:var(--nafas-ink3)] mb-1">
            <Info className="size-2.5" />
            Profil 6-critères · pondéré par stratégie
          </div>
          <div className="grid grid-cols-6 gap-1.5">
            {COMP_ORDER.map((k) => {
              const v = Math.max(0, Math.min(1, components[k] ?? 0));
              const isDriver = impact.drivers.some((d) => d.key === k);
              return (
                <div key={k} className="flex flex-col gap-1">
                  <div
                    className="relative h-12 rounded-[3px] border border-white/5 overflow-hidden bg-black/25"
                    title={`${COMPONENT_LABEL[k as string]} · ${v.toFixed(2)}`}
                  >
                    <div
                      className="absolute inset-x-0 bottom-0 transition-all duration-700 ease-[var(--ease-editorial)]"
                      style={{
                        height: revealed ? `${v * 100}%` : "0%",
                        background: isDriver
                          ? `linear-gradient(180deg, ${theme.accent}, ${theme.accent}aa 70%, ${theme.accent}44)`
                          : "linear-gradient(180deg, rgba(255,255,255,0.32), rgba(255,255,255,0.12))",
                        transitionDelay: `${(index - 1) * 60 + 80}ms`,
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[8.5px] tracking-[0.08em] uppercase text-[color:var(--nafas-ink3)]">
                      {COMP_SHORT[k as string]}
                    </span>
                    <span
                      className={`text-[9px] font-[family-name:var(--font-jetbrains)] tabular-nums ${
                        isDriver ? "" : "text-[color:var(--nafas-ink3)]/60"
                      }`}
                      style={isDriver ? { color: theme.accent } : undefined}
                    >
                      {v.toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* derived impact tiles */}
        <div className="grid grid-cols-4 gap-px bg-white/5 rounded-md overflow-hidden border border-white/5">
          <ImpactTile
            value={impact.p_year1_kg.toFixed(1)}
            unit="kg"
            label="Phosphate / an"
            accent={theme.accent}
            emphasize={strategy === "phosphate_recovery"}
          />
          <ImpactTile
            value={`+${impact.posidonia_gain_pp.toFixed(2)}`}
            unit="pp"
            label="Posidonia / an"
            accent={theme.accent}
            emphasize={strategy === "biodiversity"}
          />
          <ImpactTile
            value={impact.schools_sheltered.toString()}
            unit=""
            label="Écoles protégées"
            accent={theme.accent}
            emphasize={strategy === "school_protection"}
          />
          <ImpactTile
            value={impact.people_reached_k.toFixed(1)}
            unit="k"
            label="Habitants"
            accent={theme.accent}
            emphasize={false}
          />
        </div>

        {/* rationale (hero editorial line) */}
        <div
          className="relative px-4 py-3 rounded-md border border-white/5"
          style={{ background: theme.tint }}
        >
          <div
            aria-hidden
            className="absolute top-2 left-2 text-[30px] leading-[0.6] font-[family-name:var(--font-fraunces)] italic opacity-20 select-none"
            style={{ color: theme.accent }}
          >
            &ldquo;
          </div>
          <p className="pl-5 text-[14px] leading-[1.55] font-[family-name:var(--font-fraunces)] italic text-[color:var(--nafas-surface)]">
            {llmOk ? (
              rationale_md
            ) : (
              <span className="text-[color:var(--nafas-ink3)]">
                Zone retenue sur critères dominants : <strong className="not-italic text-[color:var(--nafas-surface)]">
                  {impact.drivers.map((d) => `${COMP_SHORT[d.key as string]} (${d.value.toFixed(2)})`).join(" + ")}
                </strong>. Impact attendu première année : {impact.p_year1_kg.toFixed(1)} kg de phosphate retirés, {impact.schools_sheltered} école(s) dans le cône de protection.
              </span>
            )}
          </p>
          {!llmOk ? (
            <div className="mt-2 pl-5 flex items-center gap-1.5 text-[10px] tracking-[0.14em] uppercase font-[family-name:var(--font-jetbrains)] text-[color:var(--nafas-amber)]">
              <AlertTriangle className="size-2.5" />
              Narration LLM indisponible · chiffres dérivés des coefficients scientifiques
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

/* --------------------------- ScoreRing ----------------------------- */

function ScoreRing({ value, color }: { value: number; color: string }) {
  const v = Math.max(0, Math.min(1, value));
  const R = 22;
  const C = 2 * Math.PI * R;
  const dash = C * v;
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden>
      <circle cx="28" cy="28" r={R} stroke="rgba(255,255,255,0.1)" strokeWidth="3" fill="none" />
      <circle
        cx="28"
        cy="28"
        r={R}
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
        strokeDasharray={`${dash} ${C}`}
        transform="rotate(-90 28 28)"
        style={{ transition: "stroke-dasharray 800ms var(--ease-editorial)" }}
      />
      <text
        x="28"
        y="31"
        textAnchor="middle"
        fontFamily="var(--font-fraunces)"
        fontSize="18"
        fontWeight="300"
        fill="white"
      >
        {Math.round(v * 100)}
      </text>
    </svg>
  );
}

/* --------------------------- ImpactTile --------------------------- */

function ImpactTile({
  value,
  unit,
  label,
  accent,
  emphasize,
}: {
  value: string;
  unit: string;
  label: string;
  accent: string;
  emphasize: boolean;
}) {
  return (
    <div
      className="relative p-2.5 bg-[color:var(--nafas-bg2)]"
      style={emphasize ? { background: `linear-gradient(180deg, ${accent}18, transparent 80%)` } : undefined}
    >
      <div
        className="text-[22px] leading-none font-[family-name:var(--font-fraunces)] tracking-tight tabular-nums mb-1"
        style={{ color: emphasize ? accent : "var(--nafas-surface)" }}
      >
        {value}
        {unit ? (
          <span className="text-[11px] font-[family-name:var(--font-jetbrains)] tracking-normal opacity-70 ml-1">
            {unit}
          </span>
        ) : null}
      </div>
      <div className="text-[9.5px] tracking-[0.12em] uppercase font-[family-name:var(--font-jetbrains)] text-[color:var(--nafas-ink3)] leading-tight">
        {label}
      </div>
      {emphasize ? (
        <div
          aria-hidden
          className="absolute top-1.5 right-1.5 size-1 rounded-full"
          style={{ background: accent }}
        />
      ) : null}
    </div>
  );
}
