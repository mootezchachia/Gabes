"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertOctagon, ExternalLink, Sparkles, X } from "lucide-react";
import { useMonitor } from "@/lib/monitor/store";
import { useFakeStream } from "@/lib/monitor/useFakeStream";

interface Brief {
  id: string;
  text: string;
  tags: string[];
}

const MONO = "var(--font-jetbrains), ui-monospace, monospace";
const DISPLAY = "var(--font-fraunces), Georgia, serif";

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

const SEV_CONFIG = {
  high: {
    label: "CRITIQUE",
    dot: "var(--nafas-danger)",
    ink: "var(--nafas-danger)",
    bg: "rgba(226,75,74,0.12)",
    ring: "rgba(226,75,74,0.35)",
  },
  medium: {
    label: "ALERTE",
    dot: "var(--nafas-amber)",
    ink: "var(--nafas-amber)",
    bg: "rgba(239,159,39,0.12)",
    ring: "rgba(239,159,39,0.35)",
  },
  low: {
    label: "SURVEILLANCE",
    dot: "var(--nafas-accent2)",
    ink: "var(--nafas-accent2)",
    bg: "rgba(62,201,154,0.10)",
    ring: "rgba(62,201,154,0.30)",
  },
} as const;

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatCoord(lon: number, lat: number): string {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lon >= 0 ? "E" : "O";
  return `${Math.abs(lat).toFixed(3)}°${ns} · ${Math.abs(lon).toFixed(3)}°${ew}`;
}

export function InspectCard() {
  const selected = useMonitor((s) => s.selectedEvent);
  const setSelected = useMonitor((s) => s.setSelectedEvent);

  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/data/brief-scripts.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (alive && j?.briefs) setBriefs(j.briefs as Brief[]);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!selected) {
      setMounted(false);
      return;
    }
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, [selected]);

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, setSelected]);

  const brief = useMemo<Brief | null>(() => {
    if (!selected || briefs.length === 0) return null;
    const idx = hashString(selected.id) % briefs.length;
    return briefs[idx] ?? null;
  }, [selected, briefs]);

  const streamed = useFakeStream(brief?.text ?? "", 42);

  if (!selected) return null;

  const sev = SEV_CONFIG[selected.severity];

  return (
    <div
      role="dialog"
      aria-label={selected.title}
      className="pointer-events-auto fixed z-40 bottom-[84px] md:bottom-[92px] left-1/2 -translate-x-1/2 w-[min(92vw,440px)]"
      style={{
        opacity: mounted ? 1 : 0,
        transform: `translate(-50%, ${mounted ? "0" : "14px"})`,
        transition:
          "opacity 360ms cubic-bezier(0.22,1,0.36,1), transform 420ms cubic-bezier(0.22,1,0.36,1)",
      }}
    >
      <div
        className="relative overflow-hidden rounded-[14px] border border-white/[0.09] bg-[rgba(10,15,20,0.78)] backdrop-blur-2xl shadow-[0_24px_60px_-12px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.03)_inset]"
      >
        {/* severity accent edge */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-px"
          style={{
            background: `linear-gradient(90deg, transparent, ${sev.ink}, transparent)`,
          }}
        />

        {/* close */}
        <button
          onClick={() => setSelected(null)}
          aria-label="Fermer"
          className="absolute top-3 right-3 z-10 grid size-7 place-items-center rounded-md text-[color:var(--nafas-ink3)] hover:text-[color:var(--nafas-surface)] hover:bg-white/5 transition-colors"
        >
          <X className="size-4" strokeWidth={1.6} />
        </button>

        {/* header */}
        <div className="px-5 pt-5 pb-4 border-b border-white/[0.05]">
          <div className="flex items-center gap-2 mb-2.5">
            <span
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-[10px] tracking-[0.2em] uppercase font-[500]"
              style={{
                fontFamily: MONO,
                color: sev.ink,
                background: sev.bg,
                boxShadow: `inset 0 0 0 1px ${sev.ring}`,
              }}
            >
              <span
                aria-hidden
                className="size-[5px] rounded-full animate-pulse"
                style={{ background: sev.dot }}
              />
              {sev.label}
            </span>
            <span
              className="text-[10px] tracking-[0.18em] uppercase text-[color:var(--nafas-ink3)]"
              style={{ fontFamily: MONO }}
            >
              {formatDate(selected.date)}
            </span>
          </div>

          <h3
            className="text-[19px] leading-[1.2] tracking-[-0.01em] text-[color:var(--nafas-surface)] pr-7"
            style={{ fontFamily: DISPLAY, fontWeight: 400 }}
          >
            {selected.title}
          </h3>

          {selected.body ? (
            <p className="mt-2 text-[13px] leading-[1.55] text-[color:var(--nafas-ink3)]">
              {selected.body}
            </p>
          ) : null}

          <div
            className="mt-3 flex items-center gap-2 text-[10.5px] tracking-[0.15em] uppercase text-[color:var(--nafas-ink3)]/70"
            style={{ fontFamily: MONO }}
          >
            <AlertOctagon className="size-3" strokeWidth={1.6} />
            <span>{formatCoord(selected.lon, selected.lat)}</span>
          </div>
        </div>

        {/* AI brief */}
        <div className="px-5 py-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="size-3 text-[color:var(--nafas-accent2)]" strokeWidth={1.8} />
            <span
              className="text-[10px] tracking-[0.22em] uppercase text-[color:var(--nafas-accent2)]"
              style={{ fontFamily: MONO }}
            >
              Analyse ORACLE
            </span>
            <span className="flex-1 h-px bg-white/[0.05]" />
          </div>
          <p
            className="text-[13.5px] leading-[1.65] text-[color:var(--nafas-surface)]/90 min-h-[5.5em]"
            style={{ fontFamily: DISPLAY, fontWeight: 300 }}
          >
            {streamed}
            {brief && streamed.length < brief.text.length ? (
              <span
                aria-hidden
                className="inline-block w-[6px] h-[1em] align-[-2px] ml-[1px] bg-[color:var(--nafas-accent2)] animate-pulse"
              />
            ) : null}
          </p>
        </div>

        {/* footer */}
        <div className="px-5 py-3 border-t border-white/[0.05] flex items-center justify-between">
          <span
            className="text-[10px] tracking-[0.2em] uppercase text-[color:var(--nafas-ink3)]/60"
            style={{ fontFamily: MONO }}
          >
            HealiX · Moniteur
          </span>
          {selected.sourceUrl ? (
            <a
              href={selected.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[11px] text-[color:var(--nafas-ink3)] hover:text-[color:var(--nafas-surface)] transition-colors"
              style={{ fontFamily: MONO }}
            >
              Source
              <ExternalLink className="size-3" strokeWidth={1.6} />
            </a>
          ) : (
            <span
              className="text-[10px] tracking-[0.18em] uppercase text-[color:var(--nafas-ink3)]/40"
              style={{ fontFamily: MONO }}
            >
              ESC pour fermer
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
