"use client";

import { useEffect, useState } from "react";

type Prediction = {
  label: string;
  risk_level: number;
  confidence: number;
  probabilities: Record<string, number>;
  who_threshold_breaches: string[];
};

const RISK_COLOR = ["#4CAF50", "#FF9800", "#FF5722", "#F44336"];

const GABES_READING = {
  pb: 0.025, cd: 0.002, ni: 0.03, hg: 0.0005,
  cr: 0.02, as: 0.008, p: 0.15, n_ox: 0.5,
  n_other: 0.3, temp: 24, ph: 7.8, dgas: 6.5,
  optical: 12, month: new Date().getMonth() + 1,
  season_enc: Math.floor(((new Date().getMonth() + 1) % 12) / 3),
  lat: 33.88, lon: 10.10, elevation: 1, water_type_enc: 2,
};

export function WaterQualityMonitor() {
  const [data, setData]       = useState<Prediction | null>(null);
  const [error, setError]     = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/water-quality", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(GABES_READING),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  if (loading) return (
    <div className="font-[family-name:var(--font-jetbrains)] text-[10px] text-[color:var(--nafas-ink3)]">
      Analyse en cours…
    </div>
  );

  if (error) return (
    <div className="font-[family-name:var(--font-jetbrains)] text-[10px] text-red-400">
      Modèle indisponible
    </div>
  );

  if (!data) return null;

  const color = RISK_COLOR[data.risk_level] ?? "#888";

  return (
    <div className="flex flex-col gap-2.5">
      {/* Label row */}
      <div className="flex items-center gap-2">
        <span
          className="inline-block size-2 rounded-full shrink-0 animate-pulse"
          style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }}
        />
        <span
          className="font-[family-name:var(--font-fraunces)] text-[15px] font-light italic"
          style={{ color }}
        >
          {data.label}
        </span>
        <span className="ml-auto font-[family-name:var(--font-jetbrains)] text-[9.5px] text-[color:var(--nafas-ink3)]">
          {(data.confidence * 100).toFixed(1)}%
        </span>
      </div>

      {/* Probability bars */}
      <div className="flex flex-col gap-1.5">
        {Object.entries(data.probabilities).map(([cls, p], i) => (
          <div key={cls} className="flex items-center gap-2">
            <span className="font-[family-name:var(--font-jetbrains)] text-[9px] w-[70px] text-[color:var(--nafas-ink3)] truncate">
              {cls}
            </span>
            <div className="flex-1 h-[3px] bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${p * 100}%`, background: RISK_COLOR[i] ?? "#888" }}
              />
            </div>
            <span className="font-[family-name:var(--font-jetbrains)] text-[9px] w-6 text-right text-[color:var(--nafas-ink3)]">
              {(p * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>

      {/* WHO breaches */}
      {data.who_threshold_breaches.length > 0 && (
        <div className="flex flex-col gap-1 pt-1 border-t border-white/10">
          {data.who_threshold_breaches.slice(0, 3).map((b) => (
            <div key={b} className="flex gap-1.5 font-[family-name:var(--font-jetbrains)] text-[9px] text-red-400">
              <span>⚠</span>
              <span className="truncate">{b}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
