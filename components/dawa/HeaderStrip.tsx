"use client";

import { useEffect, useState } from "react";
import type { Profile, Weather } from "@/lib/dawa/types";

interface Props {
  profile: Profile | null;
  weather: Weather | null;
  onOpenSettings: () => void;
}

function useGabesTime(): string {
  const [now, setNow] = useState<string>("—:—");
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const fmt = new Intl.DateTimeFormat("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Africa/Tunis",
      });
      setNow(fmt.format(d));
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function salutation(): string {
  const h = new Date().getHours();
  if (h < 5) return "Bonne nuit";
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon après-midi";
  return "Bonsoir";
}

function WeatherIcon({ deg }: { deg: number | null }) {
  // Simple wind-direction chevron.
  if (deg == null) return <span aria-hidden>∿</span>;
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        transform: `rotate(${deg}deg)`,
        fontFamily: "var(--font-jetbrains), monospace",
      }}
    >
      ↑
    </span>
  );
}

export function HeaderStrip({ profile, weather, onOpenSettings }: Props) {
  const time = useGabesTime();
  const name = profile?.fullName || "";
  return (
    <header
      className="flex items-center justify-between gap-3 h-14 px-4 border-b border-white/[0.06]"
      style={{
        background:
          "linear-gradient(180deg, color-mix(in srgb, var(--nafas-bg2) 65%, transparent), transparent)",
      }}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span
            className="italic font-light tracking-[-0.02em] text-[15px] text-[color:var(--nafas-surface)]"
            style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
          >
            {salutation()}
            {name ? ` ${name}` : ""}
          </span>
        </div>
        <div
          className="text-[10.5px] tracking-[0.18em] uppercase text-[color:var(--nafas-ink3)] mt-0.5 truncate"
          style={{ fontFamily: "var(--font-jetbrains), monospace" }}
        >
          Gabès · {time}
        </div>
      </div>

      <div
        className="flex items-center gap-2 text-[12px] tabular-nums text-[color:var(--nafas-ink3)]"
        style={{ fontFamily: "var(--font-jetbrains), monospace" }}
      >
        {weather?.temperatureC != null ? (
          <span className="text-[color:var(--nafas-surface)]">
            {Math.round(weather.temperatureC)}°
          </span>
        ) : null}
        {weather?.windspeedMps != null ? (
          <span title="Vent">
            <WeatherIcon deg={weather.winddirectionDeg} />{" "}
            {weather.windspeedMps.toFixed(1)} m/s
          </span>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onOpenSettings}
        aria-label="Paramètres"
        className="ml-1 h-9 w-9 inline-flex items-center justify-center rounded-full border border-white/[0.08] hover:bg-white/[0.04] transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06A2 2 0 117.05 4.3l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
      </button>
    </header>
  );
}
