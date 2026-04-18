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
  { key: "medecin", label: "Médecin", ar: "طبّ", icon: Stethoscope, accent: "var(--nafas-blue)", hotkey: "2" },
  { key: "gct", label: "Industrie", ar: "مجمّع", icon: Factory, accent: "var(--nafas-amber)", hotkey: "3" },
  { key: "architecte", label: "Architecte", ar: "معمار", icon: Ruler, accent: "var(--nafas-cyan)", hotkey: "4" },
  { key: "municipalite", label: "Gouvernorat", ar: "بلديّة", icon: Landmark, accent: "var(--nafas-accent)", hotkey: "5" },
];

const MONO = "var(--font-jetbrains), ui-monospace, monospace";

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
      <div
        className="flex items-center gap-1 rounded-full border border-white/[0.08] bg-[color:var(--nafas-bg)]/70 p-1 shadow-[0_18px_48px_-18px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.02)_inset] backdrop-blur-2xl"
      >
        <span
          style={{ fontFamily: MONO }}
          className="hidden md:inline-block px-3 text-[9.5px] uppercase tracking-[0.24em] text-[color:var(--nafas-ink3)]/70 border-r border-white/10 mr-1 py-1"
        >
          Pour qui ?
        </span>
        {AUDIENCES.map((a) => {
          const active = audience === a.key;
          const Icon = a.icon;
          return (
            <button
              key={a.key}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => setAudience(a.key)}
              className="group relative flex items-center gap-2 px-3 py-1.5 rounded-full transition-all cursor-pointer"
              style={{
                background: active
                  ? `color-mix(in srgb, ${a.accent} 16%, transparent)`
                  : "transparent",
                boxShadow: active
                  ? `inset 0 0 0 1px color-mix(in srgb, ${a.accent} 45%, transparent)`
                  : "inset 0 0 0 1px transparent",
              }}
            >
              <Icon
                className="size-[14px] transition-colors"
                strokeWidth={1.6}
                style={{
                  color: active ? a.accent : "var(--nafas-ink3)",
                }}
              />
              <span
                className="text-[12px] tracking-[0.01em] transition-colors hidden sm:inline-block"
                style={{
                  color: active ? "var(--nafas-surface)" : "var(--nafas-ink3)",
                  fontWeight: active ? 500 : 400,
                }}
              >
                {a.label}
              </span>
              <span
                aria-hidden
                dir="rtl"
                className="text-[11px] font-[family-name:var(--font-fraunces)] italic transition-opacity"
                style={{
                  color: active ? a.accent : "var(--nafas-ink3)",
                  opacity: active ? 0.9 : 0.5,
                }}
              >
                {a.ar}
              </span>
              {active ? (
                <span
                  aria-hidden
                  className="ml-0.5 size-1 rounded-full animate-pulse"
                  style={{ background: a.accent }}
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
