"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { useFakeStream } from "@/lib/monitor/useFakeStream";

type Brief = {
  id: string;
  text: string;
  tags?: string[];
};

type BriefScriptsFile = {
  briefs: Brief[];
};

const FALLBACK_BRIEFS: Brief[] = [
  {
    id: "fallback-0",
    text:
      "Plume SO₂ toujours active au-dessus de Chatt Essalam. Les capteurs de Ghannouch enregistrent 340 µg/m³ — huit fois le seuil OMS. Vent de sud-est, 14 km/h : la contamination dérive vers les quartiers résidentiels nord.",
    tags: ["SO₂", "Ghannouch"],
  },
];

function formatRelative(ms: number): string {
  const s = Math.max(1, Math.floor(ms / 1000));
  if (s < 60) return `il y a ${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  return `il y a ${h} h`;
}

export function BriefAI() {
  const [briefs, setBriefs] = useState<Brief[]>(FALLBACK_BRIEFS);
  const [index, setIndex] = useState(0);
  const [rotatedAt, setRotatedAt] = useState<number>(() => Date.now());
  const [now, setNow] = useState<number>(() => Date.now());

  // Fetch scripts once, fall back gracefully if absent.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/data/brief-scripts.json", { cache: "no-store" });
        if (!r.ok) return;
        const data = (await r.json()) as BriefScriptsFile;
        if (cancelled || !data?.briefs?.length) return;
        setBriefs(data.briefs);
        setIndex(Math.floor(Math.random() * data.briefs.length));
        setRotatedAt(Date.now());
      } catch {
        /* keep fallback */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Rotate every 90 s.
  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => {
        if (briefs.length <= 1) return 0;
        let next = i;
        while (next === i) next = Math.floor(Math.random() * briefs.length);
        return next;
      });
      setRotatedAt(Date.now());
    }, 90_000);
    return () => clearInterval(id);
  }, [briefs.length]);

  // "il y a N s" ticker
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const brief = briefs[index] ?? FALLBACK_BRIEFS[0];
  const streamed = useFakeStream(brief.text, 42);
  const isStreaming = streamed.length < brief.text.length;

  const relative = useMemo(() => formatRelative(now - rotatedAt), [now, rotatedAt]);

  return (
    <div className="group relative flex flex-col gap-3 overflow-hidden rounded-xl border border-white/10 bg-black/30 p-4">
      {/* faint scanline gradient top */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[color:var(--nafas-accent2)]/40 to-transparent"
      />

      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative inline-flex size-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[color:var(--nafas-accent2)] opacity-70" />
            <span className="relative inline-flex size-1.5 rounded-full bg-[color:var(--nafas-accent2)]" />
          </span>
          <span className="font-[family-name:var(--font-jetbrains)] text-[10.5px] uppercase tracking-[0.22em] text-[color:var(--nafas-surface)]/90">
            Brief AI
          </span>
          <span className="font-[family-name:var(--font-jetbrains)] text-[10.5px] uppercase tracking-[0.22em] text-[color:var(--nafas-ink3)]">
            · Live
          </span>
        </div>
        <span className="font-[family-name:var(--font-jetbrains)] text-[10px] text-[color:var(--nafas-ink3)]">
          {relative}
        </span>
      </div>

      {/* Body — literary serif, fake streamed */}
      <p className="font-[family-name:var(--font-fraunces)] text-[15px] italic leading-[1.55] text-[color:var(--nafas-surface)]/95">
        {streamed}
        {isStreaming && (
          <span
            aria-hidden
            className="ml-[1px] inline-block h-[1em] w-[2px] -translate-y-[-0.1em] animate-pulse bg-[color:var(--nafas-accent2)] align-middle"
          />
        )}
      </p>

      {/* Tags */}
      {brief.tags && brief.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {brief.tags.map((t) => (
            <span
              key={t}
              className="rounded-sm border border-white/10 bg-white/[0.03] px-1.5 py-[2px] font-[family-name:var(--font-jetbrains)] text-[9.5px] uppercase tracking-[0.18em] text-[color:var(--nafas-ink3)]"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Actions row */}
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          className="group/src inline-flex cursor-pointer items-center gap-1 font-[family-name:var(--font-jetbrains)] text-[10px] uppercase tracking-[0.2em] text-[color:var(--nafas-ink3)] transition-colors hover:text-[color:var(--nafas-surface)]"
        >
          Sources
          <ArrowUpRight
            className="size-3 transition-transform group-hover/src:translate-x-[1px] group-hover/src:-translate-y-[1px]"
            strokeWidth={2}
          />
        </button>
        <button
          type="button"
          disabled
          title="Disponible dans la v2"
          aria-label="Demander à ORACLE (désactivé, v2)"
          className="inline-flex cursor-not-allowed items-center gap-1 rounded-sm border border-white/10 bg-white/[0.02] px-2 py-1 font-[family-name:var(--font-jetbrains)] text-[10px] uppercase tracking-[0.2em] text-[color:var(--nafas-ink3)]/70"
        >
          <Sparkles className="size-3" strokeWidth={2} />
          Demander à ORACLE
          <ArrowUpRight className="size-3" strokeWidth={2} />
        </button>
      </div>

      {/* Honesty label */}
      <div className="font-[family-name:var(--font-fraunces)] text-[9px] italic text-[color:var(--nafas-ink3)]/60">
        · réponse scénarisée
      </div>
    </div>
  );
}
