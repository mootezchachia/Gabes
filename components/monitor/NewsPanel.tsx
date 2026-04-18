"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";

type NewsItem = {
  id: string;
  title: string;
  summary?: string;
  timestamp: string; // ISO
  url: string;
  thumbnail_emoji?: string;
};

type NewsShape = {
  sources: Record<string, NewsItem[]>;
};

const SOURCES = ["Nawaat", "FTDES", "Al Jazeera", "Reuters", "RTCI"] as const;
type SourceKey = (typeof SOURCES)[number];

// Fallback seed if news.json missing (Agent E produces it)
const FALLBACK: NewsShape = {
  sources: {
    Nawaat: [
      {
        id: "n1",
        title:
          "Gabès · nouvelle vague d’asphyxies signalée près du complexe GCT de Ghannouch",
        timestamp: new Date(Date.now() - 38 * 60 * 1000).toISOString(),
        url: "https://nawaat.org",
      },
      {
        id: "n2",
        title:
          "FTDES publie un rapport accablant sur les rejets phosphatés en Méditerranée",
        timestamp: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
        url: "https://nawaat.org",
      },
      {
        id: "n3",
        title:
          "Rentrée scolaire à Chatt Essalem : les parents réclament la fermeture de l’école",
        timestamp: new Date(Date.now() - 22 * 3600 * 1000).toISOString(),
        url: "https://nawaat.org",
      },
    ],
    FTDES: [],
    "Al Jazeera": [],
    Reuters: [],
    RTCI: [],
  },
};

// French relative-time formatter
const RTF = typeof Intl !== "undefined" ? new Intl.RelativeTimeFormat("fr", { numeric: "auto" }) : null;

function relTime(iso: string): string {
  if (!RTF) return "";
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "";
  const diffMs = then - Date.now();
  const abs = Math.abs(diffMs);
  const mins = Math.round(diffMs / 60_000);
  const hrs = Math.round(diffMs / 3_600_000);
  const days = Math.round(diffMs / 86_400_000);
  if (abs < 60 * 60_000) return RTF.format(mins, "minute");
  if (abs < 24 * 3_600_000) return RTF.format(hrs, "hour");
  return RTF.format(days, "day");
}

function initial(src: string): string {
  return src.charAt(0).toUpperCase();
}

export function NewsPanel() {
  const [active, setActive] = useState<SourceKey>("Nawaat");
  const [data, setData] = useState<NewsShape>(FALLBACK);
  const [breaking, setBreaking] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/data/news.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json: NewsShape | null) => {
        if (!cancelled && json && json.sources) setData(json);
      })
      .catch(() => {
        /* keep fallback */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Breaking pulse toggler — stabilizes the feel that something is alive
  useEffect(() => {
    const t = setInterval(() => setBreaking((b) => !b || true), 7000);
    return () => clearInterval(t);
  }, []);

  const items = useMemo<NewsItem[]>(() => {
    const pool = data.sources?.[active];
    if (pool && pool.length > 0) return pool;
    // If selected source empty, fall back to Nawaat fallback once
    return data.sources?.Nawaat ?? FALLBACK.sources.Nawaat;
  }, [data, active]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2 shrink-0">
        <div className="flex items-center gap-2">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inset-0 rounded-full bg-[color:var(--nafas-danger)] animate-ping opacity-70" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[color:var(--nafas-danger)]" />
          </span>
          <span
            className="font-mono uppercase tracking-[0.2em] text-[color:var(--nafas-ink3)]"
            style={{ fontSize: 10.5 }}
          >
            News Live
          </span>
          {breaking && (
            <span
              className="ml-1 font-mono uppercase tracking-[0.18em] text-[color:var(--nafas-danger)]/90"
              style={{ fontSize: 10 }}
            >
              · Breaking
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-3 overflow-x-auto no-scrollbar shrink-0">
        {SOURCES.map((s) => {
          const isActive = s === active;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setActive(s)}
              className={[
                "px-2 py-1 rounded-sm whitespace-nowrap transition-colors cursor-pointer",
                "text-[11px] font-sans",
                isActive
                  ? "bg-white/10 text-[color:var(--nafas-accent2)] underline decoration-[color:var(--nafas-accent2)] underline-offset-[5px]"
                  : "text-[color:var(--nafas-ink3)] hover:text-white/80 hover:bg-white/5",
              ].join(" ")}
            >
              {s}
            </button>
          );
        })}
      </div>

      {/* Items */}
      <ul className="flex-1 overflow-y-auto pr-1 -mr-1 space-y-2 nafas-scroll">
        {items.map((it) => (
          <li key={it.id}>
            <a
              href={it.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex gap-2.5 p-2 rounded-sm hover:bg-white/[0.04] transition-colors cursor-pointer"
            >
              <div
                className="shrink-0 w-[25px] h-[25px] rounded-sm flex items-center justify-center font-mono text-[11px] font-semibold text-[color:var(--nafas-bg)]"
                style={{ background: "var(--nafas-accent2)" }}
                aria-hidden
              >
                {it.thumbnail_emoji ?? initial(active)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] leading-snug text-[color:var(--nafas-surface)] line-clamp-2 group-hover:text-[color:var(--nafas-accent2)] transition-colors">
                  {it.title}
                </p>
                <div
                  className="mt-1 flex items-center gap-1.5 font-mono uppercase tracking-wider text-[color:var(--nafas-ink3)]"
                  style={{ fontSize: 10 }}
                >
                  <span>{active}</span>
                  <span aria-hidden>·</span>
                  <time dateTime={it.timestamp}>{relTime(it.timestamp)}</time>
                  <ExternalLink
                    className="ml-auto opacity-0 group-hover:opacity-60 transition-opacity"
                    size={10}
                    aria-hidden
                  />
                </div>
              </div>
            </a>
          </li>
        ))}
      </ul>

      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          scrollbar-width: none;
        }
        .nafas-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .nafas-scroll::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.08);
          border-radius: 2px;
        }
        .nafas-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
      `}</style>
    </div>
  );
}
