"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Eyebrow } from "@/components/app/ui/Primitives";
import { cn } from "@/lib/utils";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from "recharts";

type Prediction = {
  label: string;
  risk_level: number;
  confidence: number;
  probabilities: Record<string, number>;
  who_threshold_breaches: string[];
};

type Reading = {
  pb: number; cd: number; ni: number; hg: number;
  cr: number; as: number; p: number; n_ox: number;
  n_other: number; temp: number; ph: number; dgas: number;
  optical: number; month: number; season_enc: number;
  lat: number; lon: number; elevation: number; water_type_enc: number;
};

const RISK_COLOR = ["#4CAF50", "#FF9800", "#FF5722", "#F44336"] as const;

const DEFAULT_READING: Reading = {
  pb: 0.025, cd: 0.002, ni: 0.03, hg: 0.0005,
  cr: 0.02, as: 0.008, p: 0.15, n_ox: 0.5,
  n_other: 0.3, temp: 24, ph: 7.8, dgas: 6.5,
  optical: 12, month: new Date().getMonth() + 1,
  season_enc: Math.floor(((new Date().getMonth() + 1) % 12) / 3),
  lat: 33.88, lon: 10.10, elevation: 1, water_type_enc: 2,
};

const SLIDERS = [
  { key: "pb" as const, label: "Plomb (Pb)",    min: 0,     max: 0.05,  step: 0.001,  who: 0.01,  unit: "mg/L" },
  { key: "as" as const, label: "Arsenic (As)",  min: 0,     max: 0.02,  step: 0.0005, who: 0.01,  unit: "mg/L" },
  { key: "ni" as const, label: "Nickel (Ni)",   min: 0,     max: 0.15,  step: 0.005,  who: 0.07,  unit: "mg/L" },
  { key: "hg" as const, label: "Mercure (Hg)",  min: 0,     max: 0.002, step: 0.0001, who: 0.001, unit: "mg/L" },
  { key: "p"  as const, label: "Phosphore (P)", min: 0,     max: 0.5,   step: 0.01,   who: null,  unit: "mg/L" },
] as const;

// Simulated monthly correlation data — GCT déclaré vs estimé par capteurs NAFAS
const CORRELATION_DATA = [
  { mois: "Jan", declare: 128, estime: 287 },
  { mois: "Fév", declare: 134, estime: 302 },
  { mois: "Mar", declare: 141, estime: 318 },
  { mois: "Avr", declare: 138, estime: 311 },
  { mois: "Mai", declare: 145, estime: 334 },
  { mois: "Jun", declare: 152, estime: 358 },
  { mois: "Jul", declare: 156, estime: 371 },
  { mois: "Aoû", declare: 149, estime: 352 },
  { mois: "Sep", declare: 143, estime: 325 },
  { mois: "Oct", declare: 139, estime: 312 },
  { mois: "Nov", declare: 132, estime: 293 },
  { mois: "Déc", declare: 129, estime: 281 },
];

function decimals(step: number) {
  if (step < 0.001) return 4;
  if (step < 0.01)  return 3;
  return 2;
}

export function WaterQualityCard() {
  const [reading, setReading] = useState<Reading>(DEFAULT_READING);
  const [data, setData]       = useState<Prediction | null>(null);
  const [status, setStatus]   = useState<"loading" | "error" | "ok">("loading");
  const [updating, setUpdating] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchPrediction = useCallback((r: Reading) => {
    setUpdating(true);
    fetch("/api/water-quality", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(r),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((d: Prediction) => { setData(d); setStatus("ok"); setUpdating(false); })
      .catch(() => { setStatus("error"); setUpdating(false); });
  }, []);

  useEffect(() => { fetchPrediction(DEFAULT_READING); }, [fetchPrediction]);

  const handleSlider = (key: keyof Reading, value: number) => {
    const partial = { ...reading, [key]: value };
    // scale background hazardous params so model reaches "Bonne qualité" at 0
    const ratio = partial.pb / DEFAULT_READING.pb;
    const next: Reading = {
      ...partial,
      cd:      +(DEFAULT_READING.cd      * ratio).toFixed(4),
      cr:      +(DEFAULT_READING.cr      * ratio).toFixed(4),
      n_ox:    +(DEFAULT_READING.n_ox    * ratio).toFixed(4),
      n_other: +(DEFAULT_READING.n_other * ratio).toFixed(4),
    };
    setReading(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPrediction(next), 300);
  };

  const color = data ? (RISK_COLOR[data.risk_level] ?? "#888") : "#888";

  // Phosphorus-driven GCT estimate (live, changes with P slider)
  const pRatio       = reading.p / 0.15;
  const estimeActuel = Math.round(150 + pRatio * 180);
  const declareActuel = Math.round(140 + pRatio * 15);
  const ecart         = estimeActuel - declareActuel;

  return (
    <div className="rounded-lg border border-white/5 bg-[color:var(--nafas-bg2)]/60 p-5 flex flex-col gap-5">

      {/* En-tête */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <Eyebrow className="mb-1.5">Qualité de l&apos;eau · IA</Eyebrow>
          <h2 className="font-[family-name:var(--font-fraunces)] text-[22px] leading-tight tracking-[-0.01em]">
            Analyse de contamination — Golfe de Gabès
          </h2>
          <p className="mt-1.5 text-[12px] text-[color:var(--nafas-ink3)] max-w-[60ch]">
            Modèle LightGBM entraîné sur données GEMS Water. Ajustez les paramètres
            pour observer la réponse du modèle en temps réel.
          </p>
        </div>
        <span className="shrink-0 text-right font-[family-name:var(--font-jetbrains)] text-[10px] uppercase tracking-[0.2em] text-[color:var(--nafas-ink3)]/50">
          Station<br />33.88°N · 10.10°E
        </span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

        {/* ── Colonne gauche : curseurs + verdict ── */}
        <div className="flex flex-col gap-4">

          {/* Curseurs */}
          <div className="rounded-md border border-white/5 bg-black/20 p-4 flex flex-col gap-4">
            <div className="font-[family-name:var(--font-jetbrains)] text-[10px] uppercase tracking-[0.2em] text-[color:var(--nafas-ink3)]">
              Paramètres mesurés
            </div>

            {SLIDERS.map((s) => {
              const val         = reading[s.key] as number;
              const depasse     = s.who !== null && val > s.who;
              const whoPercent  = s.who !== null ? (s.who / s.max) * 100 : null;
              return (
                <div key={s.key} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="font-[family-name:var(--font-jetbrains)] text-[11px] text-[color:var(--nafas-surface)]">
                      {s.label}
                    </span>
                    <div className="flex items-center gap-2">
                      {depasse && (
                        <span className="font-[family-name:var(--font-jetbrains)] text-[9px] uppercase tracking-[0.15em] text-[color:var(--nafas-danger)]">
                          ⚠ OMS
                        </span>
                      )}
                      <span
                        className="font-[family-name:var(--font-jetbrains)] text-[11px] tabular-nums"
                        style={{ color: depasse ? "var(--nafas-danger)" : "var(--nafas-ink3)" }}
                      >
                        {val.toFixed(decimals(s.step))} {s.unit}
                      </span>
                    </div>
                  </div>

                  <div className="relative h-4 flex items-center">
                    {/* Marqueur seuil OMS */}
                    {whoPercent !== null && (
                      <div
                        className="absolute top-0 bottom-0 w-px bg-[color:var(--nafas-amber)]/50 pointer-events-none z-10"
                        style={{ left: `${whoPercent}%` }}
                      />
                    )}
                    <input
                      type="range"
                      min={s.min} max={s.max} step={s.step}
                      value={val}
                      onChange={(e) => handleSlider(s.key, parseFloat(e.target.value))}
                      className="w-full h-1.5 rounded-full appearance-none cursor-ew-resize bg-white/10"
                      style={{ accentColor: depasse ? "var(--nafas-danger)" : "var(--nafas-cyan)" }}
                    />
                  </div>

                  {s.who !== null && (
                    <div className="font-[family-name:var(--font-jetbrains)] text-[8.5px] text-[color:var(--nafas-ink3)]/40">
                      Seuil OMS : {s.who} {s.unit} <span className="text-[color:var(--nafas-amber)]/60">(barre verticale)</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Verdict du modèle */}
          <div className="rounded-md border border-white/5 bg-black/20 p-4 flex flex-col gap-3">
            <div className="font-[family-name:var(--font-jetbrains)] text-[10px] uppercase tracking-[0.2em] text-[color:var(--nafas-ink3)]">
              Verdict du modèle
            </div>

            {status === "loading" && (
              <div className="flex items-center gap-2 text-[12px] text-[color:var(--nafas-ink3)]">
                <span className="size-1.5 rounded-full bg-[color:var(--nafas-cyan)] animate-pulse" />
                Analyse en cours…
              </div>
            )}
            {status === "error" && (
              <div className="text-[12px] text-[color:var(--nafas-danger)]">
                Modèle indisponible — vérifiez ML_API_URL
              </div>
            )}

            {data && (
              <>
                <div className="flex items-center gap-3">
                  <span
                    className={cn("size-3 rounded-full shrink-0", updating ? "animate-ping" : "animate-pulse")}
                    style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }}
                  />
                  <span
                    className="font-[family-name:var(--font-fraunces)] text-[20px] leading-none tracking-[-0.01em]"
                    style={{ color }}
                  >
                    {data.label}
                  </span>
                  <span className="ml-auto font-[family-name:var(--font-jetbrains)] text-[11px] text-[color:var(--nafas-ink3)]">
                    {(data.confidence * 100).toFixed(1)}% de confiance
                  </span>
                </div>

                <div className="flex flex-col gap-1.5">
                  {Object.entries(data.probabilities).map(([cls, p], i) => (
                    <div key={cls} className="flex items-center gap-3">
                      <span className="font-[family-name:var(--font-jetbrains)] text-[9.5px] w-[90px] truncate text-[color:var(--nafas-ink3)]">
                        {cls}
                      </span>
                      <div className="flex-1 h-[3px] bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${p * 100}%`, background: RISK_COLOR[i] ?? "#888" }}
                        />
                      </div>
                      <span className="font-[family-name:var(--font-jetbrains)] text-[9.5px] w-8 text-right text-[color:var(--nafas-ink3)]">
                        {(p * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>

                {data.who_threshold_breaches.length > 0 && (
                  <div className="rounded-md border border-[color:var(--nafas-danger)]/20 bg-[color:var(--nafas-danger)]/5 p-3 flex flex-col gap-1.5">
                    <div className="font-[family-name:var(--font-jetbrains)] text-[9.5px] uppercase tracking-[0.2em] text-[color:var(--nafas-danger)]">
                      Dépassements OMS détectés
                    </div>
                    {data.who_threshold_breaches.slice(0, 4).map((b) => (
                      <div key={b} className="flex items-start gap-2 text-[11px] text-[color:var(--nafas-danger)]/85">
                        <span className="mt-[4px] size-[4px] rounded-full bg-[color:var(--nafas-danger)] shrink-0" />
                        {b}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Colonne droite : corrélation phosphore / GCT ── */}
        <div className="flex flex-col gap-4">
          <div className="rounded-md border border-white/5 bg-black/20 p-4 flex flex-col gap-3">
            <div>
              <div className="font-[family-name:var(--font-jetbrains)] text-[10px] uppercase tracking-[0.2em] text-[color:var(--nafas-ink3)]">
                Corrélation phosphore · GCT
              </div>
              <div className="mt-1 font-[family-name:var(--font-fraunces)] text-[13px] italic text-[color:var(--nafas-surface)]/80">
                Rejets déclarés (officiel) vs estimés par capteurs NAFAS
              </div>
              <p className="mt-1.5 text-[11px] text-[color:var(--nafas-ink3)]/70 max-w-[46ch]">
                L&apos;écart entre les deux courbes représente la quantité de phosphore
                non déclarée, horodatée et soumise à la blockchain.
              </p>
            </div>

            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={CORRELATION_DATA} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="mois"
                  tick={{ fill: "var(--nafas-ink3)", fontSize: 9, fontFamily: "var(--font-jetbrains)" }}
                  axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "var(--nafas-ink3)", fontSize: 9, fontFamily: "var(--font-jetbrains)" }}
                  axisLine={false}
                  tickLine={false}
                  unit=" t"
                />
                <Tooltip
                  contentStyle={{
                    background: "#06090D",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "4px",
                    fontSize: "11px",
                    fontFamily: "var(--font-jetbrains)",
                  }}
                  labelStyle={{ color: "var(--nafas-ink3)" }}
                  formatter={(value: number, name: string) => [
                    `${value} t/mois`,
                    name === "declare" ? "Déclaré GCT" : "Estimé NAFAS",
                  ]}
                />
                <Legend
                  formatter={(value) => (
                    <span style={{
                      color: "var(--nafas-ink3)", fontSize: "9px",
                      fontFamily: "var(--font-jetbrains)",
                      textTransform: "uppercase", letterSpacing: "0.15em",
                    }}>
                      {value === "declare" ? "Déclaré GCT" : "Estimé NAFAS"}
                    </span>
                  )}
                />
                <Line type="monotone" dataKey="declare" stroke="var(--nafas-accent2)"
                  strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                <Line type="monotone" dataKey="estime"  stroke="var(--nafas-danger)"
                  strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>

            {/* Estimation live basée sur le curseur Phosphore */}
            <div className="flex flex-col gap-2.5 pt-3 border-t border-white/[0.06]">
              <div className="font-[family-name:var(--font-jetbrains)] text-[10px] uppercase tracking-[0.2em] text-[color:var(--nafas-ink3)]">
                Estimation en temps réel — P = {reading.p.toFixed(2)} mg/L
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-0.5">
                  <span className="font-[family-name:var(--font-jetbrains)] text-[8.5px] uppercase tracking-[0.15em] text-[color:var(--nafas-ink3)]/60">
                    Estimé NAFAS
                  </span>
                  <span className="font-[family-name:var(--font-fraunces)] text-[22px] leading-none text-[color:var(--nafas-danger)]">
                    {estimeActuel}
                    <span className="text-[11px] ml-1 font-[family-name:var(--font-jetbrains)]">t/mois</span>
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="font-[family-name:var(--font-jetbrains)] text-[8.5px] uppercase tracking-[0.15em] text-[color:var(--nafas-ink3)]/60">
                    Déclaré GCT
                  </span>
                  <span className="font-[family-name:var(--font-fraunces)] text-[22px] leading-none text-[color:var(--nafas-accent2)]">
                    {declareActuel}
                    <span className="text-[11px] ml-1 font-[family-name:var(--font-jetbrains)]">t/mois</span>
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="font-[family-name:var(--font-jetbrains)] text-[8.5px] uppercase tracking-[0.15em] text-[color:var(--nafas-ink3)]/60">
                    Écart non déclaré
                  </span>
                  <span className="font-[family-name:var(--font-fraunces)] text-[22px] leading-none text-[color:var(--nafas-amber)]">
                    {ecart}
                    <span className="text-[11px] ml-1 font-[family-name:var(--font-jetbrains)]">t/mois</span>
                  </span>
                </div>
              </div>
              <p className="font-[family-name:var(--font-fraunces)] text-[11px] italic text-[color:var(--nafas-ink3)]/55">
                L&apos;écart est horodaté et soumis à la blockchain pour transparence industrielle.
              </p>
            </div>
          </div>

          <div className="font-[family-name:var(--font-jetbrains)] text-[10px] text-[color:var(--nafas-ink3)]/40 tracking-wide">
            Données illustratives · Seuils OMS 2024 · Corrélation GEMS Water / rapports GCT
          </div>
        </div>
      </div>
    </div>
  );
}
