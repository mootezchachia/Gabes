"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { useMonitor, type SelectedEvent } from "@/lib/monitor/store";

type Severity = "high" | "medium" | "low";

type IncidentProps = {
  id: string;
  title: string;
  body: string;
  date: string; // ISO
  severity: Severity;
  sourceUrl?: string;
};

type IncidentFeature = {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: IncidentProps;
};

type IncidentsFile = {
  type: "FeatureCollection";
  features: IncidentFeature[];
};

const FALLBACK: IncidentFeature[] = [
  {
    type: "Feature",
    geometry: { type: "Point", coordinates: [10.1054, 33.9121] },
    properties: {
      id: "fb-2025-10-14",
      title: "Chatt Essalam — asphyxie collective",
      body: "Dizaines de cas signalés au CHU de Gabès. Pic SO₂ mesuré 420 µg/m³ à 500 m du site GCT.",
      date: "2025-10-14T08:15:00Z",
      severity: "high",
      sourceUrl: "https://nawaat.org",
    },
  },
  {
    type: "Feature",
    geometry: { type: "Point", coordinates: [10.1054, 33.9121] },
    properties: {
      id: "fb-2025-10-21",
      title: "Grève générale contre la pollution",
      body: "Appel FTDES · grève suivie dans les secteurs éducation et santé, cortège jusqu'au gouvernorat.",
      date: "2025-10-21T09:00:00Z",
      severity: "medium",
      sourceUrl: "https://ftdes.net",
    },
  },
  {
    type: "Feature",
    geometry: { type: "Point", coordinates: [10.1054, 33.9121] },
    properties: {
      id: "fb-2025-12-03",
      title: "Fermeture d'écoles — Ghannouch",
      body: "Trois établissements scolaires fermés 48h après dépassements répétés des seuils réglementaires.",
      date: "2025-12-03T06:30:00Z",
      severity: "low",
    },
  },
];

const SEV_COLOR_BG: Record<Severity, string> = {
  high: "bg-[color:var(--nafas-danger)]",
  medium: "bg-[color:var(--nafas-amber)]",
  low: "bg-[color:var(--nafas-cyan)]",
};

const SEV_COLOR_TEXT: Record<Severity, string> = {
  high: "text-[color:var(--nafas-danger)] border-[color:var(--nafas-danger)]/40 bg-[color:var(--nafas-danger)]/10",
  medium: "text-[color:var(--nafas-amber)] border-[color:var(--nafas-amber)]/40 bg-[color:var(--nafas-amber)]/10",
  low: "text-[color:var(--nafas-cyan)] border-[color:var(--nafas-cyan)]/40 bg-[color:var(--nafas-cyan)]/10",
};

const SEV_LABEL: Record<Severity, string> = {
  high: "CRIT",
  medium: "ALERTE",
  low: "SURV",
};

function toSelectedEvent(f: IncidentFeature): SelectedEvent {
  const [lon, lat] = f.geometry.coordinates;
  const p = f.properties;
  return {
    id: p.id,
    lon,
    lat,
    title: p.title,
    body: p.body,
    date: p.date,
    severity: p.severity,
    sourceUrl: p.sourceUrl,
  };
}

const RTF = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });

function relativeFromNow(iso: string, now: number): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffSec = Math.round((then - now) / 1000);
  const absSec = Math.abs(diffSec);
  if (absSec < 60) return RTF.format(diffSec, "second");
  const diffMin = Math.round(diffSec / 60);
  if (Math.abs(diffMin) < 60) return RTF.format(diffMin, "minute");
  const diffHr = Math.round(diffMin / 60);
  if (Math.abs(diffHr) < 24) return RTF.format(diffHr, "hour");
  const diffDay = Math.round(diffHr / 24);
  if (Math.abs(diffDay) < 30) return RTF.format(diffDay, "day");
  const diffMon = Math.round(diffDay / 30);
  if (Math.abs(diffMon) < 12) return RTF.format(diffMon, "month");
  const diffYr = Math.round(diffMon / 12);
  return RTF.format(diffYr, "year");
}

export function EventsFeed() {
  const [features, setFeatures] = useState<IncidentFeature[]>(FALLBACK);
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/data/incidents.geojson", { cache: "no-store" });
        if (!r.ok) return;
        const data = (await r.json()) as IncidentsFile;
        if (cancelled || !data?.features?.length) return;
        setFeatures(data.features);
      } catch {
        /* keep fallback */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const sorted = useMemo(() => {
    return [...features].sort((a, b) => {
      const da = new Date(a.properties.date).getTime() || 0;
      const db = new Date(b.properties.date).getTime() || 0;
      return db - da;
    });
  }, [features]);

  const handleClick = (f: IncidentFeature) => {
    const sel = toSelectedEvent(f);
    useMonitor.getState().setSelectedEvent(sel);
    useMonitor.getState().flyTo();
  };

  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <h3 className="font-[family-name:var(--font-jetbrains)] text-[10.5px] uppercase tracking-[0.22em] text-[color:var(--nafas-ink3)]">
          Événements récents · Golfe
        </h3>
        <button
          type="button"
          className="group/all inline-flex cursor-pointer items-center gap-1 font-[family-name:var(--font-jetbrains)] text-[10px] uppercase tracking-[0.2em] text-[color:var(--nafas-ink3)] transition-colors hover:text-[color:var(--nafas-surface)]"
        >
          Tout voir
          <ArrowUpRight
            className="size-3 transition-transform group-hover/all:translate-x-[1px] group-hover/all:-translate-y-[1px]"
            strokeWidth={2}
          />
        </button>
      </div>

      <ol className="flex flex-col">
        {sorted.map((f, idx) => {
          const p = f.properties;
          const isLast = idx === sorted.length - 1;
          return (
            <li key={p.id} className="relative">
              <button
                type="button"
                onClick={() => handleClick(f)}
                className="group/ev flex w-full cursor-pointer items-stretch gap-3 rounded-md px-1 py-2.5 text-left transition-colors hover:bg-white/5"
              >
                {/* Timeline rail */}
                <div className="relative flex w-3 shrink-0 justify-center">
                  <span
                    className={`mt-[6px] size-2 shrink-0 rounded-full ring-2 ring-black/40 ${SEV_COLOR_BG[p.severity]}`}
                    aria-hidden
                  />
                  {!isLast && (
                    <span
                      aria-hidden
                      className="absolute left-1/2 top-[18px] bottom-[-10px] w-px -translate-x-1/2 bg-white/10"
                    />
                  )}
                </div>

                {/* Card body */}
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-[family-name:var(--font-jetbrains)] text-[10px] uppercase tracking-[0.2em] text-[color:var(--nafas-ink3)]">
                      {relativeFromNow(p.date, now)}
                    </span>
                    <span
                      className={`rounded-sm border px-1.5 py-[1px] font-[family-name:var(--font-jetbrains)] text-[9px] uppercase tracking-[0.22em] ${SEV_COLOR_TEXT[p.severity]}`}
                    >
                      {SEV_LABEL[p.severity]}
                    </span>
                  </div>
                  <h4 className="font-[family-name:var(--font-fraunces)] text-[13px] italic leading-snug text-[color:var(--nafas-surface)] transition-colors group-hover/ev:text-white">
                    {p.title}
                  </h4>
                  <p className="line-clamp-2 text-[11px] leading-snug text-[color:var(--nafas-ink3)]">
                    {p.body}
                  </p>
                </div>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
