"use client";

import { useEffect, useState } from "react";
import { Eyebrow } from "@/components/app/ui/Primitives";
import { cn } from "@/lib/utils";

type Prediction = {
  label: string;
  risk_level: number;
  confidence: number;
  probabilities: Record<string, number>;
  who_threshold_breaches: string[];
};

const RISK_COLOR = ["#4CAF50", "#FF9800", "#FF5722", "#F44336"] as const;
const RISK_LABEL = ["Bonne qualité", "Modérée", "Suspecte", "Contaminée"] as const;

const GABES_READING = {
  pb: 0.025, cd: 0.002, ni: 0.03, hg: 0.0005,
  cr: 0.02, as: 0.008, p: 0.15, n_ox: 0.5,
  n_other: 0.3, temp: 24, ph: 7.8, dgas: 6.5,
  optical: 12, month: new Date().getMonth() + 1,
  season_enc: Math.floor(((new Date().getMonth() + 1) % 12) / 3),
  lat: 33.88, lon: 10.10, elevation: 1, water_type_enc: 2,
};

export function WaterQualityCard() {
  const [data, setData] = useState<Prediction | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ok">("loading");

  useEffect(() => {
    fetch("/api/water-quality", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(GABES_READING),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { setData(d); setStatus("ok"); })
      .catch(() => setStatus("error"));
  }, []);

  const color = data ? (RISK_COLOR[data.risk_level] ?? "#888") : "#888";

  return (
    <div className="rounded-lg border border-white/5 bg-[color:var(--nafas-bg2)]/60 p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Eyebrow className="mb-1.5">Qualité de l&apos;eau · IA</Eyebrow>
          <p className="text-[12px] text-[color:var(--nafas-ink3)] max-w-[40ch]">
            Modèle LightGBM entraîné sur GEMS Water — Golfe de Gabès
          </p>
        </div>
        <span className="text-[10px] font-[family-name:var(--font-jetbrains)] tracking-[0.2em] uppercase text-[color:var(--nafas-ink3)]/50 shrink-0">
          Station · 33.88°N 10.10°E
        </span>
      </div>

      {status === "loading" && (
        <div className="flex items-center gap-2 text-[12px] text-[color:var(--nafas-ink3)]">
          <span className="size-1.5 rounded-full bg-[color:var(--nafas-cyan)] animate-pulse" />
          Analyse en cours…
        </div>
      )}

      {status === "error" && (
        <div className="text-[12px] text-[color:var(--nafas-danger)]">
          Modèle indisponible — vérifiez ML_API_URL dans .env.local
        </div>
      )}

      {status === "ok" && data && (
        <div className="flex flex-col gap-4">
          {/* Main verdict */}
          <div className="flex items-center gap-3">
            <span
              className="size-3 rounded-full shrink-0 animate-pulse"
              style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }}
            />
            <span
              className="font-[family-name:var(--font-fraunces)] text-[22px] leading-none tracking-[-0.01em]"
              style={{ color }}
            >
              {data.label}
            </span>
            <span className="ml-auto font-[family-name:var(--font-jetbrains)] text-[11px] text-[color:var(--nafas-ink3)]">
              {(data.confidence * 100).toFixed(1)}% conf.
            </span>
          </div>

          {/* Probability bars */}
          <div className="flex flex-col gap-2">
            {Object.entries(data.probabilities).map(([cls, p], i) => (
              <div key={cls} className="flex items-center gap-3">
                <span className="font-[family-name:var(--font-jetbrains)] text-[10px] w-[90px] truncate text-[color:var(--nafas-ink3)]">
                  {cls}
                </span>
                <div className="flex-1 h-[3px] bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${p * 100}%`, background: RISK_COLOR[i] ?? "#888" }}
                  />
                </div>
                <span className="font-[family-name:var(--font-jetbrains)] text-[10px] w-8 text-right text-[color:var(--nafas-ink3)]">
                  {(p * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>

          {/* WHO breaches */}
          {data.who_threshold_breaches.length > 0 && (
            <div className="rounded-md border border-[color:var(--nafas-danger)]/20 bg-[color:var(--nafas-danger)]/5 p-3 flex flex-col gap-1.5">
              <div className="font-[family-name:var(--font-jetbrains)] text-[10px] uppercase tracking-[0.2em] text-[color:var(--nafas-danger)]">
                Dépassements OMS
              </div>
              {data.who_threshold_breaches.slice(0, 4).map((b) => (
                <div key={b} className="flex items-start gap-2 text-[11.5px] text-[color:var(--nafas-danger)]/85">
                  <span className="mt-[3px] size-[5px] rounded-full bg-[color:var(--nafas-danger)] shrink-0" />
                  {b}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className={cn(
        "pt-2 border-t border-white/5 font-[family-name:var(--font-jetbrains)] text-[10px] text-[color:var(--nafas-ink3)]/50 tracking-wide"
      )}>
        Données simulées · Seuils OMS drinking water 2024
      </div>
    </div>
  );
}
