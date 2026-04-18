"use client";

import { useEffect, useState } from "react";
import { useMonitor } from "@/lib/monitor/store";

type Severity = "CRIT" | "ALERTE" | "SURV" | "STABLE";

type PostureRow = {
  city: string;
  country: string;
  severity: Severity;
  note?: string;
};

const FALLBACK: PostureRow[] = [
  { city: "Gabès", country: "Tunisie", severity: "CRIT", note: "SO₂ 340 µg/m³ · 8× OMS" },
  { city: "Sfax", country: "Tunisie", severity: "ALERTE", note: "SIAPE · plaintes en hausse" },
  { city: "Tunis", country: "Tunisie", severity: "STABLE", note: "NO₂ normal" },
  { city: "Kerkennah", country: "Tunisie", severity: "SURV", note: "dérive plume possible" },
];

const SEV_COLOR: Record<Severity, string> = {
  CRIT: "text-[color:var(--nafas-danger)] border-[color:var(--nafas-danger)]/40 bg-[color:var(--nafas-danger)]/10",
  ALERTE:
    "text-[color:var(--nafas-amber)] border-[color:var(--nafas-amber)]/40 bg-[color:var(--nafas-amber)]/10",
  SURV: "text-[color:var(--nafas-cyan)] border-[color:var(--nafas-cyan)]/40 bg-[color:var(--nafas-cyan)]/10",
  STABLE:
    "text-[color:var(--nafas-accent2)] border-[color:var(--nafas-accent2)]/40 bg-[color:var(--nafas-accent2)]/10",
};

const SEV_DOT: Record<Severity, string> = {
  CRIT: "bg-[color:var(--nafas-danger)]",
  ALERTE: "bg-[color:var(--nafas-amber)]",
  SURV: "bg-[color:var(--nafas-cyan)]",
  STABLE: "bg-[color:var(--nafas-accent2)]",
};

export function Posture() {
  const [rows, setRows] = useState<PostureRow[]>(FALLBACK);
  const hoveredCity = useMonitor((s) => s.hoveredCity);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/data/posture.json", { cache: "no-store" });
        if (!r.ok) return;
        const data = (await r.json()) as PostureRow[];
        if (cancelled || !Array.isArray(data) || data.length === 0) return;
        setRows(data);
      } catch {
        /* keep fallback */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <h3 className="font-[family-name:var(--font-jetbrains)] text-[10.5px] uppercase tracking-[0.22em] text-[color:var(--nafas-ink3)]">
          Posture · MED
        </h3>
        <span className="font-[family-name:var(--font-jetbrains)] text-[9.5px] uppercase tracking-[0.22em] text-[color:var(--nafas-ink3)]/60">
          {rows.length} villes
        </span>
      </div>

      <ul className="flex flex-col divide-y divide-white/5 rounded-lg border border-white/10 bg-black/20">
        {rows.map((r) => {
          const active = hoveredCity === r.city;
          return (
            <li
              key={`${r.city}-${r.country}`}
              onMouseEnter={() => useMonitor.getState().setHoveredCity(r.city)}
              onMouseLeave={() => useMonitor.getState().setHoveredCity(null)}
              className={`flex cursor-pointer items-center justify-between gap-3 px-3 py-2.5 transition-colors ${
                active ? "bg-white/5" : "hover:bg-white/5"
              }`}
            >
              <div className="flex min-w-0 items-start gap-2.5">
                <span
                  className={`mt-[7px] size-1.5 shrink-0 rounded-full ${SEV_DOT[r.severity]}`}
                  aria-hidden
                />
                <div className="min-w-0">
                  <div className="truncate font-[family-name:var(--font-fraunces)] text-[14px] italic leading-tight text-[color:var(--nafas-surface)]">
                    {r.city}
                  </div>
                  <div className="mt-0.5 truncate text-[11px] leading-snug text-[color:var(--nafas-ink3)]">
                    {r.country}
                    {r.note ? <span className="text-[color:var(--nafas-ink3)]/70"> · {r.note}</span> : null}
                  </div>
                </div>
              </div>

              <span
                className={`shrink-0 rounded-sm border px-1.5 py-[2px] font-[family-name:var(--font-jetbrains)] text-[9.5px] uppercase tracking-[0.22em] ${SEV_COLOR[r.severity]}`}
              >
                {r.severity}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
