"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { LonLat } from "@/lib/dawa/types";
import type { RouteRecommendation } from "@/lib/dawa/routeRecommender";

function toneForRecommendation(
  rec: RouteRecommendation["recommendation"],
): { color: string; label: string } {
  if (rec === "reste_interieur") {
    return { color: "var(--nafas-danger)", label: "Reste à l’intérieur" };
  }
  if (rec === "evite_rue_nord") {
    return { color: "var(--nafas-amber)", label: "Évite la rue nord" };
  }
  return { color: "var(--nafas-accent2)", label: "Trajet normal" };
}

export function TrajetCard({
  home,
  school,
  bottomOffset = 72,
}: {
  home: LonLat | null;
  school: LonLat | null;
  bottomOffset?: number;
}) {
  const [expanded, setExpanded] = useState(false);

  const enabled = !!(home && school);

  const { data, isLoading, error } = useQuery<RouteRecommendation>({
    queryKey: ["dawa", "route", home, school],
    enabled,
    queryFn: async () => {
      const qs = new URLSearchParams({
        home: `${home![0]},${home![1]}`,
        dest: `${school![0]},${school![1]}`,
      });
      const res = await fetch(`/api/dawa/route?${qs.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Route API ${res.status}`);
      return (await res.json()) as RouteRecommendation;
    },
    staleTime: 2 * 60_000,
    refetchInterval: 5 * 60_000,
  });

  if (!enabled) return null;

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 w-full max-w-[460px] px-3 z-30"
      style={{
        bottom: `calc(${bottomOffset}px + env(safe-area-inset-bottom))`,
      }}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="w-full text-left rounded-xl border border-white/[0.08] bg-[color:var(--nafas-bg2)]/90 backdrop-blur-md px-4 py-3 hover:bg-[color:var(--nafas-bg2)] transition-colors"
        style={{
          boxShadow:
            "0 18px 40px -18px rgba(0,0,0,0.9), inset 0 1px 0 0 rgba(255,255,255,0.04)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            aria-hidden
            className="size-2.5 rounded-full"
            style={{
              background: data
                ? toneForRecommendation(data.recommendation).color
                : "var(--nafas-ink3)",
              boxShadow: data
                ? `0 0 10px 0 ${toneForRecommendation(data.recommendation).color}`
                : "none",
            }}
          />
          <div className="min-w-0 flex-1">
            <div
              className="text-[10px] tracking-[0.22em] uppercase text-[color:var(--nafas-ink3)]"
              style={{ fontFamily: "var(--font-jetbrains), monospace" }}
            >
              Trajet du jour · école
            </div>
            <div className="text-[13.5px] text-[color:var(--nafas-surface)] truncate mt-0.5">
              {isLoading
                ? "Calcul du meilleur trajet…"
                : error
                  ? "Données indisponibles"
                  : data
                    ? toneForRecommendation(data.recommendation).label
                    : "—"}
            </div>
          </div>
          <div
            className="text-[11px] tabular-nums text-[color:var(--nafas-ink3)]"
            style={{ fontFamily: "var(--font-jetbrains), monospace" }}
          >
            {data
              ? `${Math.round(data.primary.distanceMeters)} m`
              : "— m"}
          </div>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            className="text-[color:var(--nafas-ink3)] transition-transform"
            style={{ transform: expanded ? "rotate(180deg)" : "none" }}
            aria-hidden
          >
            <path
              d="M6 9l6 6 6-6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {expanded && data ? (
          <div className="mt-3 pt-3 border-t border-white/[0.06]">
            <p className="text-[12.5px] leading-[1.5] text-[color:var(--nafas-surface)]">
              {data.message}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-[family-name:var(--font-jetbrains)]">
              <RouteBlock
                label="Habituel"
                distance={data.primary.distanceMeters}
                exposure={data.primary.exposureIndex}
              />
              <RouteBlock
                label="Détour"
                distance={data.alternative.distanceMeters}
                exposure={data.alternative.exposureIndex}
              />
            </div>
            <MiniRoutePreview
              primary={data.primary.polyline}
              alternative={data.alternative.polyline}
              primaryColor="var(--nafas-danger)"
              alternativeColor="var(--nafas-accent2)"
            />
          </div>
        ) : null}
      </button>
    </div>
  );
}

function RouteBlock({
  label,
  distance,
  exposure,
}: {
  label: string;
  distance: number;
  exposure: number;
}) {
  const color =
    exposure >= 1
      ? "var(--nafas-danger)"
      : exposure >= 0.5
        ? "var(--nafas-amber)"
        : "var(--nafas-accent2)";
  return (
    <div className="rounded-md border border-white/[0.06] bg-[color:var(--nafas-bg3)]/50 px-2.5 py-2">
      <div className="tracking-[0.2em] uppercase text-[9.5px] text-[color:var(--nafas-ink3)]">
        {label}
      </div>
      <div className="tabular-nums text-[12px] mt-1 flex items-baseline justify-between">
        <span className="text-[color:var(--nafas-surface)]">
          {Math.round(distance)} m
        </span>
        <span style={{ color }}>{(exposure * 100).toFixed(0)}%</span>
      </div>
    </div>
  );
}

function MiniRoutePreview({
  primary,
  alternative,
  primaryColor,
  alternativeColor,
}: {
  primary: LonLat[];
  alternative: LonLat[];
  primaryColor: string;
  alternativeColor: string;
}) {
  // Fit polylines into an SVG viewBox.
  const all = [...primary, ...alternative];
  const lons = all.map((p) => p[0]);
  const lats = all.map((p) => p[1]);
  const minX = Math.min(...lons);
  const maxX = Math.max(...lons);
  const minY = Math.min(...lats);
  const maxY = Math.max(...lats);
  const pad = 0.001;
  const w = maxX - minX + pad * 2 || 1;
  const h = maxY - minY + pad * 2 || 1;
  const VB = 100;
  const project = ([x, y]: LonLat) => {
    const nx = ((x - minX + pad) / w) * VB;
    const ny = VB - ((y - minY + pad) / h) * VB; // invert Y
    return `${nx.toFixed(2)},${ny.toFixed(2)}`;
  };
  const toPath = (line: LonLat[]) =>
    line.map((p, i) => (i === 0 ? "M" : "L") + project(p)).join(" ");

  return (
    <svg
      viewBox={`0 0 ${VB} ${VB}`}
      className="mt-3 w-full h-[90px] rounded-md border border-white/[0.06] bg-[color:var(--nafas-bg3)]/60"
      aria-hidden
    >
      <path
        d={toPath(primary)}
        stroke={primaryColor}
        strokeWidth={1.8}
        strokeDasharray="3 3"
        fill="none"
        opacity={0.85}
      />
      <path
        d={toPath(alternative)}
        stroke={alternativeColor}
        strokeWidth={1.8}
        fill="none"
      />
      {primary.length > 0 ? (
        <>
          <circle
            cx={project(primary[0]).split(",")[0]}
            cy={project(primary[0]).split(",")[1]}
            r={2.5}
            fill="var(--nafas-surface)"
          />
          <circle
            cx={project(primary[primary.length - 1]).split(",")[0]}
            cy={project(primary[primary.length - 1]).split(",")[1]}
            r={2.5}
            fill="var(--nafas-accent2)"
          />
        </>
      ) : null}
    </svg>
  );
}
