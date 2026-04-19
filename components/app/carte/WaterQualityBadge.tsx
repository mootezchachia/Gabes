"use client";

import { useEffect, useState } from "react";
import { Droplets } from "lucide-react";

type Prediction = {
  label: string;
  risk_level: number;
  confidence: number;
  who_threshold_breaches: string[];
};

const RISK_COLOR = ["#4CAF50", "#FF9800", "#FF5722", "#F44336"] as const;

const GABES_READING = {
  pb: 0.025, cd: 0.002, ni: 0.03, hg: 0.0005,
  cr: 0.02, as: 0.008, p: 0.15, n_ox: 0.5,
  n_other: 0.3, temp: 24, ph: 7.8, dgas: 6.5,
  optical: 12, month: new Date().getMonth() + 1,
  season_enc: Math.floor(((new Date().getMonth() + 1) % 12) / 3),
  lat: 33.88, lon: 10.10, elevation: 1, water_type_enc: 2,
};

export function WaterQualityBadge() {
  const [data, setData] = useState<Prediction | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch("/api/water-quality", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(GABES_READING),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => {});
  }, []);

  const color = data ? (RISK_COLOR[data.risk_level] ?? "#888") : "var(--nafas-ink3)";

  return (
    <div
      className="absolute bottom-6 right-4 z-30 flex flex-col items-end gap-2"
      style={{ pointerEvents: "auto" }}
    >
      {/* Expanded detail card */}
      {expanded && data && (
        <div
          className="rounded-lg border border-white/10 p-4 flex flex-col gap-3 w-[220px]"
          style={{
            background: "color-mix(in srgb, #06090D 85%, transparent)",
            backdropFilter: "blur(16px)",
          }}
        >
          <div className="flex items-center gap-2">
            <span
              className="size-2 rounded-full shrink-0 animate-pulse"
              style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
            />
            <span
              className="font-[family-name:var(--font-fraunces)] text-[15px] italic font-light"
              style={{ color }}
            >
              {data.label}
            </span>
            <span className="ml-auto font-[family-name:var(--font-jetbrains)] text-[9px] text-[color:var(--nafas-ink3)]">
              {(data.confidence * 100).toFixed(0)}%
            </span>
          </div>

          {data.who_threshold_breaches.length > 0 && (
            <div className="flex flex-col gap-1 border-t border-white/[0.06] pt-2">
              <div className="font-[family-name:var(--font-jetbrains)] text-[9px] uppercase tracking-[0.2em] text-[color:var(--nafas-danger)]">
                Dépassements OMS
              </div>
              {data.who_threshold_breaches.slice(0, 3).map((b) => (
                <div key={b} className="flex items-start gap-1.5 text-[10px] text-[color:var(--nafas-danger)]/80">
                  <span className="mt-[4px] size-[4px] rounded-full bg-[color:var(--nafas-danger)] shrink-0" />
                  <span className="truncate">{b}</span>
                </div>
              ))}
            </div>
          )}

          <div className="font-[family-name:var(--font-jetbrains)] text-[9px] text-[color:var(--nafas-ink3)]/40 tracking-wide">
            Golfe de Gabès · 33.88°N 10.10°E
          </div>
        </div>
      )}

      {/* Compact pill badge */}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 cursor-pointer transition-colors hover:border-white/20"
        style={{
          background: "color-mix(in srgb, #06090D 85%, transparent)",
          backdropFilter: "blur(16px)",
        }}
      >
        <Droplets
          className="size-[13px]"
          style={{ color: data ? color : "var(--nafas-ink3)" }}
          strokeWidth={1.8}
        />
        <span className="font-[family-name:var(--font-jetbrains)] text-[10px] tracking-[0.15em] uppercase">
          {data ? (
            <span style={{ color }}>{data.label}</span>
          ) : (
            <span className="text-[color:var(--nafas-ink3)]">Eau · chargement…</span>
          )}
        </span>
      </button>
    </div>
  );
}
