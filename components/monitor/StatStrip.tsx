"use client";

import { ArrowUp, ArrowDown } from "lucide-react";

type Tone = "danger" | "amber" | "surface" | "accent";

type Trend = "up" | "down";

type Stat = {
  label: string;
  value: string;
  tone: Tone;
  sub: string;
  trend: Trend;
};

const STATS: Stat[] = [
  {
    label: "SO₂ max 24h",
    value: "340 µg/m³",
    tone: "danger",
    sub: "Seuil OMS ×8.5",
    trend: "up",
  },
  {
    label: "Capteurs actifs",
    value: "38/42",
    tone: "surface",
    sub: "90 % en ligne",
    trend: "down",
  },
  {
    label: "Alertes ouvertes",
    value: "2",
    tone: "amber",
    sub: "Chatt Essalam · Stratos",
    trend: "up",
  },
];

const TONE_COLOR: Record<Tone, string> = {
  danger: "text-[color:var(--nafas-danger)]",
  amber: "text-[color:var(--nafas-amber)]",
  surface: "text-[color:var(--nafas-surface)]",
  accent: "text-[color:var(--nafas-accent2)]",
};

export function StatStrip() {
  return (
    <div className="flex flex-col gap-2">
      {STATS.map((s) => {
        const TrendIcon = s.trend === "up" ? ArrowUp : ArrowDown;
        const trendColor =
          s.trend === "up"
            ? "text-[color:var(--nafas-danger)]"
            : "text-[color:var(--nafas-accent2)]";
        return (
          <div
            key={s.label}
            className="relative rounded-lg border border-white/10 bg-black/30 p-3 transition-colors hover:border-white/15"
          >
            <div className="flex items-center justify-between">
              <span className="font-[family-name:var(--font-jetbrains)] text-[10px] uppercase tracking-wider text-[color:var(--nafas-ink3)]">
                {s.label}
              </span>
              <span className="size-1 rounded-full bg-[color:var(--nafas-ink3)]/40" />
            </div>
            <div
              className={`mt-1.5 font-[family-name:var(--font-fraunces)] text-[26px] font-light leading-none tracking-tight ${TONE_COLOR[s.tone]}`}
            >
              {s.value}
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[color:var(--nafas-ink3)]">
              <TrendIcon className={`size-3 ${trendColor}`} strokeWidth={2.5} />
              <span>{s.sub}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
