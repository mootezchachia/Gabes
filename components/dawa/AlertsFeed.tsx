"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { AlertItem, AlertKind } from "@/lib/dawa/types";

type Filter = "tous" | AlertKind;

const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: "tous", label: "Tous" },
  { key: "air", label: "Air" },
  { key: "eau", label: "Eau" },
  { key: "trajet", label: "Trajet" },
  { key: "officiel", label: "Officiel" },
];

function severityDot(sev: AlertItem["severity"]): string {
  if (sev === "critical") return "var(--nafas-danger)";
  if (sev === "warning") return "var(--nafas-amber)";
  return "var(--nafas-accent2)";
}

function relativeFr(iso: string): string {
  const d = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - d);
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "à l’instant";
  if (mins < 60) return `il y a ${mins} min`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `il y a ${h} h`;
  const days = Math.floor(h / 24);
  return `il y a ${days} j`;
}

export function AlertsFeed({
  alerts,
  initialCount = 12,
  fullScreen = false,
}: {
  alerts: AlertItem[];
  initialCount?: number;
  fullScreen?: boolean;
}) {
  const [filter, setFilter] = useState<Filter>("tous");
  const [visible, setVisible] = useState<number>(initialCount);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const filtered = useMemo(() => {
    if (filter === "tous") return alerts;
    return alerts.filter((a) => a.kind === filter);
  }, [alerts, filter]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible((v) => Math.min(v + 10, filtered.length));
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [filtered.length]);

  return (
    <section
      className={
        "px-4 pb-6 " +
        (fullScreen ? "pt-3" : "pt-2") +
        " overflow-y-auto overscroll-y-contain"
      }
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      <div className="flex items-center justify-between mb-2">
        <h2
          className="text-[11px] tracking-[0.22em] uppercase text-[color:var(--nafas-ink3)]"
          style={{ fontFamily: "var(--font-jetbrains), monospace" }}
        >
          Alertes
        </h2>
        <span
          className="text-[10px] tabular-nums text-[color:var(--nafas-ink3)]"
          style={{ fontFamily: "var(--font-jetbrains), monospace" }}
        >
          {filtered.length}
        </span>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-2 -mx-1 px-1 no-scrollbar">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button
              type="button"
              key={f.key}
              onClick={() => {
                setFilter(f.key);
                setVisible(initialCount);
              }}
              className={
                "shrink-0 inline-flex items-center h-7 px-3 rounded-full border text-[11.5px] transition-colors " +
                (active
                  ? "bg-[color:var(--nafas-accent2)]/10 border-[color:var(--nafas-accent2)]/40 text-[color:var(--nafas-accent2)]"
                  : "border-white/[0.08] text-[color:var(--nafas-ink3)] hover:text-[color:var(--nafas-surface)]")
              }
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="text-[13px] text-[color:var(--nafas-ink3)] py-8 text-center">
          Rien à signaler. L’air est calme.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.slice(0, visible).map((a) => (
            <li
              key={a.id}
              className="h-[88px] flex items-center gap-3 px-3 rounded-lg border border-white/[0.06] bg-[color:var(--nafas-bg2)]/60 hover:bg-[color:var(--nafas-bg2)] transition-colors"
            >
              <div
                aria-hidden
                className="size-2.5 rounded-full shrink-0"
                style={{
                  background: severityDot(a.severity),
                  boxShadow: `0 0 10px 0 ${severityDot(a.severity)}`,
                }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[13.5px] font-medium text-[color:var(--nafas-surface)]">
                    {a.title}
                  </span>
                  <span
                    className="shrink-0 text-[10px] tabular-nums text-[color:var(--nafas-ink3)]"
                    style={{ fontFamily: "var(--font-jetbrains), monospace" }}
                  >
                    {relativeFr(a.at)}
                  </span>
                </div>
                <p className="mt-1 text-[12px] leading-[1.4] text-[color:var(--nafas-ink3)] line-clamp-2">
                  {a.body}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className="text-[9.5px] tracking-[0.22em] uppercase text-[color:var(--nafas-ink3)]"
                    style={{
                      fontFamily: "var(--font-jetbrains), monospace",
                    }}
                  >
                    {a.kind}
                  </span>
                  {a.href ? (
                    <a
                      href={a.href}
                      className="text-[10.5px] text-[color:var(--nafas-accent2)] hover:underline"
                    >
                      En savoir plus →
                    </a>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div ref={sentinelRef} className="h-6" />
      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  );
}
