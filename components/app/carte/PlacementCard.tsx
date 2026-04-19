"use client";

import { useEffect, useMemo, useState } from "react";
import { Sparkles, MapPin, Info, AlertTriangle, Building2 } from "lucide-react";
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
  active?: boolean;
  onSelect?: () => void;
  building?: {
    id: string;
    name: string;
    type: string;
    surface_m2: number;
    occupants: number;
  };
}

const STRATEGY_THEME: Record<
  Strategy,
  { label: string; accent: string; tint: string; tintStrong: string }
> = {
  air_quality: {
    label: "Qualité de l'air",
    accent: "#EF9F27",
    tint: "rgba(239,159,39,0.08)",
    tintStrong: "rgba(239,159,39,0.22)",
  },
  vulnerable_pop: {
    label: "Populations vulnérables",
    accent: "#E24B4A",
    tint: "rgba(226,75,74,0.08)",
    tintStrong: "rgba(226,75,74,0.22)",
  },
  heat_resilience: {
    label: "Résilience thermique",
    accent: "#3EC99A",
    tint: "rgba(62,201,154,0.08)",
    tintStrong: "rgba(62,201,154,0.22)",
  },
};

const COMP_ORDER: Array<keyof Components> = ["ae", "bs", "po", "vu", "hi", "gr"];

const COMP_SHORT: Record<string, string> = {
  ae: "Exposition",
  bs: "Surface",
  po: "Occupants",
  vu: "Vulnérabilité",
  hi: "Chaleur",
  gr: "Verdure↓",
};

const TYPE_LABEL: Record<string, string> = {
  school: "École",
  hospital: "Hôpital",
  university: "Université",
  housing: "Résidence",
  office: "Administratif",
  mosque: "Mosquée",
  hotel: "Hôtel",
  mall: "Commerce",
  industrial: "Industriel",
};

/**
 * ORACLE placement — hero card (vegetal panel on a building).
 */
export function PlacementCard(props: PlacementCardProps) {
  const { index, location, score, components, rationale_md, model_name, strategy, totalZones, active, onSelect, building } = props;
  const theme = STRATEGY_THEME[strategy] ?? STRATEGY_THEME.air_quality;
  const impact = useMemo(
    () => deriveImpact(components, strategy, building?.surface_m2),
    [components, strategy, building?.surface_m2],
  );
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
  const typeLabel = building ? (TYPE_LABEL[building.type] ?? building.type) : null;

  return (
    <article
      onClick={onSelect}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={(e) => {
        if (!onSelect) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`group relative rounded-xl border overflow-hidden transition-all duration-500 ease-[var(--ease-editorial)] ${
        onSelect ? "cursor-pointer" : ""
      } ${
        active
          ? "border-white/25 bg-[color:var(--nafas-bg2)]"
          : "border-white/10 bg-[color:var(--nafas-bg2)]/80 hover:border-white/15"
      } backdrop-blur-sm`}
      style={{
        transform: revealed ? "translateY(0)" : "translateY(8px)",
        opacity: revealed ? 1 : 0,
        transitionDelay: `${(index - 1) * 60}ms`,
        boxShadow: active ? `0 0 0 1px ${theme.accent}66, 0 18px 40px -18px ${theme.accent}55` : undefined,
      }}
    >
      {/* left accent bar colored per strategy */}
      <div
        aria-hidden
        className="absolute inset-y-0 left-0 w-[3px] transition-opacity"
        style={{
          background: `linear-gradient(180deg, ${theme.accent}, transparent 90%)`,
          opacity: active ? 1 : 0.6,
        }}
      />
      {/* active glow */}
      {active ? (
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 60% 60% at 100% 0%, ${theme.tintStrong}, transparent 60%)`,
          }}
        />
      ) : null}

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
              Bât. · {totalZones}
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

            {building ? (
              <div className="flex items-center gap-1.5 text-[13px] font-[family-name:var(--font-fraunces)] italic text-[color:var(--nafas-surface)] leading-[1.25] mb-1">
                <Building2 className="size-3 text-[color:var(--nafas-ink3)]" />
                {building.name}
              </div>
            ) : null}

            <div className="flex items-center gap-1.5 text-[11px] font-[family-name:var(--font-jetbrains)] text-[color:var(--nafas-ink3)] tabular-nums">
              <MapPin className="size-3" />
              {location.lat.toFixed(4)}°N &nbsp;·&nbsp; {location.lon.toFixed(4)}°E
              <span className="ml-auto text-[10px] tracking-[0.14em] uppercase">
                {typeLabel ? `${typeLabel} · ` : ""}{impact.surface_m2} m² · {impact.capex_keur} k€
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
            value={impact.co2_kg_yr >= 1000 ? (impact.co2_kg_yr / 1000).toFixed(1) : impact.co2_kg_yr.toString()}
            unit={impact.co2_kg_yr >= 1000 ? "t" : "kg"}
            label="CO₂ / an"
            accent={theme.accent}
            emphasize={strategy === "air_quality"}
          />
          <ImpactTile
            value={impact.occupants_k.toFixed(1)}
            unit="k"
            label="Occupants desservis"
            accent={theme.accent}
            emphasize={strategy === "vulnerable_pop"}
          />
          <ImpactTile
            value={`−${impact.thermal_c.toFixed(1)}`}
            unit="°C"
            label="Îlot de chaleur"
            accent={theme.accent}
            emphasize={strategy === "heat_resilience"}
          />
          <ImpactTile
            value={impact.surface_m2.toString()}
            unit="m²"
            label="Surface végétale"
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
                Bâtiment retenu sur critères dominants : <strong className="not-italic text-[color:var(--nafas-surface)]">
                  {impact.drivers.map((d) => `${COMP_SHORT[d.key as string]} (${d.value.toFixed(2)})`).join(" + ")}
                </strong>. Impact attendu première année : {impact.co2_kg_yr} kg CO₂ absorbés, {impact.occupants_k.toFixed(1)} k occupants desservis, −{impact.thermal_c.toFixed(1)} °C en façade.
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

        {/* action row */}
        <div className="flex items-center gap-2 pt-1">
          <div className="flex items-center gap-1.5 text-[10px] tracking-[0.16em] uppercase font-[family-name:var(--font-jetbrains)] text-[color:var(--nafas-ink3)] tabular-nums">
            {active ? (
              <>
                <span
                  className="inline-block size-1.5 rounded-full"
                  style={{ background: theme.accent }}
                />
                Caméra · focus
              </>
            ) : (
              <>
                <span className="inline-block size-1.5 rounded-full bg-[color:var(--nafas-ink3)]/40 group-hover:bg-[color:var(--nafas-ink3)]/80 transition-colors" />
                {onSelect ? "Cliquer pour voir" : "Bâtiment candidat"}
              </>
            )}
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                // Deploy-to-server is not wired yet; until it is, the button
                // at least focuses the building on the globe (closes the
                // drawer, flies the camera, lights the halo/beam) so the
                // operator sees exactly where this plan lands.
                onSelect?.();
              }}
              className="text-[11px] tracking-[0.08em] uppercase font-[family-name:var(--font-jetbrains)] text-black px-3 py-1.5 rounded-md transition-opacity hover:opacity-90"
              style={{ background: theme.accent }}
              title="Ferme le tiroir, caméra sur le bâtiment, halo + faisceau verticaux"
            >
              Déployer sur le terrain →
            </button>
          </div>
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
