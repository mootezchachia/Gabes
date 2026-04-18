"use client";

import { useEffect, useRef } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { useMonitor } from "@/lib/monitor/store";

const MONO = "var(--font-jetbrains), ui-monospace, monospace";
const DISPLAY = "var(--font-fraunces), Georgia, serif";

function hourLabel(h: number): string {
  const hh = Math.floor(h);
  const mm = Math.floor((h - hh) * 60);
  return `${hh.toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")}`;
}

function ambientWord(h: number): string {
  if (h < 6) return "Nuit · dispersion faible";
  if (h < 10) return "Matin · démarrage industriel";
  if (h < 14) return "Midi · pic d'émission GCT";
  if (h < 18) return "Après-midi · plume dominante";
  if (h < 21) return "Soir · dispersion marine";
  return "Nuit · inversion thermique";
}

const MARKS = [0, 6, 12, 18, 24];
const PEAKS = [
  { h: 8.5, label: "matin" },
  { h: 14.5, label: "pic" },
  { h: 20, label: "soir" },
];

/**
 * Editorial time scrubber. 24-hour cycle of Gabès pollution dynamics.
 * Uses the unified `.hud-bar` glass; thumb has a soft halo pulse; peak
 * markers are clickable shortcuts to key moments of the day.
 */
export function TimeStrip() {
  const hour = useMonitor((s) => s.hourOfDay);
  const playing = useMonitor((s) => s.timePlaying);
  const setHour = useMonitor((s) => s.setHourOfDay);
  const setPlaying = useMonitor((s) => s.setTimePlaying);

  const rafRef = useRef<number>(0);
  const lastRef = useRef<number>(0);

  useEffect(() => {
    if (!playing) return;
    lastRef.current = performance.now();
    const tick = (now: number) => {
      const dt = (now - lastRef.current) / 1000;
      lastRef.current = now;
      const next = useMonitor.getState().hourOfDay + dt * 2; // 2 simulated hours per second
      setHour(next >= 24 ? 0 : next);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, setHour]);

  const pct = (hour / 24) * 100;

  return (
    <div
      role="group"
      aria-label="Horloge simulée · 24h"
      className="hud-bar absolute bottom-5 left-1/2 -translate-x-1/2 z-40 w-[min(760px,calc(100vw-32px))] px-5 py-3.5"
    >
      {/* top row: play + readout + reset */}
      <div className="flex items-center gap-3.5 mb-3">
        <button
          type="button"
          aria-label={playing ? "Pause" : "Lecture"}
          onClick={() => setPlaying(!playing)}
          className="relative size-[30px] rounded-full bg-[color:var(--nafas-accent)] hover:bg-[color:var(--nafas-accent2)] text-black grid place-items-center transition-colors cursor-pointer shadow-[0_0_18px_-4px_rgba(61,201,154,0.75)]"
        >
          {playing ? (
            <Pause className="size-[13px]" strokeWidth={2.2} />
          ) : (
            <Play className="size-[13px] ml-[1px]" strokeWidth={2.2} />
          )}
        </button>

        <div className="flex-1 min-w-0 flex items-baseline gap-3">
          <div
            style={{ fontFamily: DISPLAY, fontVariantNumeric: "tabular-nums" }}
            className="text-[26px] leading-none font-light tracking-[-0.02em] text-[color:var(--nafas-surface)]"
          >
            {hourLabel(hour)}
          </div>
          <div
            style={{ fontFamily: MONO }}
            className="text-[10.5px] uppercase tracking-[0.18em] text-[color:var(--nafas-ink3)] truncate"
          >
            {ambientWord(hour)}
          </div>
        </div>

        <button
          type="button"
          aria-label="Retour à maintenant"
          onClick={() => {
            const now = new Date();
            setHour(now.getHours() + now.getMinutes() / 60);
            setPlaying(false);
          }}
          className="flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1 hover:bg-white/5 hover:border-white/20 transition-colors cursor-pointer"
          style={{ fontFamily: MONO }}
        >
          <RotateCcw className="size-[11px] text-[color:var(--nafas-ink3)]" strokeWidth={1.8} />
          <span className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--nafas-ink3)]">
            Maintenant
          </span>
        </button>
      </div>

      {/* scrubber */}
      <div className="relative h-10 select-none">
        {/* track */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[3px] rounded-full bg-white/[0.07] overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-[color:var(--nafas-accent)] via-[color:var(--nafas-amber)] to-[color:var(--nafas-danger)]"
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* hour marks */}
        {MARKS.map((m) => (
          <div
            key={m}
            aria-hidden
            className="absolute top-1/2 h-2 w-px bg-white/15"
            style={{ left: `${(m / 24) * 100}%`, transform: "translate(-50%, -50%)" }}
          />
        ))}

        {/* peak markers — clickable */}
        {PEAKS.map((p) => (
          <button
            key={p.h}
            type="button"
            aria-label={`Aller à ${p.label}`}
            onClick={() => {
              setHour(p.h);
              setPlaying(false);
            }}
            className="group absolute top-1/2 flex flex-col items-center gap-1 cursor-pointer"
            style={{ left: `${(p.h / 24) * 100}%`, transform: "translate(-50%, -50%)" }}
          >
            <span
              aria-hidden
              className="size-[6px] rounded-full bg-[color:var(--nafas-danger)]/85 shadow-[0_0_10px_-1px_rgba(226,75,74,0.8)] group-hover:size-[8px] transition-all"
            />
            <span
              className="absolute top-[10px] text-[8.5px] font-[family-name:var(--font-jetbrains)] tracking-[0.2em] uppercase text-[color:var(--nafas-danger)]/0 group-hover:text-[color:var(--nafas-danger)]/85 transition-colors whitespace-nowrap"
            >
              {p.label}
            </span>
          </button>
        ))}

        {/* thumb */}
        <div
          className="absolute top-1/2 flex items-center justify-center pointer-events-none"
          style={{ left: `${pct}%`, transform: "translate(-50%, -50%)" }}
        >
          <span
            aria-hidden
            className="absolute size-[26px] rounded-full bg-[color:var(--nafas-accent2)]/20 animate-pulse"
          />
          <span
            aria-hidden
            className="size-[14px] rounded-full bg-[color:var(--nafas-surface)] border-2 border-[color:var(--nafas-accent)] shadow-[0_0_18px_-2px_rgba(61,201,154,0.85)]"
          />
        </div>

        {/* invisible range input covering whole strip */}
        <input
          type="range"
          min={0}
          max={24}
          step={0.25}
          value={hour}
          onChange={(e) => {
            setHour(parseFloat(e.target.value));
            setPlaying(false);
          }}
          aria-label="Heure simulée"
          className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize"
        />
      </div>

      {/* bottom labels */}
      <div
        style={{ fontFamily: MONO, fontVariantNumeric: "tabular-nums" }}
        className="mt-1 grid grid-cols-5 text-[9px] uppercase tracking-[0.22em] text-[color:var(--nafas-ink3)]/55"
      >
        <span className="text-left">00h</span>
        <span className="text-center">06h</span>
        <span className="text-center">12h</span>
        <span className="text-center">18h</span>
        <span className="text-right">24h</span>
      </div>
    </div>
  );
}
