"use client";

import { useEffect, useState, useCallback } from "react";
import { Droplets, ChevronDown, ChevronUp } from "lucide-react";

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

const WHO = { pb: 0.01, cd: 0.003, as: 0.01 } as const;

const SAFE_PREDICTION: Prediction = {
  label: "Bonne qualité",
  risk_level: 0,
  confidence: 0.95,
  probabilities: { "Bonne qualité": 0.95, "Modérée": 0.04, "Suspecte": 0.01, "Contaminée": 0.00 },
  who_threshold_breaches: [],
};

const BASE_READING: Reading = {
  pb: 0.025, cd: 0.002, as: 0.008, p: 0.15,
  ni: 0.01, hg: 0.0002, cr: 0.005, n_ox: 0.1, n_other: 0.05,
  temp: 24, ph: 7.8, dgas: 6.5, optical: 12,
  month: new Date().getMonth() + 1,
  season_enc: Math.floor(((new Date().getMonth() + 1) % 12) / 3),
  lat: 33.88, lon: 10.10, elevation: 1, water_type_enc: 2,
};

function isSafe(r: Reading) {
  return r.pb <= WHO.pb && r.cd <= WHO.cd && r.as <= WHO.as;
}

const PANEL: React.CSSProperties = {
  background: "color-mix(in srgb, #06090D 88%, transparent)",
  backdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "8px",
};

export function WaterQualityBadge() {
  const [modelData, setModelData] = useState<Prediction | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [pConc, setPConc] = useState(BASE_READING.p); // C in the load equation (mg/L)

  const fetchPrediction = useCallback(() => {
    fetch("/api/water-quality", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(BASE_READING),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((d: Prediction) => { setModelData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { fetchPrediction(); }, [fetchPrediction]);

  const display: Prediction | null = loading ? null : isSafe(BASE_READING) ? SAFE_PREDICTION : modelData;
  const color = display ? (RISK_COLOR[display.risk_level] ?? "#888") : "var(--nafas-ink3)";

  return (
    <div className="absolute bottom-6 right-4 z-30 flex flex-col items-end gap-2" style={{ pointerEvents: "auto" }}>

      {expanded && (
        <div className="flex flex-col gap-3 w-[260px] p-4" style={PANEL}>

          <div className="flex items-center gap-2 pb-2 border-b border-white/[0.07]">
            <Droplets className="size-[13px]" style={{ color }} strokeWidth={1.8} />
            <span className="font-[family-name:var(--font-jetbrains)] text-[10px] uppercase tracking-[0.22em] text-[color:var(--nafas-surface)]">
              Qualité de l&apos;eau · IA
            </span>
          </div>

          {display && (
            <>
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full shrink-0 animate-pulse"
                  style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }} />
                <span className="font-[family-name:var(--font-fraunces)] text-[17px] italic font-light" style={{ color }}>
                  {display.label}
                </span>
                <span className="ml-auto font-[family-name:var(--font-jetbrains)] text-[9px] text-[color:var(--nafas-ink3)]">
                  {(display.confidence * 100).toFixed(0)}% conf.
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                {Object.entries(display.probabilities).map(([cls, p], i) => (
                  <div key={cls} className="flex items-center gap-2">
                    <span className="font-[family-name:var(--font-jetbrains)] text-[9px] w-[72px] truncate text-[color:var(--nafas-ink3)]">{cls}</span>
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

              {display.who_threshold_breaches.length > 0 && (
                <div className="rounded border border-[color:var(--nafas-danger)]/20 bg-[color:var(--nafas-danger)]/5 p-2.5 flex flex-col gap-1">
                  <div className="font-[family-name:var(--font-jetbrains)] text-[9px] uppercase tracking-[0.18em] text-[color:var(--nafas-danger)]">
                    Dépassements OMS
                  </div>
                  {display.who_threshold_breaches.slice(0, 3).map((b) => (
                    <div key={b} className="flex items-start gap-1.5 text-[10px] text-[color:var(--nafas-danger)]/80">
                      <span className="mt-[4px] size-[3px] rounded-full bg-[color:var(--nafas-danger)] shrink-0" />
                      <span>{b}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Charge phosphore GCT */}
              <div className="flex flex-col gap-2 pt-2 border-t border-white/[0.07]">
                <div className="font-[family-name:var(--font-jetbrains)] text-[9px] uppercase tracking-[0.22em] text-[color:var(--nafas-ink3)]">
                  Charge phosphore · Canal GCT
                </div>
                <div className="font-[family-name:var(--font-jetbrains)] text-[8px] text-[color:var(--nafas-ink3)]/50">
                  L = C × Q_j × 10⁻³ &nbsp;·&nbsp; Q_j = 960 000 m³/j
                </div>

                {/* Slider C */}
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-[family-name:var(--font-jetbrains)] text-[9px] text-[color:var(--nafas-surface)]">
                      C — Concentration P
                    </span>
                    <span className="font-[family-name:var(--font-jetbrains)] text-[9px] tabular-nums text-[color:var(--nafas-amber)]">
                      {pConc.toFixed(2)} mg/L
                    </span>
                  </div>
                  <input
                    type="range" min={0} max={0.5} step={0.01} value={pConc}
                    onChange={(e) => setPConc(parseFloat(e.target.value))}
                    className="w-full h-1 rounded-full appearance-none cursor-ew-resize bg-white/10"
                    style={{ accentColor: "var(--nafas-amber)" }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="font-[family-name:var(--font-jetbrains)] text-[8px] uppercase tracking-[0.1em] text-[color:var(--nafas-ink3)]/45">kg / jour</div>
                    <div className="font-[family-name:var(--font-fraunces)] text-[18px] leading-none" style={{ color: "var(--nafas-amber)" }}>
                      {(pConc * 960000 * 1e-3).toFixed(0)}
                    </div>
                  </div>
                  <div>
                    <div className="font-[family-name:var(--font-jetbrains)] text-[8px] uppercase tracking-[0.1em] text-[color:var(--nafas-ink3)]/45">t / an</div>
                    <div className="font-[family-name:var(--font-fraunces)] text-[18px] leading-none" style={{ color: "var(--nafas-amber)" }}>
                      {(pConc * 350.4).toFixed(1)}
                    </div>
                  </div>
                </div>
                <div className="font-[family-name:var(--font-jetbrains)] text-[7.5px] text-[color:var(--nafas-ink3)]/30">
                  El Zrelli et al. 2018 · Estimation modélisée
                </div>
              </div>
            </>
          )}

          <div className="font-[family-name:var(--font-jetbrains)] text-[8.5px] text-[color:var(--nafas-ink3)]/35 tracking-wide">
            Données illustratives · Seuils OMS 2024
          </div>
        </div>
      )}

      <button type="button" onClick={() => setExpanded((e) => !e)}
        className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:border-white/20 transition-colors"
        style={{ ...PANEL, borderRadius: "999px" }}>
        <Droplets className="size-[13px]" style={{ color: display ? color : "var(--nafas-ink3)" }} strokeWidth={1.8} />
        <span className="font-[family-name:var(--font-jetbrains)] text-[10px] tracking-[0.15em] uppercase">
          {display
            ? <span style={{ color }}>{display.label}</span>
            : <span className="text-[color:var(--nafas-ink3)]">Eau · chargement…</span>}
        </span>
        {expanded
          ? <ChevronDown className="size-3 text-[color:var(--nafas-ink3)]" />
          : <ChevronUp   className="size-3 text-[color:var(--nafas-ink3)]" />}
      </button>
    </div>
  );
}
