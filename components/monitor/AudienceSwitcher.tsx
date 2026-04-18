"use client";

import { useEffect } from "react";
import { User, Stethoscope, Factory, Ruler, Landmark } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMonitor } from "@/lib/monitor/store";

type AudienceKey = "habitant" | "medecin" | "gct" | "architecte" | "municipalite";

interface AudienceDef {
  key: AudienceKey;
  label: string;
  ar: string;
  icon: LucideIcon;
  accent: string;
  hotkey: string;
}

const AUDIENCES: AudienceDef[] = [
  { key: "habitant", label: "Habitant", ar: "مواطن", icon: User, accent: "var(--nafas-accent2)", hotkey: "1" },
  { key: "medecin", label: "Médecin", ar: "طبيب", icon: Stethoscope, accent: "var(--nafas-blue)", hotkey: "2" },
  { key: "gct", label: "Industrie", ar: "مجمّع", icon: Factory, accent: "var(--nafas-amber)", hotkey: "3" },
  { key: "architecte", label: "Architecte", ar: "معمار", icon: Ruler, accent: "var(--nafas-cyan)", hotkey: "4" },
  { key: "municipalite", label: "Gouvernorat", ar: "بلديّة", icon: Landmark, accent: "var(--nafas-accent)", hotkey: "5" },
];

/**
 * Segmented audience strip. Architectural rectangle (not pills) — nests
 * visually under the top bar. Active tab gets a bottom accent bar and a
 * faint color wash. Arabic sub-label only appears under the active tab.
 */
export function AudienceSwitcher() {
  const audience = useMonitor((s) => s.audience);
  const setAudience = useMonitor((s) => s.setAudience);
  const introPlayed = useMonitor((s) => s.introPlayed);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const match = AUDIENCES.find((a) => a.hotkey === e.key);
      if (match) {
        e.preventDefault();
        setAudience(match.key);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setAudience]);

  if (!introPlayed) return null;

  return (
    <div
      role="tablist"
      aria-label="Sélection d'audience"
      className="pointer-events-auto absolute top-[72px] left-1/2 -translate-x-1/2 z-30"
    >
      <div className="hud-slab flex items-stretch">
        <div className="flex items-center pl-4 pr-3 py-2.5 border-r border-white/[0.07]">
          <span className="hud-eyebrow">Pour qui</span>
        </div>

        {AUDIENCES.map((a, i) => {
          const active = audience === a.key;
          const Icon = a.icon;
          return (
            <button
              key={a.key}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => setAudience(a.key)}
              className="group relative flex flex-col items-center justify-center gap-0.5 px-4 py-2 min-w-[86px] cursor-pointer transition-colors"
              style={{
                background: active ? `color-mix(in srgb, ${a.accent} 11%, transparent)` : "transparent",
                borderLeft: i === 0 ? "none" : "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <div className="flex items-center gap-1.5">
                <Icon
                  className="size-[13px] transition-colors"
                  strokeWidth={1.7}
                  style={{ color: active ? a.accent : "var(--nafas-ink3)" }}
                />
                <span
                  className="text-[11.5px] tracking-[0.01em] transition-colors"
                  style={{
                    color: active ? "var(--nafas-surface)" : "var(--nafas-ink3)",
                    fontWeight: active ? 500 : 400,
                  }}
                >
                  {a.label}
                </span>
              </div>

              {/* Arabic subscript — only on active tab, small */}
              <span
                aria-hidden
                dir="rtl"
                className="text-[9.5px] font-[family-name:var(--font-fraunces)] italic leading-none transition-opacity"
                style={{
                  color: a.accent,
                  opacity: active ? 0.7 : 0,
                  minHeight: "11px",
                }}
              >
                {a.ar}
              </span>

              {/* hotkey hint */}
              <span
                aria-hidden
                className="absolute top-1 right-1 text-[8.5px] font-[family-name:var(--font-jetbrains)] tracking-wider transition-opacity"
                style={{
                  color: "var(--nafas-ink3)",
                  opacity: active ? 0 : 0.35,
                }}
              >
                {a.hotkey}
              </span>

              {/* active accent bar at bottom */}
              <span
                aria-hidden
                className="absolute left-3 right-3 bottom-0 h-px rounded-full transition-all"
                style={{
                  background: active ? a.accent : "transparent",
                  boxShadow: active ? `0 0 10px 0 ${a.accent}` : "none",
                }}
              />
            </button>
          );
        })}
      </div>

      {/* micro hint */}
      <div className="mt-2 flex items-center justify-center gap-1.5 text-[9.5px] font-[family-name:var(--font-jetbrains)] tracking-[0.22em] uppercase text-[color:var(--nafas-ink3)]/55">
        <span className="size-[3px] rounded-full bg-[color:var(--nafas-ink3)]/40" />
        <span>1 — 5 · changer d&apos;audience</span>
      </div>
    </div>
  );
}
