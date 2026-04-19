"use client";

import { useEffect, useState } from "react";

type Prediction = {
  label: string;
  risk_level: number;
  confidence: number;
  probabilities: Record<string, number>;
  who_threshold_breaches: string[];
};

const RISK_COLOR = ["#4CAF50", "#FF9800", "#FF5722", "#F44336"] as const;
const RISK_GLOW  = [
  "rgba(76,175,80,0.5)",
  "rgba(255,152,0,0.5)",
  "rgba(255,87,34,0.5)",
  "rgba(244,67,54,0.5)",
] as const;

// Gabes coastal station sample — replace with live sensor feed when available
const GABES_READING = {
  pb: 0.025, cd: 0.002, ni: 0.03, hg: 0.0005,
  cr: 0.02, as: 0.008, p: 0.15, n_ox: 0.5,
  n_other: 0.3, temp: 24, ph: 7.8, dgas: 6.5,
  optical: 12, month: new Date().getMonth() + 1,
  season_enc: Math.floor(((new Date().getMonth() + 1) % 12) / 3),
  lat: 33.88, lon: 10.10, elevation: 1, water_type_enc: 2,
};

export function WaterQualityPanel() {
  const [data, setData]       = useState<Prediction | null>(null);
  const [error, setError]     = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/water-quality", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(GABES_READING),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  const color = data ? (RISK_COLOR[data.risk_level] ?? "#888") : "#888";
  const glow  = data ? (RISK_GLOW[data.risk_level]  ?? "none") : "none";

  return (
    <div className="tac-panel w-full h-full overflow-hidden">
      <div className="h-[2px] w-full" style={{ background: color, opacity: 0.7 }} />

      <div className="px-3 pt-2.5 pb-3 space-y-2">
        {/* Header */}
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="inline-block size-[7px] rounded-full animate-pulse"
            style={{ background: color, boxShadow: `0 0 6px ${glow}` }}
          />
          <span
            className="tac-label text-[10px] tracking-[0.28em] uppercase"
            style={{ color: "var(--nafas-cyan)" }}
          >
            QUALITÉ EAU · IA
          </span>
        </div>

        {/* State */}
        {loading && (
          <div className="tac-label text-[9.5px] text-[color:var(--nafas-ink3)]">
            Analyse en cours…
          </div>
        )}
        {error && (
          <div className="tac-label text-[9.5px] text-red-400">
            Modèle indisponible
          </div>
        )}

        {data && (
          <>
            {/* Label + confidence */}
            <div className="flex items-baseline gap-2">
              <span
                className="text-[13px] font-bold italic"
                style={{
                  color,
                  fontFamily: "var(--font-fraunces), Georgia, serif",
                  textShadow: `0 0 8px ${glow}`,
                }}
              >
                {data.label.toUpperCase()}
              </span>
              <span className="tac-label text-[9px] text-[color:var(--nafas-ink3)]">
                {(data.confidence * 100).toFixed(1)}% conf.
              </span>
            </div>

            {/* Probability bars */}
            <div className="space-y-1">
              {Object.entries(data.probabilities).map(([cls, p], i) => (
                <div key={cls} className="flex items-center gap-1.5">
                  <span className="tac-label text-[8.5px] w-[72px] text-[color:var(--nafas-ink3)] truncate">
                    {cls}
                  </span>
                  <div className="flex-1 h-[3px] bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width:      `${p * 100}%`,
                        background: RISK_COLOR[i] ?? "#888",
                      }}
                    />
                  </div>
                  <span className="tac-label text-[8px] w-7 text-right text-[color:var(--nafas-ink3)]">
                    {(p * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>

            {/* WHO breaches */}
            {data.who_threshold_breaches.length > 0 && (
              <div className="space-y-0.5 pt-0.5 border-t border-white/10">
                {data.who_threshold_breaches.slice(0, 3).map((b) => (
                  <div
                    key={b}
                    className="tac-label text-[8.5px] text-red-400 flex gap-1"
                  >
                    <span>⚠</span>
                    <span className="truncate">{b}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
