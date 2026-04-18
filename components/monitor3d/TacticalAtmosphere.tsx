"use client";

import { useMonitor } from "@/lib/monitor/store";
import { windVectorForHour } from "@/lib/monitor/atmosphere";

const PASQUILL = (hour: number): { code: string; label: string } => {
  if (hour < 6 || hour > 21) return { code: "F", label: "Stable (nuit)" };
  if (hour < 10) return { code: "C", label: "Neutre" };
  if (hour < 15) return { code: "B", label: "Instable · mélange" };
  if (hour < 18) return { code: "C", label: "Neutre" };
  return { code: "E", label: "Stable (soir)" };
};

/** Wind compass + synthetic atmospheric readouts, right side. */
export function TacticalAtmosphere() {
  const hour = useMonitor((s) => s.hourOfDay);
  const w = windVectorForHour(hour);
  const windKmh = (w.speed * 18).toFixed(1); // synthetic → km/h scale
  const stability = PASQUILL(hour);
  const plumeKm = (1.8 + w.speed * 2.1).toFixed(1);
  const mixingM = Math.round(420 + w.speed * 800);

  return (
    <div className="tac-panel w-full h-full p-3 overflow-auto">
      <div className="flex items-center justify-between mb-2">
        <span className="tac-bracket">Atmosphère</span>
        <span className="tac-dot tac-dot--cyan tac-blink" />
      </div>

      <div className="tac-divider-h mb-3" />

      {/* compass */}
      <div className="flex gap-3">
        <div className="relative size-[110px] shrink-0">
          {/* outer ring */}
          <div className="absolute inset-0 rounded-full border border-white/10" />
          <div className="absolute inset-[6px] rounded-full border border-white/5" />
          {/* cardinal marks */}
          {[
            { l: "N", a: 0 },
            { l: "E", a: 90 },
            { l: "S", a: 180 },
            { l: "W", a: 270 },
          ].map((m) => (
            <span
              key={m.l}
              className="absolute top-1/2 left-1/2 tac-label text-[8.5px] text-[color:var(--nafas-ink3)]/80"
              style={{
                transform: `rotate(${m.a}deg) translateY(-49px) rotate(${-m.a}deg)`,
                transformOrigin: "0 0",
                marginLeft: "-4px",
                marginTop: "-4px",
              }}
            >
              {m.l}
            </span>
          ))}
          {/* 8 tick marks */}
          {Array.from({ length: 36 }).map((_, i) => {
            const angle = i * 10;
            const isMajor = i % 9 === 0;
            return (
              <span
                key={i}
                aria-hidden
                className="absolute top-1/2 left-1/2 bg-white/20"
                style={{
                  width: "1px",
                  height: isMajor ? "8px" : "4px",
                  transform: `rotate(${angle}deg) translateY(-54px)`,
                  transformOrigin: "0 0",
                  opacity: isMajor ? 0.45 : 0.18,
                }}
              />
            );
          })}
          {/* wind arrow */}
          <div
            className="absolute inset-0 grid place-items-center"
            style={{ transform: `rotate(${w.bearingDeg}deg)` }}
          >
            <svg width="80" height="80" viewBox="0 0 80 80">
              <defs>
                <linearGradient id="windArrow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3EC9D0" stopOpacity="0" />
                  <stop offset="40%" stopColor="#3EC9D0" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#3EC9D0" stopOpacity="1" />
                </linearGradient>
              </defs>
              <path
                d="M 40 8 L 44 40 L 40 34 L 36 40 Z"
                fill="url(#windArrow)"
                stroke="#3EC9D0"
                strokeWidth="0.6"
                strokeLinejoin="miter"
              />
              <line
                x1="40"
                y1="34"
                x2="40"
                y2="62"
                stroke="#3EC9D0"
                strokeOpacity="0.35"
                strokeWidth="1"
                strokeDasharray="2 3"
              />
              <circle cx="40" cy="40" r="2" fill="#3EC9D0" />
            </svg>
          </div>

          {/* center degree readout */}
          <div className="absolute inset-0 grid place-items-center pointer-events-none">
            <div className="tac-readout text-[9.5px] text-[color:var(--nafas-cyan)] mt-[46px]">
              {w.bearingDeg.toFixed(0).padStart(3, "0")}°
            </div>
          </div>
        </div>

        {/* readouts */}
        <div className="flex-1 flex flex-col justify-between py-1">
          <div>
            <div className="tac-label text-[8.5px] text-[color:var(--nafas-ink3)]/70 mb-1">
              Vent
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="tac-readout-big text-[color:var(--nafas-cyan)]">{windKmh}</span>
              <span className="tac-label text-[8.5px] text-[color:var(--nafas-ink3)]">km/h</span>
            </div>
          </div>
          <div>
            <div className="tac-label text-[8.5px] text-[color:var(--nafas-ink3)]/70 mb-1">
              Plume
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="tac-readout text-[15px] text-[color:var(--nafas-amber)]">{plumeKm}</span>
              <span className="tac-label text-[8.5px] text-[color:var(--nafas-ink3)]">km</span>
            </div>
          </div>
        </div>
      </div>

      <div className="tac-divider-h my-3" />

      {/* stability + mixing */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <span className="tac-label text-[8.5px] text-[color:var(--nafas-ink3)]/70">
            Classe · Pasquill
          </span>
          <div className="flex items-baseline gap-2">
            <span className="tac-readout-big text-[18px] text-[color:var(--nafas-amber)]">
              {stability.code}
            </span>
            <span className="tac-label text-[8.5px] text-[color:var(--nafas-ink3)] truncate">
              {stability.label}
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="tac-label text-[8.5px] text-[color:var(--nafas-ink3)]/70">
            Couche mélange
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="tac-readout-big text-[18px] text-[color:var(--nafas-surface)]">
              {mixingM}
            </span>
            <span className="tac-label text-[8.5px] text-[color:var(--nafas-ink3)]">m</span>
          </div>
        </div>
      </div>

      <div className="tac-divider-h my-3" />

      <div className="flex items-center justify-between text-[8.5px]">
        <span className="tac-label text-[color:var(--nafas-ink3)]/70">
          Modèle
        </span>
        <span className="tac-label text-[color:var(--nafas-accent2)]">
          Gaussien · Briggs
        </span>
      </div>
    </div>
  );
}
