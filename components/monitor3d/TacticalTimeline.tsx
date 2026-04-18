"use client";

import { useEffect, useRef } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { useMonitor } from "@/lib/monitor/store";

const TICKS_MAJOR = [0, 3, 6, 9, 12, 15, 18, 21, 24];
const PEAKS = [
  { h: 8.5, label: "Matin · démarrage" },
  { h: 14.5, label: "Pic diurne · inversion" },
  { h: 20, label: "Soir · dispersion marine" },
];

function hhmm(h: number) {
  const H = Math.floor(h);
  const M = Math.floor((h - H) * 60);
  return `${H.toString().padStart(2, "0")}:${M.toString().padStart(2, "0")}`;
}

function phase(h: number): string {
  if (h < 6) return "NUIT · INVERSION THERMIQUE";
  if (h < 10) return "MATIN · DÉMARRAGE INDUSTRIEL";
  if (h < 14) return "MIDI · PIC ÉMISSION GCT";
  if (h < 18) return "APRÈS-MIDI · PLUME DOMINANTE";
  if (h < 21) return "SOIR · DISPERSION MARINE";
  return "NUIT · INVERSION THERMIQUE";
}

/**
 * Bottom-center tactical timeline. 24h simulated cycle with tick marks,
 * peak markers, play/pause, and "Now" reset. All type is mono tabular.
 */
export function TacticalTimeline() {
  const hour = useMonitor((s) => s.hourOfDay);
  const playing = useMonitor((s) => s.timePlaying);
  const setHour = useMonitor((s) => s.setHourOfDay);
  const setPlaying = useMonitor((s) => s.setTimePlaying);

  const rafRef = useRef<number>(0);
  const lastPushRef = useRef<number>(0);

  useEffect(() => {
    if (!playing) return;
    // Push hourOfDay at ~10 Hz. Atmosphere / header components subscribe to
    // it and each update triggers a full React re-render (with 36 tick
    // marks + a compass), so capping the store churn here is worth ~6× the
    // React work vs rAF-rate updates. 2× sim speed → hour advances 0.2 per
    // tick, still perceptibly smooth.
    const PUSH_INTERVAL_MS = 100;
    lastPushRef.current = performance.now();
    const tick = (now: number) => {
      const elapsed = now - lastPushRef.current;
      if (elapsed >= PUSH_INTERVAL_MS) {
        lastPushRef.current = now;
        const next = useMonitor.getState().hourOfDay + (elapsed / 1000) * 2;
        setHour(next >= 24 ? next - 24 : next);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, setHour]);

  const pct = (hour / 24) * 100;

  return (
    <div
      role="group"
      aria-label="Horloge simulée 24h"
      className="tac-panel absolute bottom-4 left-1/2 -translate-x-1/2 z-40 w-[min(780px,calc(100vw-640px))] min-w-[560px] px-4 py-3"
      data-edge="accent"
    >
      {/* header row — play + readout + phase + now */}
      <div className="flex items-center gap-3 mb-3">
        <button
          type="button"
          aria-label={playing ? "Pause" : "Lecture"}
          onClick={() => setPlaying(!playing)}
          className="relative size-[30px] grid place-items-center text-[color:var(--nafas-bg)] cursor-pointer transition-colors"
          style={{
            background: "var(--nafas-cyan)",
            clipPath: "polygon(8% 0, 92% 0, 100% 100%, 0 100%)",
            boxShadow: "0 0 18px -2px rgba(62,201,208,0.65)",
          }}
        >
          {playing ? (
            <Pause className="size-[12px]" strokeWidth={2.4} />
          ) : (
            <Play className="size-[12px] ml-[1px]" strokeWidth={2.4} />
          )}
        </button>

        <div className="flex items-baseline gap-3 flex-1 min-w-0">
          <span className="tac-readout-big text-[color:var(--nafas-surface)]">
            {hhmm(hour)}
          </span>
          <span className="tac-label text-[color:var(--nafas-ink3)]/90 truncate">
            {phase(hour)}
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            const now = new Date();
            setHour(now.getHours() + now.getMinutes() / 60);
            setPlaying(false);
          }}
          className="tac-btn"
        >
          <RotateCcw className="size-[10px]" strokeWidth={1.8} />
          MAINTENANT
        </button>
      </div>

      {/* scrubber */}
      <div className="relative h-[34px] select-none">
        {/* track */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px] bg-white/[0.08]">
          <div
            className="absolute inset-y-0 left-0"
            style={{
              width: `${pct}%`,
              background:
                "linear-gradient(90deg, rgba(62,201,208,0.9) 0%, rgba(239,159,39,0.9) 55%, rgba(226,75,74,0.9) 100%)",
              boxShadow: "0 0 6px -1px rgba(62,201,208,0.5)",
            }}
          />
        </div>

        {/* tick marks — every hour */}
        {Array.from({ length: 25 }).map((_, i) => {
          const isMajor = TICKS_MAJOR.includes(i);
          return (
            <span
              key={i}
              aria-hidden
              className={`absolute top-1/2 -translate-y-1/2 ${isMajor ? "tac-tick tac-tick--major" : "tac-tick"}`}
              style={{ left: `${(i / 24) * 100}%`, transform: "translate(-50%, -50%)" }}
            />
          );
        })}

        {/* peak markers — clickable */}
        {PEAKS.map((p) => (
          <button
            key={p.h}
            type="button"
            aria-label={p.label}
            onClick={() => {
              setHour(p.h);
              setPlaying(false);
            }}
            className="group absolute top-1/2 flex flex-col items-center cursor-pointer"
            style={{ left: `${(p.h / 24) * 100}%`, transform: "translate(-50%, -50%)" }}
          >
            <span
              aria-hidden
              className="size-0"
              style={{
                borderLeft: "4.5px solid transparent",
                borderRight: "4.5px solid transparent",
                borderTop: "7px solid var(--nafas-danger)",
                filter: "drop-shadow(0 0 6px rgba(226,75,74,0.7))",
                marginBottom: "2px",
              }}
            />
          </button>
        ))}

        {/* thumb */}
        <div
          className="absolute top-1/2 flex items-center justify-center pointer-events-none"
          style={{ left: `${pct}%`, transform: "translate(-50%, -50%)" }}
        >
          <span
            aria-hidden
            className="absolute size-[22px] rounded-full border border-[color:var(--nafas-cyan)]/40 animate-pulse"
          />
          <span
            aria-hidden
            className="size-[12px] border-[1.5px] border-[color:var(--nafas-cyan)] bg-[color:var(--nafas-bg)] rotate-45 shadow-[0_0_14px_-1px_rgba(62,201,208,0.9)]"
          />
        </div>

        {/* invisible range input */}
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

      {/* bottom hour labels */}
      <div className="mt-1 grid grid-cols-9 text-[8.5px]">
        {TICKS_MAJOR.map((t, i) => (
          <span
            key={t}
            className="tac-label text-[color:var(--nafas-ink3)]/55 tracking-[0.22em]"
            style={{
              textAlign: i === 0 ? "left" : i === TICKS_MAJOR.length - 1 ? "right" : "center",
            }}
          >
            {t.toString().padStart(2, "0")}H
          </span>
        ))}
      </div>
    </div>
  );
}
