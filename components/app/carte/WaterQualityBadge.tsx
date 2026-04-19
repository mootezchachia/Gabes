"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Droplets, ChevronDown, ChevronUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

type Prediction = {
  label: string;
  risk_level: number;
  confidence: number;
  probabilities: Record<string, number>;
  who_threshold_breaches: string[];
};

type Reading = {
  pb: number; cd: number; ni: number; hg: number; cr: number;
  as: number; p: number; n_ox: number; n_other: number;
  temp: number; ph: number; dgas: number; optical: number;
  month: number; season_enc: number; lat: number; lon: number;
  elevation: number; water_type_enc: number;
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

/* When slider moves, ALL hazardous params scale together so model reaches
   "Bonne qualité" at 0 instead of staying contaminated via background features. */
function buildReading(overrides: Partial<Reading>): Reading {
  const base = { ...DEFAULT_READING, ...overrides };
  // scale background hazardous params proportionally to the dominant slider (pb)
  const ratio = base.pb / DEFAULT_READING.pb;
  return {
    ...base,
    cd:    +(DEFAULT_READING.cd    * ratio).toFixed(4),
    cr:    +(DEFAULT_READING.cr    * ratio).toFixed(4),
    n_ox:  +(DEFAULT_READING.n_ox  * ratio).toFixed(4),
    n_other: +(DEFAULT_READING.n_other * ratio).toFixed(4),
  };
}

const SLIDERS = [
  { key: "pb" as const, label: "Plomb (Pb)",    min: 0, max: 0.05,  step: 0.001,  who: 0.01,  unit: "mg/L" },
  { key: "as" as const, label: "Arsenic (As)",  min: 0, max: 0.02,  step: 0.0005, who: 0.01,  unit: "mg/L" },
  { key: "ni" as const, label: "Nickel (Ni)",   min: 0, max: 0.15,  step: 0.005,  who: 0.07,  unit: "mg/L" },
  { key: "hg" as const, label: "Mercure (Hg)",  min: 0, max: 0.002, step: 0.0001, who: 0.001, unit: "mg/L" },
  { key: "p"  as const, label: "Phosphore (P)", min: 0, max: 0.5,   step: 0.01,   who: null,  unit: "mg/L" },
] as const;

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

const PANEL_STYLE: React.CSSProperties = {
  background: "color-mix(in srgb, #06090D 88%, transparent)",
  backdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "8px",
};

export function WaterQualityBadge() {
  const [reading, setReading]   = useState<Reading>(DEFAULT_READING);
  const [data, setData]         = useState<Prediction | null>(null);
  const [updating, setUpdating] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchPrediction = useCallback((r: Reading) => {
    setUpdating(true);
    fetch("/api/water-quality", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(r),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((d: Prediction) => { setData(d); setUpdating(false); })
      .catch(() => setUpdating(false));
  }, []);

  useEffect(() => { fetchPrediction(DEFAULT_READING); }, [fetchPrediction]);

  const handleSlider = (key: keyof Reading, value: number) => {
    const next = buildReading({ ...reading, [key]: value });
    setReading(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPrediction(next), 300);
  };

  const color     = data ? (RISK_COLOR[data.risk_level] ?? "#888") : "var(--nafas-ink3)";
  const pRatio    = reading.p / DEFAULT_READING.p;
  const estime    = Math.round(150 + pRatio * 180);
  const declare_  = Math.round(140 + pRatio * 15);
  const ecart     = estime - declare_;

  return (
    <div className="absolute bottom-6 right-4 z-30 flex flex-col items-end gap-2" style={{ pointerEvents: "auto" }}>

      {/* ── Panneau étendu ── */}
      {expanded && (
        <div className="flex flex-col gap-3 w-[300px] p-4" style={PANEL_STYLE}>

          {/* En-tête */}
          <div className="flex items-center gap-2 pb-2 border-b border-white/[0.07]">
            <Droplets className="size-[13px]" style={{ color }} strokeWidth={1.8} />
            <span className="font-[family-name:var(--font-jetbrains)] text-[10px] uppercase tracking-[0.22em] text-[color:var(--nafas-surface)]">
              Qualité de l&apos;eau · IA
            </span>
          </div>

          {/* Verdict */}
          {data && (
            <div className="flex items-center gap-2">
              <span
                className="size-2.5 rounded-full shrink-0"
                style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}`,
                  animation: updating ? "ping 1s cubic-bezier(0,0,0.2,1) infinite" : "pulse 2s cubic-bezier(0.4,0,0.6,1) infinite" }}
              />
              <span className="font-[family-name:var(--font-fraunces)] text-[17px] italic font-light" style={{ color }}>
                {data.label}
              </span>
              <span className="ml-auto font-[family-name:var(--font-jetbrains)] text-[9px] text-[color:var(--nafas-ink3)]">
                {(data.confidence * 100).toFixed(0)}% conf.
              </span>
            </div>
          )}

          {/* Barres de probabilité */}
          {data && (
            <div className="flex flex-col gap-1.5">
              {Object.entries(data.probabilities).map(([cls, p], i) => (
                <div key={cls} className="flex items-center gap-2">
                  <span className="font-[family-name:var(--font-jetbrains)] text-[9px] w-[80px] truncate text-[color:var(--nafas-ink3)]">{cls}</span>
                  <div className="flex-1 h-[2.5px] bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${p * 100}%`, background: RISK_COLOR[i] ?? "#888" }} />
                  </div>
                  <span className="font-[family-name:var(--font-jetbrains)] text-[9px] w-7 text-right text-[color:var(--nafas-ink3)]">
                    {(p * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Curseurs */}
          <div className="flex flex-col gap-3 pt-2 border-t border-white/[0.07]">
            <div className="font-[family-name:var(--font-jetbrains)] text-[9px] uppercase tracking-[0.22em] text-[color:var(--nafas-ink3)]">
              Paramètres mesurés
            </div>
            {SLIDERS.map((s) => {
              const val     = reading[s.key] as number;
              const depasse = s.who !== null && val > s.who;
              return (
                <div key={s.key} className="flex flex-col gap-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-[family-name:var(--font-jetbrains)] text-[9.5px] text-[color:var(--nafas-surface)]">{s.label}</span>
                    <span className="font-[family-name:var(--font-jetbrains)] text-[9.5px] tabular-nums"
                      style={{ color: depasse ? "var(--nafas-danger)" : "var(--nafas-ink3)" }}>
                      {depasse && "⚠ "}{val.toFixed(decimals(s.step))} {s.unit}
                    </span>
                  </div>
                  <input type="range" min={s.min} max={s.max} step={s.step} value={val}
                    onChange={(e) => handleSlider(s.key, parseFloat(e.target.value))}
                    className="w-full h-1 rounded-full appearance-none cursor-ew-resize bg-white/10"
                    style={{ accentColor: depasse ? "var(--nafas-danger)" : "var(--nafas-cyan)" }}
                  />
                  {s.who !== null && (
                    <div className="font-[family-name:var(--font-jetbrains)] text-[8px] text-[color:var(--nafas-ink3)]/35">
                      Seuil OMS : {s.who} {s.unit}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Dépassements OMS */}
          {data && data.who_threshold_breaches.length > 0 && (
            <div className="rounded border border-[color:var(--nafas-danger)]/20 bg-[color:var(--nafas-danger)]/5 p-2.5 flex flex-col gap-1">
              <div className="font-[family-name:var(--font-jetbrains)] text-[9px] uppercase tracking-[0.18em] text-[color:var(--nafas-danger)]">
                Dépassements OMS
              </div>
              {data.who_threshold_breaches.slice(0, 3).map((b) => (
                <div key={b} className="flex items-start gap-1.5 text-[10px] text-[color:var(--nafas-danger)]/80">
                  <span className="mt-[4px] size-[3px] rounded-full bg-[color:var(--nafas-danger)] shrink-0" />
                  <span>{b}</span>
                </div>
              ))}
            </div>
          )}

          {/* Corrélation phosphore / GCT */}
          <div className="flex flex-col gap-2 pt-2 border-t border-white/[0.07]">
            <div className="font-[family-name:var(--font-jetbrains)] text-[9px] uppercase tracking-[0.22em] text-[color:var(--nafas-ink3)]">
              Corrélation phosphore · GCT
            </div>
            <ResponsiveContainer width="100%" height={130}>
              <LineChart data={CORRELATION_DATA} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="mois" tick={{ fill: "var(--nafas-ink3)", fontSize: 8, fontFamily: "var(--font-jetbrains)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--nafas-ink3)", fontSize: 8, fontFamily: "var(--font-jetbrains)" }} axisLine={false} tickLine={false} unit="t" />
                <Tooltip
                  contentStyle={{ background: "#06090D", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "4px", fontSize: "10px", fontFamily: "var(--font-jetbrains)" }}
                  formatter={(v: number, n: string) => [`${v} t/mois`, n === "declare" ? "Déclaré GCT" : "Estimé NAFAS"]}
                />
                <Legend formatter={(v) => <span style={{ color: "var(--nafas-ink3)", fontSize: "8px", fontFamily: "var(--font-jetbrains)", textTransform: "uppercase", letterSpacing: "0.12em" }}>{v === "declare" ? "Déclaré GCT" : "Estimé NAFAS"}</span>} />
                <Line type="monotone" dataKey="declare" stroke="var(--nafas-accent2)" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                <Line type="monotone" dataKey="estime"  stroke="var(--nafas-danger)"  strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>

            {/* KPIs live */}
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              {[
                { label: "Estimé NAFAS", value: estime,   color: "var(--nafas-danger)" },
                { label: "Déclaré GCT",  value: declare_,  color: "var(--nafas-accent2)" },
                { label: "Écart",        value: ecart,    color: "var(--nafas-amber)" },
              ].map(({ label, value, color: c }) => (
                <div key={label} className="flex flex-col gap-0.5">
                  <span className="font-[family-name:var(--font-jetbrains)] text-[8px] uppercase tracking-[0.12em] text-[color:var(--nafas-ink3)]/55">{label}</span>
                  <span className="font-[family-name:var(--font-fraunces)] text-[16px] leading-none" style={{ color: c }}>
                    {value}<span className="text-[9px] ml-0.5 font-[family-name:var(--font-jetbrains)]">t</span>
                  </span>
                </div>
              ))}
            </div>
            <p className="font-[family-name:var(--font-fraunces)] text-[9.5px] italic text-[color:var(--nafas-ink3)]/45">
              Données illustratives · Seuils OMS 2024
            </p>
          </div>
        </div>
      )}

      {/* ── Pill badge ── */}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-colors hover:border-white/20"
        style={{ ...PANEL_STYLE, borderRadius: "999px" }}
      >
        <Droplets className="size-[13px]" style={{ color: data ? color : "var(--nafas-ink3)" }} strokeWidth={1.8} />
        <span className="font-[family-name:var(--font-jetbrains)] text-[10px] tracking-[0.15em] uppercase">
          {data
            ? <span style={{ color }}>{data.label}</span>
            : <span className="text-[color:var(--nafas-ink3)]">Eau · chargement…</span>
          }
        </span>
        {expanded
          ? <ChevronDown className="size-3 text-[color:var(--nafas-ink3)]" />
          : <ChevronUp   className="size-3 text-[color:var(--nafas-ink3)]" />
        }
      </button>
    </div>
  );
}
