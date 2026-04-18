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
  { h: 8.5, label: "08:30" },
  { h: 14.5, label: "14:30 · pic" },
  { h: 20, label: "20:00" },
];

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
      className="absolute bottom-5 left-1/2 -translate-x-1/2 z-40 w-[min(720px,calc(100vw-32px))] rounded-[14px] border border-white/[0.08] bg-[color:var(--nafas-bg)]/62 px-4 py-3 backdrop-blur-2xl shadow-[0_24px_60px_-24px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.02)_inset]"
      style={{
        backgroundImage:
          "linear-gradient(180deg, rgba(26,35,48,0.38) 0%, rgba(10,15,20,0.55) 100%)",
      }}
    >
      {/* top row: play + readout + reset */}
      <div className="flex items-center gap-3 mb-2.5">
        <button
          type="button"
          aria-label={playing ? "Pause" : "Lecture"}
          onClick={() => setPlaying(!playing)}
          className="size-7 rounded-full bg-[color:var(--nafas-accent)] hover:bg-[color:var(--nafas-accent2)] text-black grid place-items-center transition-colors cursor-pointer"
        >
          {playing ? <Pause className="size-[13px]" strokeWidth={2.2} /> : <Play className="size-[13px] ml-[1px]" strokeWidth={2.2} />}
        </button>

        <div className="flex-1 min-w-0 flex items-baseline gap-3">
          <div
            style={{ fontFamily: DISPLAY }}
            className="text-[22px] leading-none font-light tracking-[-0.02em] text-[color:var(--nafas-surface)]"
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
          className="flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1 hover:bg-white/5 transition-colors cursor-pointer"
          style={{ fontFamily: MONO }}
        >
          <RotateCcw className="size-[11px] text-[color:var(--nafas-ink3)]" strokeWidth={1.8} />
          <span className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--nafas-ink3)]">Maintenant</span>
        </button>
      </div>

      {/* scrubber */}
      <div className="relative h-7 select-none">
        {/* track */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px] rounded-full bg-white/8 overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-[color:var(--nafas-accent)] via-[color:var(--nafas-amber)] to-[color:var(--nafas-danger)]"
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* hour marks */}
        {MARKS.map((m) => (
          <div
            key={m}
            className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center gap-1 text-[color:var(--nafas-ink3)]/70"
            style={{ left: `${(m / 24) * 100}%`, transform: `translate(-50%, -50%)`, fontFamily: MONO }}
          >
            <div className="h-1.5 w-px bg-white/15" />
          </div>
        ))}

        {/* peak markers */}
        {PEAKS.map((p) => (
          <div
            key={p.h}
            aria-hidden
            className="absolute -top-1 size-[5px] rounded-full bg-[color:var(--nafas-danger)]/80 shadow-[0_0_8px_-1px_rgba(226,75,74,0.8)]"
            style={{ left: `${(p.h / 24) * 100}%`, transform: `translate(-50%, 0)` }}
          />
        ))}

        {/* thumb */}
        <div
          className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none"
          style={{ left: `${pct}%`, transform: `translate(-50%, -50%)` }}
        >
          <div className="size-3.5 rounded-full bg-[color:var(--nafas-surface)] border-2 border-[color:var(--nafas-accent)] shadow-[0_0_14px_-2px_rgba(61,201,154,0.75)]" />
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
        style={{ fontFamily: MONO }}
        className="mt-1.5 flex justify-between text-[9px] uppercase tracking-[0.18em] text-[color:var(--nafas-ink3)]/60"
      >
        <span>00h</span>
        <span>06h</span>
        <span>12h</span>
        <span>18h</span>
        <span>24h</span>
      </div>
    </div>
  );
}
