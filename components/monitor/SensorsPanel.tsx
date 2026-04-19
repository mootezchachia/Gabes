"use client";

import { useEffect, useMemo, useState } from "react";
import { useMonitor } from "@/lib/monitor/store";
import sensorsRaw from "@/public/data/sensors.json";

type Sensor = {
  id: number;
  lon: number;
  lat: number;
  ring: number;
  so2: number;
  no2: number;
  aqi: number;
  status: string;
  highlight?: string;
};

const SENSORS: Sensor[] = sensorsRaw as Sensor[];

// Seeded PRNG (mulberry32) so every sensor gets a stable-but-distinct sparkline
function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sparkPath(sensorId: number, w = 80, h = 20): { d: string; trendingUp: boolean } {
  const rand = mulberry32(sensorId * 97 + 13);
  const N = 12;
  const pts: number[] = [];
  let v = 0.5;
  for (let i = 0; i < N; i++) {
    v += (rand() - 0.5) * 0.35;
    v = Math.max(0.05, Math.min(0.95, v));
    pts.push(v);
  }
  const stepX = w / (N - 1);
  const d = pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${(i * stepX).toFixed(2)},${((1 - p) * h).toFixed(2)}`)
    .join(" ");
  const trendingUp = pts[N - 1] > pts[0];
  return { d, trendingUp };
}

function severity(so2: number): { label: string; color: string; pill: string } {
  if (so2 > 200) {
    return {
      label: "CRIT",
      color: "var(--nafas-danger)",
      pill: "bg-[color:var(--nafas-danger)]/15 text-[color:var(--nafas-danger)] border-[color:var(--nafas-danger)]/30",
    };
  }
  if (so2 > 100) {
    return {
      label: "ALRT",
      color: "var(--nafas-amber)",
      pill: "bg-[color:var(--nafas-amber)]/15 text-[color:var(--nafas-amber)] border-[color:var(--nafas-amber)]/30",
    };
  }
  return {
    label: "OK",
    color: "var(--nafas-cyan)",
    pill: "bg-[color:var(--nafas-cyan)]/15 text-[color:var(--nafas-cyan)] border-[color:var(--nafas-cyan)]/30",
  };
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function SensorsPanel() {
  const setSelectedEvent = useMonitor((s) => s.setSelectedEvent);
  const flyTo = useMonitor((s) => s.flyTo);

  const top8 = useMemo<Sensor[]>(
    () => [...SENSORS].sort((a, b) => b.so2 - a.so2).slice(0, 8),
    []
  );

  // Jittered live values — re-seed from base every 2s for that "breathing" live feel
  const [jitter, setJitter] = useState<Record<number, number>>({});
  useEffect(() => {
    const tick = () => {
      const next: Record<number, number> = {};
      for (const s of top8) {
        // +/- up to 4 µg/m³
        next[s.id] = Math.round((Math.random() - 0.5) * 8);
      }
      setJitter(next);
    };
    tick();
    const t = setInterval(tick, 2000);
    return () => clearInterval(t);
  }, [top8]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2 shrink-0">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inset-0 rounded-full bg-[color:var(--nafas-cyan)] animate-ping opacity-70" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[color:var(--nafas-cyan)]" />
        </span>
        <span
          className="font-mono uppercase tracking-[0.2em] text-[color:var(--nafas-ink3)]"
          style={{ fontSize: 10.5 }}
        >
          Capteurs HealiX · Live
        </span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-4 grid-rows-2 gap-1.5 flex-1 min-h-0">
        {top8.map((s) => {
          const sev = severity(s.so2);
          const displayed = s.so2 + (jitter[s.id] ?? 0);
          const { d, trendingUp } = sparkPath(s.id);
          const sparkColor = trendingUp
            ? "var(--nafas-danger)"
            : "var(--nafas-accent2)";
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setSelectedEvent({
                  id: `sensor-${s.id}`,
                  lon: s.lon,
                  lat: s.lat,
                  title: `Capteur S-${pad(s.id)}`,
                  body: `SO₂ ${displayed} µg/m³`,
                  date: new Date().toISOString(),
                  severity: "high",
                });
                flyTo();
              }}
              className="group text-left p-2 rounded-sm bg-white/[0.025] border border-white/[0.06] hover:border-white/20 hover:bg-white/[0.05] transition-colors cursor-pointer flex flex-col justify-between min-w-0"
            >
              {/* Top row: id + pill */}
              <div className="flex items-center justify-between gap-1">
                <span
                  className="font-mono text-[color:var(--nafas-ink3)] tracking-wider"
                  style={{ fontSize: 10 }}
                >
                  S-{pad(s.id)}
                </span>
                <span
                  className={[
                    "font-mono uppercase px-1 py-[1px] rounded-[2px] border tracking-wider",
                    sev.pill,
                  ].join(" ")}
                  style={{ fontSize: 8.5 }}
                >
                  {sev.label}
                </span>
              </div>

              {/* Value */}
              <div
                className="font-[family-name:var(--font-fraunces)] leading-none tracking-tight transition-colors"
                style={{ fontSize: 22, color: sev.color }}
              >
                {displayed}
                <span
                  className="ml-1 font-mono tracking-wider opacity-70"
                  style={{ fontSize: 9 }}
                >
                  µg/m³
                </span>
              </div>

              {/* Sparkline */}
              <svg
                width={80}
                height={20}
                viewBox="0 0 80 20"
                preserveAspectRatio="none"
                className="mt-1 w-full"
                aria-hidden
              >
                <path
                  d={d}
                  fill="none"
                  stroke={sparkColor}
                  strokeWidth={1.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.9}
                />
              </svg>

              {/* Label */}
              <span
                className="mt-1 font-sans text-[color:var(--nafas-ink3)] leading-tight truncate"
                style={{ fontSize: 10 }}
              >
                SO₂ · Ring {s.ring} · {s.ring === 1 ? "500 m" : s.ring === 2 ? "1 km" : "2 km"} GCT
              </span>
            </button>
          );
        })}
      </div>

      {/* Honesty */}
      <div
        className="pt-2 mt-1 font-mono uppercase tracking-wider text-[color:var(--nafas-ink3)]/60 shrink-0"
        style={{ fontSize: 9 }}
      >
        · Données simulées · réseau à déployer
      </div>
    </div>
  );
}
