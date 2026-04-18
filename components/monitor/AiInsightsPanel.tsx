"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Activity, ShieldAlert, Timer } from "lucide-react";
import { useFakeStream } from "@/lib/monitor/useFakeStream";

const BRIEFS: readonly string[] = [
  "Convergence SO₂ + vent SSE 14 km/h + rentrée scolaire 07 h 45 → fenêtre de risque aiguë sur Chatt Essalem dans les 90 prochaines minutes.",
  "Le panache GCT se déplace vers le nord-nord-est ; croisement prévu avec le trafic scolaire matinal à Ghannouch. Hausse mesurée sur 6 capteurs du ring 1.",
  "Analyse multi-couches : plume TROPOMI + rush hour + inversion thermique matinale convergent sur le même polygone résidentiel. Seuil OMS dépassé depuis 42 min.",
  "Corrélation forte entre flux nocturne du complexe et pic SO₂ à 04 h 20 ; la bascule vent de terre vers mer a redistribué le panache vers les quartiers sud.",
  "Signal faible mais cohérent : trois capteurs ring 2 franchissent simultanément 150 µg/m³ — compatible avec un relâchement non-programmé côté SIAPE.",
];

// Stable, deterministic 24h forecast (µg/m³). One value per hour.
const FORECAST: readonly number[] = [
  22, 24, 28, 31, 34, 32, 29, 27, 33, 42, 51, 58,
  64, 71, 68, 59, 47, 38, 44, 52, 49, 41, 35, 30,
];

const WHO_THRESHOLD = 40;

function forecastPath(
  values: readonly number[],
  w: number,
  h: number,
  maxY: number
): string {
  const n = values.length;
  const stepX = w / (n - 1);
  return values
    .map((v, i) => {
      const x = (i * stepX).toFixed(2);
      const y = (h - (v / maxY) * h).toFixed(2);
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");
}

export function AiInsightsPanel() {
  const [briefIdx, setBriefIdx] = useState<number>(() =>
    Math.floor(Math.random() * BRIEFS.length)
  );

  // Rotate brief every 90s
  useEffect(() => {
    const t = setInterval(() => {
      setBriefIdx((i) => (i + 1 + Math.floor(Math.random() * (BRIEFS.length - 1))) % BRIEFS.length);
    }, 90_000);
    return () => clearInterval(t);
  }, []);

  const fullBrief = BRIEFS[briefIdx];
  const streamed = useFakeStream(fullBrief, 42);

  // Forecast geometry
  const W = 240;
  const H = 60;
  const maxY = Math.max(...FORECAST, WHO_THRESHOLD) * 1.1;
  const linePath = useMemo(() => forecastPath(FORECAST, W, H, maxY), [maxY]);
  const thresholdY = H - (WHO_THRESHOLD / maxY) * H;

  // Area path under curve (for that editorial wash)
  const areaPath = useMemo<string>(() => {
    const stepX = W / (FORECAST.length - 1);
    const top = FORECAST.map((v, i) => {
      const x = (i * stepX).toFixed(2);
      const y = (H - (v / maxY) * H).toFixed(2);
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    }).join(" ");
    return `${top} L${W.toFixed(2)},${H.toFixed(2)} L0,${H.toFixed(2)} Z`;
  }, [maxY]);

  // Segments above threshold → danger-colored overlay
  const dangerSegments = useMemo<string>(() => {
    const stepX = W / (FORECAST.length - 1);
    const parts: string[] = [];
    let running: string[] = [];
    for (let i = 0; i < FORECAST.length; i++) {
      const v = FORECAST[i];
      const x = (i * stepX).toFixed(2);
      const y = (H - (v / maxY) * H).toFixed(2);
      if (v >= WHO_THRESHOLD) {
        running.push(`${running.length === 0 ? "M" : "L"}${x},${y}`);
      } else if (running.length > 0) {
        parts.push(running.join(" "));
        running = [];
      }
    }
    if (running.length > 0) parts.push(running.join(" "));
    return parts.join(" ");
  }, [maxY]);

  // X-axis ticks every 6 hours
  const ticks = [0, 6, 12, 18, 24];

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2 shrink-0">
        <Activity size={10} className="text-[color:var(--nafas-accent2)]" aria-hidden />
        <span
          className="font-mono uppercase tracking-[0.2em] text-[color:var(--nafas-ink3)]"
          style={{ fontSize: 10.5 }}
        >
          AI Insights · Convergence
        </span>
        <span
          className="ml-auto font-mono uppercase tracking-wider text-[color:var(--nafas-ink3)]/60"
          style={{ fontSize: 9 }}
        >
          · scénarisé
        </span>
      </div>

      {/* Body: two columns — narrative left, chart right */}
      <div className="flex-1 min-h-0 grid grid-cols-[1.2fr_1fr] gap-4">
        {/* Narrative */}
        <div className="flex flex-col min-w-0">
          <p
            className="font-[family-name:var(--font-fraunces)] italic text-[color:var(--nafas-surface)] leading-snug"
            style={{ fontSize: 15 }}
          >
            {streamed || fullBrief}
            {streamed.length < fullBrief.length && (
              <span
                aria-hidden
                className="inline-block w-[0.45em] h-[0.9em] align-[-0.05em] ml-[2px] bg-[color:var(--nafas-accent2)] animate-pulse"
              />
            )}
          </p>

          {/* Footer actions */}
          <div className="mt-auto pt-2 flex items-center justify-between shrink-0">
            <button
              type="button"
              className="group inline-flex items-center gap-1 font-mono uppercase tracking-[0.18em] text-[color:var(--nafas-accent2)] hover:text-white transition-colors cursor-pointer"
              style={{ fontSize: 10 }}
            >
              Détails
              <ArrowUpRight
                size={11}
                className="transition-transform group-hover:translate-x-[1px] group-hover:-translate-y-[1px]"
                aria-hidden
              />
            </button>
          </div>
        </div>

        {/* Chart + stats */}
        <div className="flex flex-col gap-2 min-w-0">
          {/* Forecast sparkline */}
          <div className="relative">
            <div
              className="flex items-center justify-between mb-1 font-mono uppercase tracking-wider text-[color:var(--nafas-ink3)]"
              style={{ fontSize: 9 }}
            >
              <span>Prévision 24 h · SO₂</span>
              <span className="text-[color:var(--nafas-danger)]/80">· OMS 40</span>
            </div>
            <svg
              width={W}
              height={H + 10}
              viewBox={`0 0 ${W} ${H + 10}`}
              className="w-full h-auto"
              aria-hidden
            >
              <defs>
                <linearGradient id="nafas-forecast-fill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="var(--nafas-accent2)" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="var(--nafas-accent2)" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Area wash */}
              <path d={areaPath} fill="url(#nafas-forecast-fill)" />

              {/* WHO threshold line */}
              <line
                x1={0}
                x2={W}
                y1={thresholdY}
                y2={thresholdY}
                stroke="var(--nafas-danger)"
                strokeWidth={0.75}
                strokeDasharray="2,3"
                opacity={0.6}
              />

              {/* Base curve */}
              <path
                d={linePath}
                fill="none"
                stroke="var(--nafas-accent2)"
                strokeWidth={1.25}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Over-threshold overlay */}
              {dangerSegments && (
                <path
                  d={dangerSegments}
                  fill="none"
                  stroke="var(--nafas-danger)"
                  strokeWidth={1.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* X-axis ticks */}
              {ticks.map((t) => {
                const x = (t / 24) * W;
                return (
                  <g key={t}>
                    <line
                      x1={x}
                      x2={x}
                      y1={H}
                      y2={H + 3}
                      stroke="var(--nafas-ink3)"
                      strokeWidth={0.5}
                      opacity={0.5}
                    />
                    <text
                      x={x}
                      y={H + 9}
                      textAnchor={t === 0 ? "start" : t === 24 ? "end" : "middle"}
                      fill="var(--nafas-ink3)"
                      fontSize={7}
                      fontFamily="var(--font-jetbrains), monospace"
                      opacity={0.7}
                    >
                      {t}h
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Mini stats */}
          <div className="grid grid-cols-3 gap-1.5 shrink-0">
            <MiniStat
              icon={<ShieldAlert size={10} aria-hidden />}
              label="Risque"
              value="Élevé"
              color="var(--nafas-danger)"
            />
            <MiniStat
              icon={<Activity size={10} aria-hidden />}
              label="Confiance"
              value="78 %"
              color="var(--nafas-amber)"
            />
            <MiniStat
              icon={<Timer size={10} aria-hidden />}
              label="Horizon"
              value="90 min"
              color="var(--nafas-accent2)"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="px-1.5 py-1 rounded-sm bg-white/[0.03] border border-white/[0.06] min-w-0">
      <div
        className="flex items-center gap-1 font-mono uppercase tracking-wider text-[color:var(--nafas-ink3)]"
        style={{ fontSize: 8.5 }}
      >
        <span style={{ color }}>{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      <div
        className="font-[family-name:var(--font-fraunces)] mt-0.5 leading-tight truncate"
        style={{ fontSize: 14, color }}
      >
        {value}
      </div>
    </div>
  );
}
