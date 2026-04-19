"use client";

import { useEffect, useState } from "react";
import type { Reading, Severity } from "@/lib/dawa/types";
import {
  severityColor,
  severityLabel,
  severitySubtitle,
} from "@/lib/dawa/severity";

interface Props {
  severity: Severity;
  driver: Reading | null;
  size?: number;
}

/**
 * Hero status ring for /dawa.
 *
 * Design notes:
 *   - SVG circle with a gradient stroke, severity-coloured.
 *   - Very slow rotation (360° / 120s) to feel alive; respects
 *     prefers-reduced-motion.
 *   - Centre: Fraunces-300 italic word (Respire / Attention / Évite).
 *   - Below centre: JetBrains-Mono reading snapshot (driver sensor).
 */
export function StatusRing({ severity, driver, size = 240 }: Props) {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  const color = severityColor(severity);
  const label = severityLabel(severity);
  const sub = severitySubtitle(severity);

  const r = size / 2 - 14;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <div
      className="relative mx-auto"
      style={{ width: size, height: size }}
      aria-live="polite"
      aria-label={`Qualité de l’air: ${label}. ${sub}`}
    >
      {/* Halo */}
      <div
        aria-hidden
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(closest-side, color-mix(in srgb, ${color} 22%, transparent), transparent 70%)`,
          transition: "background 600ms var(--ease-editorial)",
          filter: "blur(12px)",
        }}
      />

      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="relative"
        style={{
          animation: reduced ? "none" : "dawa-ring-spin 120s linear infinite",
          transition: "color 600ms var(--ease-editorial)",
          color,
        }}
      >
        <defs>
          <linearGradient id="dawa-ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.95" />
            <stop offset="60%" stopColor="currentColor" stopOpacity="0.5" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {/* Subtle inner track */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={2}
        />
        {/* Primary severity ring */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="url(#dawa-ring-grad)"
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={`${Math.PI * 2 * r * 0.82} ${Math.PI * 2 * r * 0.18}`}
          style={{
            transition: "stroke 600ms var(--ease-editorial)",
          }}
        />
        {/* Tick marks */}
        {Array.from({ length: 24 }).map((_, i) => {
          const a = (i / 24) * Math.PI * 2;
          const x1 = cx + Math.cos(a) * (r + 6);
          const y1 = cy + Math.sin(a) * (r + 6);
          const x2 = cx + Math.cos(a) * (r + 10);
          const y2 = cy + Math.sin(a) * (r + 10);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="rgba(255,255,255,0.14)"
              strokeWidth={1}
            />
          );
        })}
      </svg>

      {/* Centre label — counter-rotates so it stays upright. */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none"
        style={{
          animation: reduced ? "none" : "dawa-ring-counter 120s linear infinite",
        }}
      >
        <div
          className="tracking-[-0.02em] italic font-light"
          style={{
            fontFamily: "var(--font-fraunces), Georgia, serif",
            fontWeight: 300,
            fontSize: `${Math.round(size * 0.195)}px`,
            lineHeight: 1,
            color,
            transition: "color 600ms var(--ease-editorial)",
          }}
        >
          {label}
        </div>
        <div className="text-[11px] mt-2 tracking-[0.18em] uppercase text-[color:var(--nafas-ink3)]">
          {sub}
        </div>
        {driver ? (
          <div
            className="mt-3 text-[12px] tabular-nums"
            style={{
              fontFamily: "var(--font-jetbrains), ui-monospace, monospace",
              color: "var(--nafas-surface)",
            }}
          >
            {driver.type.toUpperCase()}{" "}
            <span style={{ color }}>{driver.value.toFixed(1)}</span>{" "}
            <span className="text-[color:var(--nafas-ink3)]">{driver.unit}</span>
          </div>
        ) : (
          <div className="mt-3 text-[11px] text-[color:var(--nafas-ink3)]">
            Lecture en cours…
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes dawa-ring-spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes dawa-ring-counter {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(-360deg);
          }
        }
      `}</style>
    </div>
  );
}
